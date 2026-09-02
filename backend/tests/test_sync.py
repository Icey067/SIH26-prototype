import pytest
import json
import time

def test_downstream_sync(client):
    response = client.get("/api/v1/sync/downstream?division=Prayagraj (NCR)&section_id=NCR-GZB-TDL-UP")
    assert response.status_code == 200
    data = response.json()
    
    assert "serverTime" in data
    assert data["division"] == "Prayagraj (NCR)"
    assert len(data["blocks"]) >= 1
    assert len(data["defects"]) >= 1
    
    # Test Room entity field parity for MobileBlockSchedule
    block = data["blocks"][0]
    assert "id" in block
    assert "blockCode" in block
    assert "startKm" in block
    assert "endKm" in block
    assert "line" in block
    assert "timeWindow" in block
    assert "status" in block
    assert "protocolStep" in block
    
    # Test Room entity field parity for MobileDefectLog
    defect = data["defects"][0]
    assert "id" in defect
    assert "title" in defect
    assert "system" in defect
    assert "severity" in defect
    assert "latitude" in defect
    assert "longitude" in defect
    assert "syncStatus" in defect

def test_upstream_sync_idempotent(client):
    queue_item_id = f"MOBILE-SYNC-{int(time.time())}"
    payload = {
        "system": "TMS",
        "severity": "CRITICAL",
        "department": "ENGINEERING",
        "km": 94.2,
        "lat": 27.85,
        "lng": 78.03,
        "description": "Loose fishbolt observed on curve.",
        "speedRestriction": 45
    }
    
    request_body = {
        "clientId": "IRONSENTINEL-FIELD-TAB-01",
        "items": [
            {
                "id": queue_item_id,
                "title": "Loose fishbolt observed on curve at Km 94/08",
                "category": "defect",
                "timestamp": int(time.time() * 1000),
                "payloadJson": json.dumps(payload)
            }
        ]
    }
    
    # First sync push
    first_res = client.post("/api/v1/sync/upstream", json=request_body)
    assert first_res.status_code == 200
    first_data = first_res.json()
    assert first_data["receivedCount"] == 1
    assert first_data["processedCount"] == 1
    assert queue_item_id in first_data["syncedIds"]

    # Re-push the same queue item (simulating intermittent network retry / idempotency)
    second_res = client.post("/api/v1/sync/upstream", json=request_body)
    assert second_res.status_code == 200
    second_data = second_res.json()
    assert second_data["receivedCount"] == 1
    assert second_data["processedCount"] == 1
    assert queue_item_id in second_data["syncedIds"]
