# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional, List
from llm import ask_llm
from flights_data import search_flights
from hotels_data import search_hotels
from trains_data import search_trains
from weather_data import get_weather_for_trip
from email_service import send_booking_email
import database
import os, json, requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Smart Travel Booking Agent")

# Allow React frontend to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# ── Models ──────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    debug: bool = False

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    source: Optional[str] = None
    intent: Optional[str] = None
    qwen_json: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    stage: Optional[str] = None

class FlightRequest(BaseModel):
    from_city: str
    to_city: str
    date: str

class TrainRequest(BaseModel):
    from_city: str
    to_city: str
    date: str

class HotelRequest(BaseModel):
    city: str
    check_in_date: str
    check_out_date: str
    adults: int = 1
    amenities: Optional[str] = None

class ItineraryRequest(BaseModel):
    from_city: str
    to_city: str
    start_date: str
    end_date: str
    travelers: int = 1
    budget: Optional[int] = None
    interests: Optional[List[str]] = []
    transport_mode: Optional[str] = "flight"
    hotel_type: Optional[str] = "AC"

class WeatherRequest(BaseModel):
    city: str
    start_date: str
    end_date: str

class BookingConfirmRequest(BaseModel):
    user_email: str
    from_city: str
    to_city: str
    start_date: str
    end_date: str
    travelers: int = 1
    hotel: Optional[str] = None
    itinerary: Optional[List[Any]] = []
    budget: Optional[int] = None

# ── Routes ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Smart Travel Booking Agent is running 🚀"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    session_id = database.get_or_create_session(request.session_id)
    result = ask_llm(request.message, debug=request.debug, session_id=session_id)
    
    # Fetch the latest stage from the database after LLM processes the message
    trip_ctx = database.get_trip_context(session_id)
    current_stage = trip_ctx.get("booking_stage", "IDLE")

    if isinstance(result, dict):
        result["session_id"] = session_id
        result["stage"] = current_stage
        return ChatResponse(**result)
    return ChatResponse(reply=result, session_id=session_id, stage=current_stage)

@app.post("/flights")
def get_flights(request: FlightRequest):
    results = search_flights(request.from_city, request.to_city, request.date)
    if not results:
        return {"message": "No flights found", "flights": []}
    return {"message": f"{len(results)} flight(s) found", "flights": results}

@app.post("/hotels")
def get_hotels(request: HotelRequest):
    results = search_hotels(request.city, request.check_in_date, request.check_out_date,
                            adults=request.adults, amenities=request.amenities)
    if isinstance(results, dict):
        return []   # error or no results
    return results

@app.post("/trains")
def get_trains(request: TrainRequest):
    results = search_trains(request.from_city, request.to_city, request.date)
    if isinstance(results, dict):
        # It's an error dict
        return {"message": results.get("error", "No trains found"), "trains": []}
    return {"message": f"{len(results)} train(s) found", "trains": results}

@app.post("/itinerary")
def generate_itinerary(request: ItineraryRequest):
    from datetime import datetime
    try:
        start = datetime.strptime(request.start_date, "%Y-%m-%d")
        end = datetime.strptime(request.end_date, "%Y-%m-%d")
        num_days = max((end - start).days + 1, 1)
    except Exception:
        num_days = 3

    interests_str = ", ".join(request.interests) if request.interests else "general sightseeing"
    budget_str = f"₹{request.budget} total for all {request.travelers} traveler(s)" if request.budget else "flexible budget"

    prompt = f"""You are an expert travel planner. Generate a detailed {num_days}-day itinerary.

Trip: {request.from_city} → {request.to_city} | {request.start_date} to {request.end_date}
Travelers: {request.travelers} | Budget: {budget_str} | Interests: {interests_str}
Transport: {request.transport_mode} | Hotel: {request.hotel_type}

RULES:
- Each day MUST have exactly 3 schedule slots: Morning (~9AM), Afternoon (~1PM), Evening (~6PM)
- place_image_query MUST be a specific famous landmark visited that day + city name
  e.g. "Charminar Hyderabad" NOT "Hyderabad travel". NEVER repeat a query across days.
- budget_split percentages MUST sum to exactly 100. No exceptions.
- Flight transport → Transport 30-40%. Train/bus → Transport 10-20%.
- Luxury hotel → Hotels 35-40%. AC → Hotels 20-28%. Non-AC → Hotels 12-18%.
- Remainder split between Food (higher) and Activities (lower).

Return ONLY valid JSON, no markdown fences, no explanation:
{{
  "itinerary": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Short evocative title (max 5 words)",
      "description": "One vivid sentence describing today's theme",
      "highlight": "🏰 Best moment of the day in one phrase",
      "local_tip": "One insider tip locals know",
      "schedule": [
        {{
          "time": "Morning (9:00 AM)",
          "activity": "Visit [Specific Place Name] — [why it's special, what to do there]",
          "tip": "Practical tip for this activity"
        }},
        {{
          "time": "Afternoon (1:00 PM)",
          "activity": "...",
          "tip": "..."
        }},
        {{
          "time": "Evening (6:00 PM)",
          "activity": "...",
          "tip": "..."
        }}
      ],
      "place_image_query": "Famous landmark name + city e.g. Gateway of India Mumbai",
      "estimated_cost": "₹XXXX per person"
    }}
  ],
  "budget_split": {{
    "Transport": <integer>,
    "Hotels": <integer>,
    "Food": <integer>,
    "Activities": <integer>
  }}
}}"""

    itinerary = []
    budget_split = {}
    try:
        response = requests.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": [{"role": "user", "content": prompt}], "temperature": 0.7, "max_tokens": 3000},
            timeout=30,
        )
        raw = response.json()["choices"][0]["message"]["content"].strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        raw = raw.strip()
        parsed = json.loads(raw)
        itinerary = parsed.get("itinerary", [])
        budget_split = parsed.get("budget_split", {})
        
        if budget_split:
            total_split = sum(budget_split.values())
            if total_split > 0:
                normalized_split = {k: round((v / total_split) * 100) for k, v in budget_split.items()}
                diff = 100 - sum(normalized_split.values())
                if diff != 0:
                    largest_key = max(normalized_split, key=normalized_split.get)
                    normalized_split[largest_key] += diff
                budget_split = normalized_split

    except Exception as e:
        print("Itinerary error:", e)

    flights = []
    try:
        flights = search_flights(request.from_city, request.to_city, request.start_date, adults=request.travelers)
        if isinstance(flights, dict): flights = []
    except Exception:
        flights = []

    return {"itinerary": itinerary, "flights": flights, "budget_split": budget_split,
            "meta": {"from": request.from_city, "to": request.to_city, "days": num_days,
                     "travelers": request.travelers, "start_date": request.start_date,
                     "end_date": request.end_date, "transport": request.transport_mode, "hotel": request.hotel_type}}
