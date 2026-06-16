import json
import os
import re
from datetime import datetime, timedelta
import concurrent.futures

import requests
from dotenv import load_dotenv

from flights_data import search_flights
from hotels_data import search_hotels
import database

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_TOOL_CALLS = 2
LLM_CACHE = {}

KNOWN_CITIES = sorted(
    ["Chennai", "Goa", "Mumbai", "Delhi", "Bangalore", "Hyderabad",
     "Kolkata", "Jaipur", "Pune", "Kochi", "Manali", "Shimla",
     "Udaipur", "Varanasi", "Agra", "Lucknow", "Ahmedabad",
     "Chandigarh", "Rishikesh", "Ooty", "Darjeeling", "Mysore"],
    key=len,
    reverse=True,
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "search_flights",
            "description": "Search flights from one city to another on a specific date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_city": {"type": "string"},
                    "to_city": {"type": "string"},
                    "date": {"type": "string"},
                    "adults": {"type": "integer", "description": "Number of passengers. Default is 1."},
                    "return_date": {"type": "string", "description": "Optional. Return date for round-trip."}
                },
                "required": ["from_city", "to_city", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_hotels",
            "description": "Search hotels in a city under a maximum nightly budget.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "check_in_date": {"type": "string"},
                    "check_out_date": {"type": "string"},
                    "adults": {"type": "integer", "description": "Number of guests. Default is 1."},
                    "max_price": {"type": "integer", "description": "Maximum price per night. Optional."},
                    "amenities": {"type": "string", "description": "Preferences like 'pool, AC, 5-star'. Optional."}
                },
                "required": ["city", "check_in_date", "check_out_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_trip_context",
            "description": "Save known trip details like destination, origin, date, or budget. Call this when you learn new info about the trip.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string"},
                    "destination": {"type": "string"},
                    "travel_date": {"type": "string"},
                    "budget": {"type": "integer"},
                    "adults": {"type": "integer"},
                    "return_date": {"type": "string"},
                    "check_out_date": {"type": "string"},
                    "amenities": {"type": "string"}
                }
            }
        }
    }
]

STAGE_INSTRUCTIONS = {
    "IDLE": "The user hasn't started planning yet. Help them explore. Ask where they want to go, when, and how many people.",
    "SEARCHING": "The user has given trip details. Search for flights/hotels using tools. Do NOT ask for confirmation yet.",
    "RESULTS_SHOWN": "Search results were already shown. Ask which option the user prefers. Do NOT search again unless user explicitly asks for new options.",
    "AWAITING_CONFIRMATION": "The user picked an option. Show a clear summary with flight/hotel name, price, and dates. Ask: 'Shall I confirm this booking?'",
    "CONFIRMED": "The user said yes to booking. Ask for their full name and email address to finalize.",
    "BOOKED": "Booking is complete. Show the confirmation details. Do not search again unless the user explicitly starts a new trip."
}

SYSTEM_PROMPT_TEMPLATE = """
You are an intelligent travel planning agent that uses tools to answer user queries.

Available tools:
1. search_flights(from_city, to_city, date, adults, return_date)
   Searches real flights via Google Flights.

2. search_hotels(city, check_in_date, check_out_date, adults, max_price, amenities)
   Searches real hotels via Google Hotels.

3. update_trip_context(origin, destination, travel_date, budget, adults, return_date, check_out_date, amenities)
   Updates the memory of the current trip. Always call this if the user mentions new locations, budgets, or passenger counts.

CURRENT BOOKING STAGE: {booking_stage}
STAGE INSTRUCTION: {stage_instruction}

Current Known Trip Details:
{trip_context}

Rules:
- You MUST follow the STAGE INSTRUCTION above.
- Use tools for real flight or hotel availability.
- Do not invent flight or hotel prices.
- If a user asks for both flights and hotels, call both tools.
- If required details are missing, ask for the missing city, date, or budget.
- For general travel questions, answer naturally and briefly.
- Keep responses clear and structured.
- If the user wants to start a completely new trip, reset context.
"""


