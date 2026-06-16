import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

def search_hotels(city: str, check_in_date: str, check_out_date: str, adults: int = 1, max_price: int = None, amenities: str = None):
    """
    Search for real hotels using SerpApi (Google Hotels).
    The 'q' parameter accepts natural language queries like "Goa" or "Goa hotel with pool".
    Dates must be in YYYY-MM-DD format.
    """
    if not SERPAPI_KEY:
        return {"error": "SERPAPI_KEY is not set in .env"}

    # Build search query string
    q_str = city
    if amenities:
        q_str += f" hotel {amenities}"
    
    print(f"[SerpApi] Searching hotels: q='{q_str}', check_in={check_in_date}, check_out={check_out_date}, adults={adults}")
        
    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google_hotels",
        "q": q_str,
        "check_in_date": check_in_date,
        "check_out_date": check_out_date,
        "adults": adults,
        "currency": "INR",
        "gl": "in",
        "hl": "en",
        "api_key": SERPAPI_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.HTTPError as e:
        print(f"SerpApi HTTP error: {e}")
        print(f"Response body: {e.response.text[:500] if e.response else 'N/A'}")
        return {"error": f"SerpApi returned error: {e.response.status_code if e.response else 'unknown'}"}
    except Exception as e:
        print("SerpApi error:", e)
        return {"error": "Failed to fetch hotels from SerpApi"}
        
    results = []
    for hotel in data.get("properties", [])[:5]:
        # Try rate_per_night first, then total_rate
        price_str = hotel.get("rate_per_night", {}).get("lowest", "0")
        if not price_str:
            price_str = hotel.get("total_rate", {}).get("lowest", "0")
        if not price_str:
            continue
            
        # Clean price format (e.g. "₹3,500" -> 3500)
        price_clean = "".join(c for c in str(price_str) if c.isdigit())
        if not price_clean:
            continue
            
        price = int(price_clean)
        
        # Filter by budget if specified
        if max_price and price > max_price:
            continue
            
        results.append({
            "name": hotel.get("name"),
            "price_per_night": price,
            "rating": hotel.get("overall_rating", "Unknown")
        })
            
    if not results:
        return {"message": "No hotels found matching criteria."}
    return results