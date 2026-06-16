import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = "irctc1.p.rapidapi.com"

# ── City → Primary Station Code mapping ─────────────────────────────────────
# Covers major Indian cities. Add more as needed.
STATION_CODES = {
    "delhi": "NDLS",
    "new delhi": "NDLS",
    "mumbai": "CSTM",
    "mumbai central": "BCT",
    "chennai": "MAS",
    "madras": "MAS",
    "bangalore": "SBC",
    "bengaluru": "SBC",
    "hyderabad": "HYB",
    "kolkata": "HWH",
    "calcutta": "HWH",
    "pune": "PUNE",
    "ahmedabad": "ADI",
    "jaipur": "JP",
    "lucknow": "LKO",
    "bhopal": "BPL",
    "nagpur": "NGP",
    "surat": "ST",
    "kochi": "ERS",
    "cochin": "ERS",
    "coimbatore": "CBE",
    "madurai": "MDU",
    "goa": "MAO",
    "margao": "MAO",
    "varanasi": "BSB",
    "benaras": "BSB",
    "agra": "AGC",
    "patna": "PNBE",
    "guwahati": "GHY",
    "bhubaneswar": "BBS",
    "visakhapatnam": "VSKP",
    "vizag": "VSKP",
    "vijayawada": "BZA",
    "tirupati": "TPTY",
    "mysore": "MYS",
    "mysuru": "MYS",
    "chandigarh": "CDG",
    "amritsar": "ASR",
    "shimla": "SML",
    "manali": "SML",  # Nearest major railhead
    "jodhpur": "JU",
    "udaipur": "UDZ",
    "ajmer": "AII",
    "dehradun": "DDN",
    "haridwar": "HW",
    "rishikesh": "RKSH",
    "indore": "INDB",
    "raipur": "R",
    "ranchi": "RNC",
    "thiruvananthapuram": "TVC",
    "trivandrum": "TVC",
    "mangalore": "MAQ",
    "hubli": "UBL",
}


def city_to_station_code(city_name: str) -> str:
    """Convert a city name to its railway station code."""
    key = city_name.strip().lower()
    code = STATION_CODES.get(key)
    if not code:
        # Fallback: first 3–4 chars uppercased (may not always work)
        code = key[:4].upper().replace(" ", "")
    return code


def search_trains(from_city: str, to_city: str, date: str):
    """
    Fetch trains between two cities for a given date.
    Date should be in YYYY-MM-DD format (API accepts YYYY-MM-DD directly).
    Returns a list of train dicts or an error dict.
    """
    from_code = city_to_station_code(from_city)
    to_code   = city_to_station_code(to_city)

    # API accepts YYYY-MM-DD directly — no conversion needed
    url = "https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations"
    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
        "Content-Type": "application/json",
    }
    params = {
        "fromStationCode": from_code,
        "toStationCode":   to_code,
        "dateOfJourney":   date,   # YYYY-MM-DD
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        if not data.get("status") or not data.get("data"):
            return {"error": "No trains found", "trains": []}

        trains = []
        for t in data["data"][:15]:  # Cap at 15 results
            trains.append({
                "train_number":     t.get("train_number", ""),
                "train_name":       t.get("train_name", ""),
                "train_type":       t.get("train_type", ""),
                "from_station":     t.get("from_station_name", from_city),
                "to_station":       t.get("to_station_name", to_city),
                "from_code":        t.get("from", from_code),   # actual boarding stop
                "to_code":          t.get("to", to_code),       # actual deboard stop
                "train_src":        t.get("train_src", ""),     # train's true origin
                "train_dstn":       t.get("train_dstn", ""),    # train's true destination
                "departure":        t.get("from_std", ""),      # scheduled departure
                "arrival":          t.get("to_std", ""),        # scheduled arrival
                "duration":         t.get("duration", ""),
                "date":             t.get("train_date", date),
                "classes":          t.get("class_type", []),    # ← was train_fare (WRONG), now class_type
                "runs_on":          t.get("run_days", []),
            })
        return trains

    except requests.exceptions.HTTPError as e:
        return {"error": f"API error: {e}", "trains": []}
    except Exception as e:
        return {"error": str(e), "trains": []}
