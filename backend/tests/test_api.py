import pytest
from datetime import datetime

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "Samanvay-AI Indian Railways Engine"
    assert data["status"] == "OPERATIONAL"

def test_list_defects(client):
    response = client.get("/api/v1/defects")
    assert response.status_code == 200
    defects = response.json()
    assert len(defects) >= 10
    
    # Verify criticality scores are present and sorted descending
    scores = [d["criticality_score"] for d in defects]
    assert scores == sorted(scores, reverse=True)

def test_create_defect_with_scoring(client):
    new_defect = {
        "title": "Severe Rail Base Crack at Km 104/10",
        "system": "TMS",
        "department": "ENGINEERING",
        "severity": "CRITICAL",
        "track_section_id": "NCR-GZB-TDL-UP",
        "km_marker": 104.5,
        "line": "UP",
        "latitude": 27.82,
        "longitude": 78.02,
        "description": "Crack spanning 40mm at weld heat affected zone.",
        "speed_restriction_kmph": 30,
        "estimated_repair_minutes": 90,
        "machinery_required": "FLASH_BUTT_WELDING"
    }
    response = client.post("/api/v1/defects", json=new_defect)
    assert response.status_code == 201
    created = response.json()
    assert created["id"].startswith("DEF-TMS-")
    # Base CRITICAL (50) + TSR 30 (25) + TMS (15) = 90.0
    assert created["criticality_score"] >= 80.0

def test_list_blocks(client):
    response = client.get("/api/v1/blocks")
    assert response.status_code == 200
    blocks = response.json()
    assert len(blocks) >= 1
    mega_block = blocks[0]
    assert mega_block["id"] == "BLK-NCR-2026-001"
    assert "ENG,S&T,TRD" in mega_block["bundled_departments"]
    assert len(mega_block["defects"]) >= 5

def test_block_approval_workflow(client):
    # Create a draft block first
    new_block = {
        "block_code": "TEST-GZB-TDL-1400",
        "title": "Emergency Track Tamping",
        "track_section_id": "NCR-GZB-TDL-UP",
        "line": "UP",
        "division": "Prayagraj (NCR)",
        "start_km": 110.0,
        "end_km": 115.0,
        "time_window_start": datetime.utcnow().isoformat(),
        "time_window_end": datetime.utcnow().isoformat(),
        "duration_minutes": 60,
        "primary_department": "ENG",
        "bundled_departments": "ENG",
        "machinery_assigned": "CSM"
    }
    create_res = client.post("/api/v1/blocks", json=new_block)
    assert create_res.status_code == 201
    block_id = create_res.json()["id"]

    # Approve with Section Controller Private Number
    approval_payload = {
        "private_number": "PN-NCR-9912",
        "controller_remarks": "Approved during goods train regulation",
        "caution_order_issued": True,
        "ohe_power_isolated": False
    }
    approve_res = client.post(f"/api/v1/blocks/{block_id}/approve", json=approval_payload)
    assert approve_res.status_code == 200
    approved = approve_res.json()
    assert approved["status"] == "APPROVED"
    assert approved["private_number"] == "PN-NCR-9912"
    assert approved["protocol_step"] == 1

def test_timetable_gaps(client):
    response = client.get("/api/v1/timetable/gaps?track_section_id=NCR-GZB-TDL-UP&line=UP&min_gap_minutes=60")
    assert response.status_code == 200
    gaps = response.json()
    assert len(gaps) >= 1
    first_gap = gaps[0]
    assert first_gap["duration_minutes"] >= 60
    assert "preceding_train" in first_gap
    assert "following_train" in first_gap

def test_or_tools_optimization_generation(client):
    response = client.post("/api/v1/blocks/optimize/generate?track_section_id=NCR-GZB-TDL-UP&line=UP&save_to_db=false")
    assert response.status_code == 200
    recommended_blocks = response.json()
    assert isinstance(recommended_blocks, list)
    if recommended_blocks:
        b = recommended_blocks[0]
        assert "Bundled Block" in b["title"]
        assert b["optimization_score"] > 0