class TransportDataRequest(BaseModel):
    from_city: str
    to_city: str
    start_date: str
    end_date: str
    travelers: int = 1
    hotel_type: Optional[str] = "AC"  # AC | Non-AC | Luxury

@app.post("/transport-data")
def get_transport_data(request: TransportDataRequest):
    """
    Returns both live flights and hotels for a trip.
    Called by the Transportation page using the same params entered on Dashboard.
    """
    # Flights (one-way on departure date)
    flights = []
    try:
        flights = search_flights(request.from_city, request.to_city, request.start_date, adults=request.travelers)
        if isinstance(flights, dict): flights = []
    except Exception as e:
        print("Flights error:", e)

    # Hotels (full stay duration)
    hotels = []
    try:
        amenity_map = {"Luxury": "5 star luxury", "AC": "air conditioned", "Non-AC": ""}
        amenity = amenity_map.get(request.hotel_type, "")
        result = search_hotels(request.to_city, request.start_date, request.end_date,
                               adults=request.travelers, amenities=amenity or None)
        if isinstance(result, list):
            hotels = result
    except Exception as e:
        print("Hotels error:", e)

    return {
        "flights": flights,
        "hotels": hotels,
        "meta": {
            "from": request.from_city, "to": request.to_city,
            "start_date": request.start_date, "end_date": request.end_date,
            "travelers": request.travelers
        }
    }

@app.post("/weather")
def get_weather(request: WeatherRequest):
    """
    Returns current real-time weather (Zomato Weather Union)
    + trip date forecast (Open-Meteo, no API key needed).
    Interview Crux: Two-source hybrid — real sensor data for now,
    Open-Meteo WMO forecast for the trip dates. Both free.
    """
    return get_weather_for_trip(request.city, request.start_date, request.end_date)

@app.post("/confirm-booking")
def confirm_booking(request: BookingConfirmRequest):
    """
    Mock booking confirmation endpoint.
    1. Generates a realistic PNR reference number
    2. Fetches weather forecast for the destination
    3. Sends a rich HTML email with PDF itinerary via Resend
    4. Returns the Google Calendar pre-filled URL

    Interview Crux: The 'booking' is intentionally mocked (no real payment
    gateway) because airline/hotel APIs require enterprise partnerships.
    This demonstrates the full Agentic workflow up to the point of execution.
    In production, step 1 would call a Razorpay/Stripe payment API, and
    step 3 would call the airline booking API with the payment token.
    """
    import uuid, urllib.parse

    # Generate a realistic-looking booking reference
    pnr = f"VYG-{uuid.uuid4().hex[:6].upper()}"

    booking = {
        "pnr":        pnr,
        "from_city":  request.from_city,
        "to_city":    request.to_city,
        "start_date": request.start_date,
        "end_date":   request.end_date,
        "travelers":  request.travelers,
        "hotel":      request.hotel or "",
    }

    # Fetch weather for the destination and trip dates
    weather = get_weather_for_trip(request.to_city, request.start_date, request.end_date)

    # Send confirmation email with PDF itinerary
    email_result = send_booking_email(
        user_email=request.user_email,
        booking=booking,
        itinerary=request.itinerary or [],
        weather=weather,
    )

    # Build Google Calendar pre-filled URL
    cal_start = request.start_date.replace("-", "")
    cal_end   = request.end_date.replace("-", "")
    cal_title = f"✈️ Trip to {request.to_city} — {pnr}"
    calendar_url = (
        f"https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text={urllib.parse.quote(cal_title)}"
        f"&dates={cal_start}/{cal_end}"
        f"&details={urllib.parse.quote('Booked via Voyager AI. Have a great trip!')}"
        f"&location={urllib.parse.quote(request.to_city + ', India')}"
    )

    return {
        "status":       "confirmed",
        "pnr":          pnr,
        "email_status": email_result.get("status", "failed"),
        "calendar_url": calendar_url,
        "weather":      weather,
    }
