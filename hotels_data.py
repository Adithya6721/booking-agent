import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

_SESSION = requests.Session()
_SESSION.headers.update({"Connection": "keep-alive"})

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
            print(f"[SerpApi Hotels] Connection error (attempt {retry+1}/3), retrying in {wait}s: {e}")
            import time; time.sleep(wait)
        except requests.exceptions.HTTPError as e:
            print(f"SerpApi HTTP error: {e}")
            print(f"Response body: {e.response.text[:500] if e.response else 'N/A'}")
            return {"error": f"SerpApi returned error: {e.response.status_code if e.response else 'unknown'}"}
        except Exception as e:
            print("SerpApi error:", e)
            return {"error": "Failed to fetch hotels from SerpApi"}
            
    if last_exc:
        print("SerpApi Hotels error after retries:", last_exc)
        return {"error": "Failed to fetch hotels from SerpApi due to connection drops"}
        
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