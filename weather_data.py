"""
weather_data.py
───────────────
Two-source weather module:
  1. Zomato Weather Union  → Real-time sensor data for Indian cities (temp, humidity, rain)
  2. Open-Meteo           → Free 7-day forecast, no API key needed

Interview Crux:
  We use TWO APIs because Weather Union gives ground-truth, India-specific
  real-time data (from physical sensors), but has NO forecast capability.
  Open-Meteo fills that gap with a 7-day outlook. Neither requires payment.
  The backend merges both responses into one clean dict for the frontend.
"""

import os, requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

WEATHER_UNION_KEY  = os.getenv("WEATHER_UNION_API_KEY")
WEATHER_UNION_BASE = "https://www.weatherunion.com/gw/weather/external/v0"
OPEN_METEO_BASE    = "https://api.open-meteo.com/v1/forecast"

_SESSION = requests.Session()
_SESSION.headers.update({"Connection": "keep-alive"})

# WMO Weather Codes → Human-readable labels (Open-Meteo standard)
WMO_CODES = {
    0: "☀️ Clear sky", 1: "🌤️ Mainly clear", 2: "⛅ Partly cloudy", 3: "☁️ Overcast",
    45: "🌫️ Foggy", 48: "🌫️ Icy fog",
    51: "🌦️ Light drizzle", 61: "🌧️ Slight rain", 63: "🌧️ Moderate rain", 65: "🌧️ Heavy rain",
    71: "🌨️ Slight snow", 80: "🌦️ Rain showers", 95: "⛈️ Thunderstorm",
}

# Major Indian cities → (latitude, longitude)
# Used for both Weather Union and Open-Meteo calls
CITY_COORDS = {
    "Mumbai":      (19.0760, 72.8777),
    "Delhi":       (28.6139, 77.2090),
    "Bangalore":   (12.9716, 77.5946),
    "Hyderabad":   (17.3850, 78.4867),
    "Chennai":     (13.0827, 80.2707),
    "Kolkata":     (22.5726, 88.3639),
    "Jaipur":      (26.9124, 75.7873),
    "Goa":         (15.2993, 74.1240),
    "Pune":        (18.5204, 73.8567),
    "Kochi":       (9.9312,  76.2673),
    "Manali":      (32.2396, 77.1887),
    "Shimla":      (31.1048, 77.1734),
    "Udaipur":     (24.5854, 73.7125),
    "Varanasi":    (25.3176, 82.9739),
    "Agra":        (27.1767, 78.0081),
    "Lucknow":     (26.8467, 80.9462),
    "Ahmedabad":   (23.0225, 72.5714),
    "Chandigarh":  (30.7333, 76.7794),
    "Rishikesh":   (30.0869, 78.2676),
    "Ooty":        (11.4102, 76.6950),
    "Darjeeling":  (27.0360, 88.2627),
    "Mysore":      (12.2958, 76.6394),
    "Amritsar":    (31.6340, 74.8723),
    "Jodhpur":     (26.2389, 73.0243),
    "Leh":         (34.1526, 77.5771),
}


def _get_coords(city: str):
    """Case-insensitive city lookup. Returns (lat, lon) or None."""
    for name, coords in CITY_COORDS.items():
        if name.lower() == city.strip().lower():
            return coords
    return None


def get_current_weather(city: str) -> dict:
    """
    Calls Zomato Weather Union for real-time data.
    Header-based auth: x-zomato-api-key
    Returns temp (°C), humidity (%), wind (km/h), rain intensity.
    """
    coords = _get_coords(city)
    if not coords:
        return {"error": f"City '{city}' not in supported list", "city": city}

    lat, lon = coords
    try:
        last_exc = None
        for retry in range(3):
            try:
                resp = _SESSION.get(
                    f"{WEATHER_UNION_BASE}/get_weather_data",
                    params={"latitude": lat, "longitude": lon},
                    headers={"x-zomato-api-key": WEATHER_UNION_KEY},
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                last_exc = None
                break
            except (requests.exceptions.ConnectionError, requests.exceptions.ChunkedEncodingError) as e:
                last_exc = e
                wait = 2 ** retry
                print(f"[Weather Union] Connection error (attempt {retry+1}/3), retrying in {wait}s: {e}")
                import time; time.sleep(wait)
        if last_exc:
            raise last_exc

        # Weather Union nests data under locality_weather_data
        w = data.get("locality_weather_data", {})
        return {
            "city": city,
            "source": "Zomato Weather Union",
            "temperature":  w.get("temperature"),       # °C
            "humidity":     w.get("humidity"),           # %
            "wind_speed":   w.get("wind_speed"),         # km/h
            "rain_intensity": w.get("rain_intensity"),   # mm/min
            "timestamp":    datetime.now().isoformat(),
        }
    except Exception as e:
        return {"error": str(e), "city": city}


def get_trip_forecast(city: str, start_date: str, end_date: str) -> list:
    """
    Calls Open-Meteo for daily forecast between start_date and end_date.
    No API key required — completely free and open source.
    Returns a list of daily dicts: date, max/min temp, rain sum, condition label.
    """
    coords = _get_coords(city)
    if not coords:
        return []

    lat, lon = coords
    try:
        last_exc = None
        for retry in range(3):
            try:
                resp = _SESSION.get(
                    OPEN_METEO_BASE,
                    params={
                        "latitude":  lat,
                        "longitude": lon,
                        "daily":     "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
                        "start_date": start_date,   # YYYY-MM-DD
                        "end_date":   end_date,     # YYYY-MM-DD
                        "timezone":  "Asia/Kolkata",
                    },
                    timeout=10,
                )
                resp.raise_for_status()
                daily = resp.json().get("daily", {})
                last_exc = None
                break
            except (requests.exceptions.ConnectionError, requests.exceptions.ChunkedEncodingError) as e:
                last_exc = e
                wait = 2 ** retry
                print(f"[Open-Meteo] Connection error (attempt {retry+1}/3), retrying in {wait}s: {e}")
                import time; time.sleep(wait)
        if last_exc:
            raise last_exc

        # Zip parallel arrays into a clean list of per-day dicts
        forecast = []
        dates     = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        rains     = daily.get("precipitation_sum", [])
        codes     = daily.get("weathercode", [])

        for i, date in enumerate(dates):
            forecast.append({
                "date":        date,
                "temp_max":    max_temps[i] if i < len(max_temps) else None,
                "temp_min":    min_temps[i] if i < len(min_temps) else None,
                "rain_mm":     rains[i]     if i < len(rains)     else 0,
                "condition":   WMO_CODES.get(codes[i] if i < len(codes) else 0, "🌡️ Unknown"),
            })
        return forecast
    except Exception as e:
        print("Open-Meteo error:", e)
        return []


def get_weather_for_trip(city: str, start_date: str, end_date: str) -> dict:
    """
    Combined entry point used by the /weather endpoint.
    Returns both real-time current conditions AND the full trip forecast.
    """
    return {
        "current":  get_current_weather(city),
        "forecast": get_trip_forecast(city, start_date, end_date),
    }
