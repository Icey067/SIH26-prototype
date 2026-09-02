import pytest
import pytest_asyncio
from app.services.live_train_service import LiveTrainService
from app.services.weather_service import WeatherService
from app.services.live_conflict_monitor import LiveConflictMonitor
from app.core.database import SessionLocal

def test_live_train_feed(client):
    response = client.get("/api/v1/live/telemetry")
    assert response.status_code == 200
    data = response.json()

    assert "trains" in data
    assert len(data["trains"]) >= 5
    first_train = data["trains"][0]
    assert "train_number" in first_train
    assert "current_km" in first_train
    assert "latitude" in first_train
    assert "longitude" in first_train
    assert "delay_minutes" in first_train
    assert "status" in first_train

def test_corridor_weather(client):
    response = client.get("/api/v1/live/weather")
    assert response.status_code == 200
    data = response.json()

    assert "ambient_temp_c" in data
    assert "estimated_rail_temp_c" in data
    assert "rail_hazards" in data
    hazards = data["rail_hazards"]
    assert "track_buckling_risk" in hazards
    assert "fog_risk_level" in hazards
    assert "ohe_wire_sag_risk" in hazards

def test_gemini_ai_parse_defect(client):
    sample_field_report = {
        "raw_text": "Aligarh ke paas switch point 204 me relay flutter ho rahi hai aur contact wire loose hai. 30 ka TSR lagana padega.",
        "track_section_id": "NCR-GZB-TDL-UP",
        "auto_create": False
    }
    response = client.post("/api/v1/defects/ai-parse", json=sample_field_report)
    assert response.status_code == 200
    data = response.json()

    assert "structured_data" in data
    struct = data["structured_data"]
    assert "system" in struct
    assert struct["system"] in ["TMS", "SMMS", "TDMS"]
    assert "severity" in struct
    assert "root_cause_analysis" in struct

def test_gemini_ai_parse_auto_create(client):
    sample_field_report = {
        "raw_text": "Urgent emergency: Weld fracture detected at Km 92/10 near Daud Khan. Immediate 30 kmph restriction needed.",
        "track_section_id": "NCR-GZB-TDL-UP",
        "auto_create": True,
        "reported_by": "FIELD_OFFICER_CHAT"
    }
    response = client.post("/api/v1/defects/ai-parse", json=sample_field_report)
    assert response.status_code == 200
    data = response.json()

    assert data["created_defect"] is not None
    created = data["created_defect"]
    assert created["id"].startswith("DEF-")
    assert created["criticality_score"] >= 70.0

def test_live_conflict_evaluation(client):
    db = SessionLocal()
    try:
        import asyncio
        conflicts = asyncio.run(LiveConflictMonitor.evaluate_conflicts(db, section_id="NCR-GZB-TDL-UP"))
        assert isinstance(conflicts, list)
    finally:
        db.close()

def test_websocket_telemetry_stream(client):
    with client.websocket_connect("/api/v1/live/ws") as websocket:
        initial = websocket.receive_json()
        assert initial["event"] == "INITIAL_STATE"
        assert "trains" in initial
        assert "weather" in initial

        # Send ping
        websocket.send_text("ping")
        pong = websocket.receive_json()
        assert pong["event"] == "pong"
