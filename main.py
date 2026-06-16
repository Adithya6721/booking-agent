# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional, List
from llm import ask_llm
from flights_data import search_flights
from hotels_data import search_hotels
from trains_data import search_trains
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
    transport_mode: Optional[str] = "flight"   # flight | train | bus | car
    hotel_type: Optional[str] = "AC"           # AC | Non-AC | Luxury

# ── Routes ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Smart Travel Booking Agent is running 🚀"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    session_id = database.get_or_create_session(request.session_id)
    result = ask_llm(request.message, debug=request.debug, session_id=session_id)
    if isinstance(result, dict):
        result["session_id"] = session_id
        return ChatResponse(**result)
    return ChatResponse(reply=result, session_id=session_id)

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
        num_days = max((end - start).days, 1)
    except Exception:
        num_days = 3

    interests_str = ", ".join(request.interests) if request.interests else "general sightseeing"
    budget_str = f"₹{request.budget} total for all {request.travelers} traveler(s)" if request.budget else "flexible budget"

    prompt = f"""You are an expert travel planner. Generate a detailed {num_days}-day itinerary.

Trip Details:
- From: {request.from_city} → Destination: {request.to_city}
- Departure: {request.start_date}, Return: {request.end_date} ({num_days} days)
- Travelers: {request.travelers} person(s)
- Total Budget: {budget_str}
- Interests: {interests_str}
- Preferred Transport: {request.transport_mode}
- Hotel Type: {request.hotel_type} rooms

Instructions:
1. Each day must have Morning, Afternoon, and Evening activities with realistic timings.
2. Calculate budget_split percentages intelligently based on transport mode and hotel type:
   - If transport is "flight" → Transport gets a higher percentage (30-40%)
   - If transport is "train" or "bus" → Transport gets less (10-20%)
   - If hotel is "Luxury" → Hotels gets 35-40%, otherwise 20-30%
   - Remaining goes to Food and Activities. All percentages must sum to exactly 100.
3. If budget is provided, also calculate estimated_cost_total (total cost for all travelers).

Return ONLY a valid JSON object (no markdown, no extra text):
{{
  "itinerary": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Catchy day title",
      "description": "One vivid sentence summarising the day experience",
      "schedule": [
        {{"time": "Morning (9:00 AM)", "activity": "Visit [Place] – [what to do and why it's special]"}},
        {{"time": "Afternoon (1:00 PM)", "activity": "Lunch at [restaurant type] followed by [activity]"}},
        {{"time": "Evening (6:00 PM)", "activity": "[Evening activity or dinner spot with atmosphere detail]"}}
      ],
      "place_image_query": "Most iconic landmark visited this day, e.g. 'Red Fort Delhi'",
      "estimated_cost": "₹XXXX per person"
    }}
  ],
  "budget_split": {{
    "Transport": <integer percentage>,
    "Hotels": <integer percentage>,
    "Food": <integer percentage>,
    "Activities": <integer percentage>
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
