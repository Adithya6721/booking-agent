import os
import requests
from dotenv import load_dotenv

load_dotenv()
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

_SESSION = requests.Session()
_SESSION.headers.update({"Connection": "keep-alive"})

# SerpApi Google Flights requires IATA airport codes, NOT city names.
# This lookup table converts city names to their primary airport codes.
CITY_TO_IATA = {
    "chennai": "MAA",
    "goa": "GOI",
    "mumbai": "BOM",
    "delhi": "DEL",
    "bangalore": "BLR",
    "hyderabad": "HYD",
    "kolkata": "CCU",
    "jaipur": "JAI",
    "pune": "PNQ",
    "kochi": "COK",
    "lucknow": "LKO",
    "ahmedabad": "AMD",
    "chandigarh": "IXC",
    "varanasi": "VNS",
    "agra": "AGR",
    "udaipur": "UDR",
    "mangalore": "IXE",
    "coimbatore": "CJB",
    "trivandrum": "TRV",
    "bhubaneswar": "BBI",
    "indore": "IDR",
    "patna": "PAT",
    "srinagar": "SXR",
    "amritsar": "ATQ",
    "ranchi": "IXR",
    "nagpur": "NAG",
    "visakhapatnam": "VTZ",
    "madurai": "IXM",
    "shimla": "SLV",
    "new york": "JFK",
    "london": "LHR",
    "dubai": "DXB",
    "singapore": "SIN",
    "bangkok": "BKK",
    "tokyo": "NRT",
    "paris": "CDG",
}

def _get_iata(city_name: str) -> str:
    """Convert a city name to its IATA airport code."""
    code = CITY_TO_IATA.get(city_name.lower().strip())
    if code:
        return code
    # If not found in our lookup, return the city name as-is
    # (it might already be an IATA code like "MAA")
    if len(city_name.strip()) == 3 and city_name.strip().isalpha():
        return city_name.strip().upper()
    # Last resort: return as-is and let SerpApi handle it
    return city_name.strip()

def search_flights(from_city: str, to_city: str, date: str, adults: int = 1, return_date: str = None):
    """
    Search for real flights using SerpApi (Google Flights).
    departure_id and arrival_id MUST be IATA airport codes (e.g., MAA, GOI).
    """
    if not SERPAPI_KEY:
        return {"error": "SERPAPI_KEY is not set in .env"}

    departure_iata = _get_iata(from_city)
    arrival_iata = _get_iata(to_city)

    print(f"[SerpApi] Searching flights: {from_city}({departure_iata}) -> {to_city}({arrival_iata}) on {date}, adults={adults}")

    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google_flights",
        "departure_id": departure_iata,
        "arrival_id": arrival_iata,
        "outbound_date": date,
        "currency": "INR",
        "hl": "en",
        "adults": adults,
        "api_key": SERPAPI_KEY
    }
    
    if return_date:
        params["type"] = "1"  # Round trip
        params["return_date"] = return_date
    else:
        params["type"] = "2"  # One way (REQUIRED - default is round trip which needs return_date)

    last_exc = None
    for retry in range(3):
        try:
            response = _SESSION.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            last_exc = None
            break
        except (requests.exceptions.ConnectionError, requests.exceptions.ChunkedEncodingError) as e:
            last_exc = e
            wait = 2 ** retry
            print(f"[SerpApi Flights] Connection error (attempt {retry+1}/3), retrying in {wait}s: {e}")
            import time; time.sleep(wait)
        except requests.exceptions.HTTPError as e:
            print(f"SerpApi HTTP error: {e}")
            print(f"Response body: {e.response.text[:500] if e.response else 'N/A'}")
            return {"error": f"SerpApi returned error: {e.response.status_code if e.response else 'unknown'}"}
        except Exception as e:
            print("SerpApi error:", e)
            return {"error": "Failed to fetch flights from SerpApi"}
            
    if last_exc:
        print("SerpApi error after retries:", last_exc)
        return {"error": "Failed to fetch flights from SerpApi due to connection drops"}

    # SerpApi returns flights in 'best_flights' and 'other_flights'
    raw_flights = data.get("best_flights", [])
    if not raw_flights:
        raw_flights = data.get("other_flights", [])

    if not raw_flights:
        return []

    results = []
    # Limit to top 5 flights to save LLM tokens
    for f in raw_flights[:5]:
        flights_arr = f.get("flights", [])
        if not flights_arr:
            continue
            
        first_leg = flights_arr[0]
        airline = first_leg.get("airline", "Unknown Airline")
        flight_num = first_leg.get("flight_number", "Unknown")
        
        # Get departure info
        dep_airport = first_leg.get("departure_airport", {})
        departure_time = dep_airport.get("time", "Unknown")
        
        # Get arrival info from last leg (handles layovers)
        last_leg = flights_arr[-1]
        arr_airport = last_leg.get("arrival_airport", {})
        arrival_time = arr_airport.get("time", "Unknown")
        
        price = f.get("price", "Unknown")

        results.append({
            "flight_number": flight_num,
            "airline": airline,
            "departure_time": departure_time,
            "arrival_time": arrival_time,
            "price": price,
            "layovers": len(flights_arr) - 1,
            "total_duration": f.get("total_duration", None),
            "from_iata": departure_iata,
            "to_iata": arrival_iata,
        })

    return results