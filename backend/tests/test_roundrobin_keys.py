import pytest
from app.core.key_rotator import KeyRotator
from app.core.config import Settings
from app.services.gemini_service import GeminiService
from app.services.weather_service import WeatherService

def test_key_rotator_round_robin():
    rotator = KeyRotator("TestService", "keyA, keyB, keyC")
    assert rotator.count == 3
    assert rotator.has_keys is True

    # 1. Sequential round-robin
    k1, i1 = rotator.get_next_key()
    assert k1 == "keyA" and i1 == 0

    k2, i2 = rotator.get_next_key()
    assert k2 == "keyB" and i2 == 1

    k3, i3 = rotator.get_next_key()
    assert k3 == "keyC" and i3 == 2

    # Wraps around
    k4, i4 = rotator.get_next_key()
    assert k4 == "keyA" and i4 == 0

def test_key_rotator_failover_ordering():
    rotator = KeyRotator("TestService", "key1,key2,key3")
    
    # First call: should start at key1, then key2, key3
    ordered1 = rotator.get_all_ordered_from_current()
    assert [k for k, _ in ordered1] == ["key1", "key2", "key3"]
    
    # Second call: starts at key2, then key3, key1
    ordered2 = rotator.get_all_ordered_from_current()
    assert [k for k, _ in ordered2] == ["key2", "key3", "key1"]
    
    # Third call: starts at key3, then key1, key2
    ordered3 = rotator.get_all_ordered_from_current()
    assert [k for k, _ in ordered3] == ["key3", "key1", "key2"]

def test_key_masking():
    assert KeyRotator.mask_key("AIzaSy1234567890abcdef") == "AIza...cdef"
    assert KeyRotator.mask_key("short") == "sh...rt"
    assert KeyRotator.mask_key("") == "[EMPTY]"

def test_settings_multi_key_parsing():
    s = Settings(
        GEMINI_API_KEY="key1, key2",
        GEMINI_API_KEYS="key3; key4",
        OPENWEATHER_API_KEY="ow_key1,ow_key2",
        OPENWEATHER_API_KEYS="ow_key3",
    )
    assert s.gemini_keys_list == ["key1", "key2", "key3", "key4"]
    assert s.openweather_keys_list == ["ow_key1", "ow_key2", "ow_key3"]

@pytest.mark.asyncio
async def test_weather_service_round_robin():
    weather = await WeatherService.get_corridor_weather()
    assert "ambient_temp_c" in weather
    assert "estimated_rail_temp_c" in weather
    assert "rail_hazards" in weather

@pytest.mark.asyncio
async def test_gemini_service_heuristic_fallback_when_no_keys():
    parsed = await GeminiService.parse_field_report("Switch point 204 relay flutter at Aligarh. 30 TSR needed.")
    assert "title" in parsed
    assert "system" in parsed
    assert "department" in parsed