def ask_llm(user_message: str, debug: bool = False, session_id: str = None):
    text = user_message.strip()

    # Save user message to history
    if session_id:
        database.save_message(session_id, "user", text)

    def _response(reply: str, source: str, intent: str = None, qwen_json: dict = None, error: str = None):
        if session_id and not error:
            database.save_message(session_id, "assistant", reply)
        if not debug:
            return reply
        return {
            "reply": reply,
            "source": source,
            "intent": intent,
            "qwen_json": qwen_json,
            "error": error,
        }

    def _clean_city(s: str) -> str:
        return s.strip().strip(".,")

    def _format_flights(results, from_city: str, to_city: str, date: str) -> str:
        if not results:
            return f"No flights found from {from_city} to {to_city} on {date}."
        if isinstance(results, dict) and "error" in results:
            return f"Flight search error: {results['error']}"

        lines = [f"Found {len(results)} flight(s) from {from_city} to {to_city} on {date}:"]
        for flight in results:
            layovers = flight.get('layovers', 0)
            layover_info = f" ({layovers} layover{'s' if layovers != 1 else ''})" if layovers else " (direct)"
            lines.append(
                f"- {flight['flight_number']} dep {flight['departure_time']} "
                f"arr {flight['arrival_time']} price Rs.{flight['price']}"
                f"{layover_info}"
            )
        return "\n".join(lines)

    def _format_hotels(hotels, city: str, max_price: int = None) -> str:
        if not hotels:
            budget_str = f" under Rs.{max_price}" if max_price else ""
            return f"No hotels found in {city}{budget_str}."
        if isinstance(hotels, dict) and ("error" in hotels or "message" in hotels):
            return hotels.get("error") or hotels.get("message", "No hotels found.")

        budget_str = f" under Rs.{max_price}" if max_price else ""
        lines = [f"Found {len(hotels)} hotel(s) in {city}{budget_str}:"]
        for hotel in hotels:
            lines.append(f"- {hotel['name']} Rs.{hotel['price_per_night']} rating {hotel['rating']}")
        return "\n".join(lines)

    def _extract_date(value: str):
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", value)
        if date_match:
            return date_match.group(1)
        if re.search(r"\btomorrow\b", value, re.I):
            return (datetime.now().date() + timedelta(days=1)).isoformat()
        if re.search(r"\btoday\b", value, re.I):
            return datetime.now().date().isoformat()
        return None

    def _extract_budget(value: str):
        budget_match = re.search(
            r"(?:under|below|less than|within|budget(?: of)?|max(?:imum)?|upto|up to|around)\s*(?:rs\.?|inr|₹)?\s*(\d{3,7})|(?:rs\.?|inr|₹)\s*(\d{3,7})",
            value,
            re.I,
        )
        if not budget_match:
            return None
        amount = next((group for group in budget_match.groups() if group), None)
        return int(amount) if amount else None

    def _known_city_mentions(value: str):
        mentions = []
        for city in KNOWN_CITIES:
            for match in re.finditer(rf"\b{re.escape(city)}\b", value, re.I):
                mentions.append((match.start(), city))
        return [city for _, city in sorted(mentions)]

    def _extract_route(value: str):
        cities = _known_city_mentions(value)
        if len(cities) >= 2:
            return cities[0], cities[1]

        route_match = re.search(
            r"(?:from\s+)?([A-Za-z ]+?)\s+(?:to|->|-)\s+([A-Za-z ]+?)(?:\s+on\b|\s+for\b|\s+with\b|\s+and\b|\s+under\b|\s+below\b|$|[?.!,])",
            value,
            re.I,
        )
        if route_match:
            return _clean_city(route_match.group(1)), _clean_city(route_match.group(2))
        return None, None

    def _extract_hotel_city(value: str, fallback_city=None):
        cities = _known_city_mentions(value)
        if cities:
            return cities[-1]

        city_match = re.search(
            r"(?:in|at|near)\s+([A-Za-z ]+?)(?:\s+under\b|\s+below\b|\s+within\b|\s+budget\b|\s+max\b|$|[?.!,])",
            value,
            re.I,
        )
        if city_match:
            return _clean_city(city_match.group(1))
        return fallback_city

    wants_travel = re.search(
        r"\bflight(s)?\b|\bgo\b|\btravel\b|\btransport\b|\btrip\b|\bjourney\b|\bfly\b|\btickets?\b|\bbook\b",
        text,
        re.I,
    )
    wants_hotel = re.search(
        r"\bhotel(s)?\b|\bstay\b|\brooms?\b|\baccommodation\b|\blodging\b|\bresort\b|\bhostel\b|\bbooking\b",
        text,
        re.I,
    )

    # 1. Fetch DB state to use as fallbacks
    trip_ctx = database.get_trip_context(session_id) if session_id else {}

    # Check if this is a follow-up conversation
    is_follow_up = False
    if session_id:
        history_check = database.get_history(session_id, limit=2)
        # If there's more than 1 message (the one we just saved + past ones), it's a follow-up
        if len(history_check) > 1:
            is_follow_up = True

    # 2. Run regex (Only for cold start / first request)
    if not is_follow_up:
        route_from, route_to = _extract_route(text)
        travel_date = _extract_date(text)
        hotel_budget = _extract_budget(text)
        hotel_city = _extract_hotel_city(text, fallback_city=route_to)

        # 3. Save extracted entities to DB state immediately
        if session_id and any([route_from, route_to, travel_date, hotel_budget, hotel_city]):
            database.update_trip_context(
                session_id, 
                origin=route_from, 
                destination=route_to or hotel_city, 
                travel_date=travel_date, 
                budget=hotel_budget
            )

        # 4. Fallback missing details from DB state
        if not route_from: route_from = trip_ctx.get("origin")
        if not route_to: route_to = trip_ctx.get("destination")
        if not travel_date: travel_date = trip_ctx.get("travel_date")
        if not hotel_budget: hotel_budget = trip_ctx.get("budget")
        if not hotel_city: hotel_city = trip_ctx.get("destination")

        if wants_travel and wants_hotel and route_from and route_to and travel_date:
            flights = search_flights(route_from, route_to, travel_date)
            # For rule-based hotel, we need check_in/check_out. Use travel_date as check_in, +1 day as check_out.
            check_in = travel_date
            check_out = (datetime.strptime(travel_date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
            hotels = search_hotels(hotel_city, check_in, check_out, max_price=hotel_budget) if hotel_city else []
            reply = "\n\n".join(
                [
                    _format_flights(flights, route_from, route_to, travel_date),
                    _format_hotels(hotels, hotel_city, hotel_budget),
                ]
            )
            if session_id:
                database.update_booking_stage(session_id, "RESULTS_SHOWN")
            return _response(reply, "rule_based", "flight_and_hotel_search")

        if wants_travel and route_from and route_to and travel_date:
            flights = search_flights(route_from, route_to, travel_date)
            if session_id:
                database.update_booking_stage(session_id, "RESULTS_SHOWN")
            return _response(
                _format_flights(flights, route_from, route_to, travel_date),
                "rule_based",
                "flight_search",
            )

        if wants_hotel and hotel_city:
            check_in = travel_date or datetime.now().date().isoformat()
            check_out = (datetime.strptime(check_in, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
            hotels = search_hotels(hotel_city, check_in, check_out, max_price=hotel_budget)
            if session_id:
                database.update_booking_stage(session_id, "RESULTS_SHOWN")
            return _response(
                _format_hotels(hotels, hotel_city, hotel_budget),
                "rule_based",
                "hotel_search",
            )

    def _run_tool(tool_name: str, args: dict):
        args = dict(args or {})

        if tool_name == "search_flights":
            required = ("from_city", "to_city", "date")
            missing = [field for field in required if not args.get(field)]
            if missing:
                return {"error": f"Missing required flight field(s): {', '.join(missing)}"}

            return search_flights(
                from_city=str(args["from_city"]).strip(),
                to_city=str(args["to_city"]).strip(),
                date=str(args["date"]).strip(),
                adults=int(args.get("adults", 1)),
                return_date=args.get("return_date")
            )

        if tool_name == "search_hotels":
            required = ("city", "check_in_date", "check_out_date")
            missing = [field for field in required if args.get(field) in (None, "")]
            if missing:
                return {"error": f"Missing required hotel field(s): {', '.join(missing)}"}

            max_price = args.get("max_price")
            if max_price is not None:
                try:
                    max_price = int(max_price)
                except (TypeError, ValueError):
                    return {"error": "max_price must be a number"}

            return search_hotels(
                city=str(args["city"]).strip(),
                check_in_date=str(args["check_in_date"]).strip(),
                check_out_date=str(args["check_out_date"]).strip(),
                adults=int(args.get("adults", 1)),
                max_price=max_price,
                amenities=args.get("amenities")
            )
            
        if tool_name == "update_trip_context":
            if session_id:
                return database.update_trip_context(
                    session_id, 
                    origin=args.get("origin"),
                    destination=args.get("destination"),
                    travel_date=args.get("travel_date"),
                    budget=args.get("budget"),
                    adults=args.get("adults"),
                    return_date=args.get("return_date"),
                    check_out_date=args.get("check_out_date"),
                    amenities=args.get("amenities")
                )
            return {"error": "No session ID provided"}

        return {"error": f"Unknown tool: {tool_name}"}

    if not GROQ_API_KEY:
        return "I could not understand that request with the local rules, and Groq is not configured. Add GROQ_API_KEY in .env and restart the server."

    # Fetch DB state again to ensure it's fresh for the system prompt
    current_trip_ctx = database.get_trip_context(session_id) if session_id else {}
    current_stage = current_trip_ctx.get("booking_stage", "IDLE")

    # Check for user confirmation keywords to advance the stage
    lower_text = text.lower()
    if current_stage == "RESULTS_SHOWN":
        if any(word in lower_text for word in ["i like", "i prefer", "go with", "option", "select", "choose", "pick"]):
            current_stage = "AWAITING_CONFIRMATION"
            if session_id:
                database.update_booking_stage(session_id, "AWAITING_CONFIRMATION")
    elif current_stage == "AWAITING_CONFIRMATION":
        if any(word in lower_text for word in ["yes", "confirm", "book it", "proceed", "go ahead", "sure"]):
            current_stage = "CONFIRMED"
            if session_id:
                database.update_booking_stage(session_id, "CONFIRMED")
    elif current_stage == "CONFIRMED":
        # If user provides name/email, move to BOOKED
        if "@" in lower_text or re.search(r"\b[a-zA-Z]{2,}\s+[a-zA-Z]{2,}\b", text):
            current_stage = "BOOKED"
            if session_id:
                database.update_booking_stage(session_id, "BOOKED")

    # Build stage-aware system prompt
    dynamic_system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        booking_stage=current_stage,
        stage_instruction=STAGE_INSTRUCTIONS.get(current_stage, ""),
        trip_context=json.dumps(current_trip_ctx, indent=2)
    )

    messages = [{"role": "system", "content": dynamic_system_prompt}]

    if session_id:
        # Load last 5 messages from history
        history = database.get_history(session_id, limit=5)
        # Add history. Make sure we don't duplicate the user message we just saved.
        # get_history already returns the latest, so the user message is the last one in the list.
        messages.extend(history)
    else:
        messages.append({"role": "user", "content": user_message})

    for _ in range(MAX_TOOL_CALLS):
        try:
            response = requests.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.2,
                    "max_tokens": 700,
                },
                timeout=30,
            )

            if response.status_code == 429:
                retry_after = response.headers.get("retry-after", "a few")
                return f"Groq rate limit reached. Please retry after {retry_after} second(s), or use direct endpoints like /flights."

            if response.status_code >= 400:
                print("Groq API error:", response.status_code, response.text)
                return "Groq could not answer right now. Check your API key, model name, or account limits."

            data = response.json()
            message = data["choices"][0]["message"]
        except Exception as e:
            print("Groq call failed:", e)
            return "An unexpected error occurred while contacting Groq. Please try again later."

        tool_calls = message.get("tool_calls") or []
        if tool_calls:
            messages.append(message)

            def execute_single_tool(tool_call):
                function = tool_call.get("function", {})
                tool_name = function.get("name")
                try:
                    args = json.loads(function.get("arguments") or "{}")
                except json.JSONDecodeError:
                    args = {}

                print(f"\nTOOL CALL -> {tool_name}")
                print(f"ARGS -> {args}")

                try:
                    result = _run_tool(tool_name, args)
                except Exception as e:
                    print("Tool execution failed:", e)
                    result = {"error": "Tool execution failed"}

                print(f"RESULT -> {result}")
                return {
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": tool_name,
                    "content": json.dumps(result),
                }

            with concurrent.futures.ThreadPoolExecutor() as executor:
                tool_messages = list(executor.map(execute_single_tool, tool_calls))
            
            messages.extend(tool_messages)

            # Update stage to RESULTS_SHOWN after any search tool call completes
            if session_id:
                tool_names_called = [tc.get("function", {}).get("name") for tc in tool_calls]
                if "search_flights" in tool_names_called or "search_hotels" in tool_names_called:
                    database.update_booking_stage(session_id, "RESULTS_SHOWN")
        else:
            reply = message.get("content") or "Groq did not return any text. Please try again."
            return _response(reply, "groq", "llm_answer")

    return "I could not finish the request because the model kept asking for more tool calls. Please try a more specific message."
