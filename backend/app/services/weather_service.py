import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

import time

class WeatherService:
    _cached_weather: Optional[Dict[str, Any]] = None
    _last_weather_fetch: float = 0.0
    _weather_ttl: float = 30.0 # 30s cache

    @classmethod
    async def get_corridor_weather(cls, lat: float = 27.8974, lon: float = 78.0880) -> Dict[str, Any]:
        """
        Fetches live weather from OpenWeatherMap along the railway corridor
        and computes operational track/OHE safety hazard indicators.
        """
        if cls._cached_weather and (time.time() - cls._last_weather_fetch) < cls._weather_ttl:
            return cls._cached_weather
        api_key = settings.OPENWEATHER_API_KEY
        ambient_temp_c = 31.0
        humidity = 65
        wind_speed_kmph = 14.0
        visibility_m = 4000
        weather_desc = "Clear sky"
        is_live = False

        if api_key:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        main = data.get("main", {})
                        ambient_temp_c = float(main.get("temp", ambient_temp_c))
                        humidity = int(main.get("humidity", humidity))
                        visibility_m = int(data.get("visibility", visibility_m))
                        wind_speed_kmph = float(data.get("wind", {}).get("speed", 3.8)) * 3.6
                        weather_desc = data.get("weather", [{}])[0].get("description", "Clear").capitalize()
                        is_live = True
            except Exception as e:
                logger.warning(f"Failed to fetch live OpenWeatherMap data: {e}")

        # Indian Railways Rail-Head Temperature Rule:
        # Rails in direct sunlight reach Ambient Temp + 18°C
        estimated_rail_temp_c = round(ambient_temp_c + 18.0, 1)

        # Track Buckling Hazard (High rail temperature leads to thermal expansion)
        buckling_risk = "LOW"
        if estimated_rail_temp_c >= 55.0:
            buckling_risk = "HIGH_CRITICAL"
        elif estimated_rail_temp_c >= 48.0:
            buckling_risk = "MODERATE"

        # Fog Impact on Train Headway / Caution Orders
        fog_protocol_active = visibility_m < 500
        fog_risk = "SEVERE" if visibility_m < 200 else ("MODERATE" if fog_protocol_active else "NORMAL")

        # OHE Wire Sag & Pantograph Arcing (High wind + extreme heat increases catenary sag)
        ohe_arcing_risk = "ELEVATED" if wind_speed_kmph > 45 or ambient_temp_c > 42 else "NORMAL"

        result = {
            "location": "Aligarh - Tundla Rail Corridor (NCR)",
            "latitude": lat,
            "longitude": lon,
            "ambient_temp_c": round(ambient_temp_c, 1),
            "estimated_rail_temp_c": estimated_rail_temp_c,
            "humidity_percent": humidity,
            "wind_speed_kmph": round(wind_speed_kmph, 1),
            "visibility_meters": visibility_m,
            "weather_condition": weather_desc,
            "is_live_source": is_live,
            "rail_hazards": {
                "track_buckling_risk": buckling_risk,
                "fog_speed_restriction_active": fog_protocol_active,
                "fog_risk_level": fog_risk,
                "ohe_wire_sag_risk": ohe_arcing_risk
            }
        }
        cls._cached_weather = result
        cls._last_weather_fetch = time.time()
        return result
