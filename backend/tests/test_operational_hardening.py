"""
Unit and Integration Tests for Operational Realism & Railway G&SR Hardening (SIH-26027).
Tests:
1. Track Machine Transit & Stabling Logistics (35 km/h cruising + 15 min setup margin).
2. Machine Exclusivity in CP-SAT solver.
3. Emergency Freight Traffic Regulation Fallback (Phase 2).
4. OHE Elementary Section (ES) Topology & Neutral Section Conflict Detection.
5. Dual-Key Handshake PTW & HMAC-SHA256 Offline Safety Leases with TTL expiration.
"""

import datetime
from datetime import timedelta
import pytest

from app.models.defect import Defect, Department, Severity, DefectStatus, LegacySystem
from app.models.timetable import TrainSchedule, TrainType
from app.models.block import MaintenanceBlock, BlockStatus
from app.services.graph_network import corridor_network, ELEMENTARY_SECTIONS, MACHINE_DEPOTS
from app.services.block_optimizer import BlockOptimizer
from app.services.conflict_engine import conflict_engine
from app.services.safety_lease_service import safety_lease_service


# ---------------------------------------------------------------------------
# Task 1: Machine Transit & Stabling Logistics
# ---------------------------------------------------------------------------

def test_machine_depot_lookup_and_transit_calculation():
    """Verify machine depot selection, 35 km/h cruising transit, and 15 min margin."""
    # Defect at Km 180.0 (near Tundla Yard at Km 204.0)
    depot_info = corridor_network.find_nearest_machine_depot(km=180.0, machinery_type="CSM")
    assert depot_info["depot_id"] == "DEPOT-TDL"
    assert depot_info["station_id"] == "TDL"
    assert depot_info["distance_km"] == 24.0
    assert depot_info["cruising_speed_kmph"] == 35.0
    assert depot_info["setup_clearing_margin_mins"] == 15.0

    # One-way: (24.0 / 35.0) * 60 = 41.1 mins
    assert 40.0 <= depot_info["one_way_transit_mins"] <= 42.0
    # Round-trip: ~82.3 mins
    assert 80.0 <= depot_info["round_trip_transit_mins"] <= 85.0
    assert "CSM" in depot_info["machine_unit_id"]


def test_effective_work_window_constraint_rejection():
    """
    Verify that if timetable gap < (PredictedDuration + RoundTripTransit + 15min),
    the bundle CANNOT be scheduled in that gap.
    """
    # Defect at Km 100 requiring heavy BCM from Tundla (Km 204) -> distance = 104 km
    # Transit round-trip = 2 * (104 / 35 * 60) = 356.5 mins
    # Required window = ~150 mins + 356.5 mins + 15 mins > 500 mins!
    # A 90-minute timetable gap MUST reject this bundle.
    d1 = Defect(
        id="DEF-TRANSIT-1",
        title="Deep Ballast Screening Required",
        department=Department.ENGINEERING,
        severity=Severity.MAJOR,
        km_marker=100.0,
        line="UP",
        track_section_id="NCR-GZB-TDL-UP",
        status=DefectStatus.OPEN,
        estimated_repair_minutes=120,
        machinery_required="BCM",
        criticality_score=60.0,
    )

    optimizer = BlockOptimizer(section_id="NCR-GZB-TDL-UP", line="UP")
    
    # Train schedule creating only a 90-minute gap (08:00 to 09:30)
    trains = [
        TrainSchedule(
            id="SCH-1",
            train_number="12001",
            train_name="Express 1",
            train_type=TrainType.SUPERFAST,
            priority_rank=2,
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            origin_station="CNB",
            destination_station="NDLS",
            entry_time=datetime.time(6, 0),
            exit_time=datetime.time(8, 0),
            transit_duration_minutes=120,
        ),
        TrainSchedule(
            id="SCH-2",
            train_number="12002",
            train_name="Express 2",
            train_type=TrainType.SUPERFAST,
            priority_rank=2,
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            origin_station="CNB",
            destination_station="NDLS",
            entry_time=datetime.time(9, 30),
            exit_time=datetime.time(11, 30),
            transit_duration_minutes=120,
        ),
    ]

    result = optimizer.solve_optimal_block_plan(
        candidate_defects=[d1],
        train_schedules=trains,
        target_date=datetime.date.today(),
        max_blocks=2
    )

    # Cannot fit in a 90-minute gap because BCM transit + setup requires > 200 minutes!
    # And since criticality score is 60 (< 85), emergency regulation does not trigger.
    assert len(result["planned_blocks"]) == 0


# ---------------------------------------------------------------------------
# Task 2: Emergency Traffic Regulation Fallback
# ---------------------------------------------------------------------------

def test_emergency_freight_traffic_regulation():
    """
    Verify Phase 2 Fallback: When a Critical defect (score >= 85) has no valid natural gap,
    the optimizer shunts the lowest priority freight train into an intermediate station loop (SKB/HRS)
    and produces a formal traffic_regulation_order.
    """
    d_crit = Defect(
        id="DEF-EMERG-1",
        title="Rail Web Fracture at Km 235/10",
        department=Department.ENGINEERING,
        severity=Severity.CRITICAL,
        km_marker=235.0, # Near Shikohabad Jn (Km 240.0)
        line="UP",
        track_section_id="NCR-GZB-TDL-UP",
        status=DefectStatus.OPEN,
        estimated_repair_minutes=90,
        machinery_required="FLASH_BUTT_WELDING",
        criticality_score=92.0, # >= 85.0 triggers Emergency Regulation
    )

    # Train schedules with tightly packed trains (no 60-minute natural gap)
    trains = [
        TrainSchedule(
            id="SCH-1",
            train_number="12003",
            train_name="Shatabdi Express",
            train_type=TrainType.SUPERFAST,
            priority_rank=1,
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            origin_station="CNB",
            destination_station="NDLS",
            entry_time=datetime.time(6, 0),
            exit_time=datetime.time(7, 30),
            transit_duration_minutes=90,
        ),
        TrainSchedule(
            id="SCH-2",
            train_number="BOXN_701",
            train_name="Coal Freight 701",
            train_type=TrainType.FREIGHT_COAL,
            priority_rank=5, # Lowest priority
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            origin_station="CNB",
            destination_station="DLI",
            entry_time=datetime.time(8, 0),
            exit_time=datetime.time(12, 0),
            transit_duration_minutes=240,
        ),
    ]

    optimizer = BlockOptimizer(section_id="NCR-GZB-TDL-UP", line="UP")
    result = optimizer.solve_optimal_block_plan(
        candidate_defects=[d_crit],
        train_schedules=trains,
        target_date=datetime.date.today(),
        max_blocks=2
    )

    assert len(result["planned_blocks"]) >= 1
    emergency_block = result["planned_blocks"][0]
    assert "Bundled Block" in emergency_block["title"]
    assert emergency_block.get("is_emergency_regulation") is True
    assert emergency_block["traffic_regulation_order"] is not None

    reg_order = json_str = emergency_block["traffic_regulation_order"]
    if isinstance(reg_order, str):
        import json
        reg_order = json.loads(reg_order)

    assert reg_order["train_held"] in ("BOXN_701", "BOXN_Freight_702")
    assert reg_order["loop_station"] in ("SKB", "HRS", "DER")
    assert reg_order["delay_incurred_mins"] == 45
    assert reg_order["carved_block_mins"] >= 75
    assert result["metrics"]["emergency_blocks_carved"] >= 1


# ---------------------------------------------------------------------------
# Task 3: OHE Elementary Section (ES) Topology & Conflict Detection
# ---------------------------------------------------------------------------

def test_ohe_elementary_section_boundary_expansion():
    """Verify that TDMS defect physical boundaries expand to enclosing ElementarySection limits."""
    es = corridor_network.get_elementary_section_for_km(88.5, line="UP")
    assert es is not None
    assert es.section_id == "ES-GZB-TDL-04"
    assert es.start_km == 81.2
    assert es.end_km == 94.6
    assert es.feeding_post == "FP-ALJN"
    assert es.isolator_id == "ISO-88-1"
    assert es.neutral_section_km == 92.5

    # Test optimizer auto-expansion for TDMS defect at Km 88.5
    d_ohe = Defect(
        id="DEF-TDMS-1",
        title="OHE Dropper Snapped at Km 88.5",
        department=Department.TRACTION_DISTRIBUTION,
        severity=Severity.CRITICAL,
        km_marker=88.5,
        line="UP",
        track_section_id="NCR-GZB-TDL-UP",
        status=DefectStatus.OPEN,
        estimated_repair_minutes=60,
        machinery_required="TOWER_WAGON",
        criticality_score=88.0,
    )

    optimizer = BlockOptimizer(section_id="NCR-GZB-TDL-UP", line="UP")
    result = optimizer.solve_optimal_block_plan(
        candidate_defects=[d_ohe],
        train_schedules=[],
        target_date=datetime.date.today(),
        max_blocks=1
    )

    assert len(result["planned_blocks"]) >= 1
    blk = result["planned_blocks"][0]
    # Physical limits must be expanded to ES boundaries 81.2 to 94.6
    assert blk["start_km"] <= 81.2
    assert blk["end_km"] >= 94.6
    assert blk["elementary_section_id"] == "ES-GZB-TDL-04"


def test_ohe_neutral_section_conflict_detection():
    """Verify conflict engine flags OHE_NEUTRAL_SECTION_HAZARD for electric locos during cutoff."""
    # Vande Bharat (22436) passes Aligarh (Km 126) at min 435
    # Propose an OHE power block on ES-DER-ALJN-02 (Km 37.0 to 81.2) or ES-GZB-TDL-04 (Km 81.2 to 94.6)
    # Vande Bharat is between Km 0 and 126 during min 380 - 435.
    ohe_block = {
        "id": "BLK-OHE-TEST",
        "department": "TDMS",
        "activity_type": "OHE_INSPECTION",
        "line_type": "DN_MAIN",
        "direction": "DN",
        "start_km": 88.5,
        "end_km": 90.0,
        "start_minute": 390, # Vande Bharat is in this section at this minute!
        "duration_minutes": 60,
        "ohe_power_isolated": True,
        "machinery_deployed": "TOWER_WAGON",
        "track_type": "MAIN_LINE",
        "weather_condition": "CLEAR",
    }

    report = conflict_engine.detect_conflicts([ohe_block])
    conflicts = report["conflicts"]
    conflict_types = [c["type"] for c in conflicts]

    assert "OHE_NEUTRAL_SECTION_HAZARD" in conflict_types
    ohe_hazard = next(c for c in conflicts if c["type"] == "OHE_NEUTRAL_SECTION_HAZARD")
    assert ohe_hazard["severity"] == "CRITICAL"
    assert ohe_hazard["elementary_section_id"] == "ES-GZB-TDL-04"
    assert ohe_hazard["feeding_post"] == "FP-ALJN"
    assert ohe_hazard["isolator_id"] == "ISO-88-1"
    assert ohe_hazard["neutral_section_km"] == 92.5


# ---------------------------------------------------------------------------
# Task 4: Dual-Handshake Digital PTW & Offline Safety Leases
# ---------------------------------------------------------------------------

def test_dual_key_handshake_workflow(client):
    """
    Verify block lifecycle progression:
    REQUESTED -> CONTROLLER_APPROVED -> STATION_MASTER_CONCURRED.
    """
    new_block = {
        "block_code": "TEST-GSR-HANDSHAKE-01",
        "title": "Turnout Point 204 Renewal",
        "track_section_id": "NCR-GZB-TDL-UP",
        "line": "UP",
        "division": "Prayagraj (NCR)",
        "start_km": 126.0,
        "end_km": 128.0,
        "time_window_start": (datetime.datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "time_window_end": (datetime.datetime.utcnow() + timedelta(hours=3)).isoformat(),
        "duration_minutes": 120,
        "primary_department": "ENG",
        "bundled_departments": "ENG,S&T",
        "machinery_assigned": "UNIMAT"
    }
    create_res = client.post("/api/v1/blocks", json=new_block)
    assert create_res.status_code == 201
    block_id = create_res.json()["id"]

    # Step 1: Section Controller Approval (Handshake Part 1)
    controller_payload = {
        "private_number": "PN-SC-ALJN-8831",
        "controller_remarks": "Section Controller authorized during freight siding",
        "caution_order_issued": True,
        "ohe_power_isolated": False
    }
    sc_res = client.post(f"/api/v1/blocks/{block_id}/approve", json=controller_payload)
    assert sc_res.status_code == 200
    sc_data = sc_res.json()
    assert sc_data["status"] == "APPROVED"
    assert sc_data["controller_private_number"] == "PN-SC-ALJN-8831"
    assert sc_data["protocol_step"] >= 1

    # Step 2: Station Master Concurrence (Handshake Part 2)
    sm_payload = {
        "station_master_private_number": "PN-SM-ALJN-4412",
        "station_id": "ALJN",
        "station_master_remarks": "Point 204 padlocked, signals set to Red aspect."
    }
    sm_res = client.post(f"/api/v1/blocks/{block_id}/station-master-concur", json=sm_payload)
    assert sm_res.status_code == 200
    sm_data = sm_res.json()
    assert sm_data["status"] == "STATION_MASTER_CONCURRED"
    assert sm_data["station_master_private_number"] == "PN-SM-ALJN-4412"
    assert sm_data["station_master_station"] == "ALJN"
    assert sm_data["safety_lease_token"] is not None
    assert sm_data["lease_expires_at"] is not None
    assert sm_data["protocol_step"] >= 2


def test_hmac_offline_safety_lease_token_and_timeout(client):
    """
    Verify HMAC-SHA256 lease token verification and automatic SAFETY_TIMEOUT_SUSPENDED
    when offline field time surpasses expires_at.
    """
    now = datetime.datetime.utcnow()
    # 1. Generate lease token expiring in the past (to simulate offline TTL expiry)
    past_end = now - timedelta(minutes=20)
    lease = safety_lease_service.generate_lease_token(
        block_id="BLK-EXP-TEST",
        block_code="EXP-001",
        time_window_end=past_end,
        controller_pn="PN-SC-11",
        station_master_pn="PN-SM-22",
        grace_minutes=5 # Expired 15 mins ago!
    )
    token = lease["token"]
    assert token is not None

    verification = safety_lease_service.verify_lease_token(token)
    assert verification["valid"] is True
    assert verification["is_expired"] is True
    assert verification["status"] == "SAFETY_TIMEOUT_SUSPENDED"
    assert verification["lock_ui"] is True
    assert verification["audible_warning"] is True

    # 2. Test via the /sync/verify-lease endpoint
    # First create and concur a test block
    new_block = {
        "block_code": "TEST-EXPIRY-BLOCK",
        "title": "Expired Lease Simulation",
        "track_section_id": "NCR-GZB-TDL-UP",
        "line": "UP",
        "start_km": 150.0,
        "end_km": 152.0,
        "time_window_start": (now - timedelta(hours=2)).isoformat(),
        "time_window_end": (now - timedelta(minutes=30)).isoformat(),
        "duration_minutes": 60,
        "primary_department": "ENG"
    }
    b_res = client.post("/api/v1/blocks", json=new_block)
    block_id = b_res.json()["id"]

    # Controller approve
    client.post(f"/api/v1/blocks/{block_id}/approve", json={"private_number": "PN-SC-01"})
    # SM concur
    client.post(f"/api/v1/blocks/{block_id}/station-master-concur", json={
        "station_master_private_number": "PN-SM-01",
        "station_id": "HRS"
    })

    # Call verify-lease endpoint
    v_res = client.post("/api/v1/sync/verify-lease", json={"block_id": block_id})
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_expired"] is True
    assert v_data["status"] == "SAFETY_TIMEOUT_SUSPENDED"
    assert v_data["lock_ui"] is True
    assert v_data["audible_warning"] is True


def test_downstream_sync_endpoint(client):
    """Verify mobile downstream sync returns active blocks, lease tokens, and TSRs."""
    sync_res = client.get("/api/v1/sync/downstream")
    assert sync_res.status_code == 200
    data = sync_res.json()
    assert "active_blocks" in data
    assert "open_defects" in data
    assert "active_tsrs" in data
    assert "sync_token" in data
    assert len(data["open_defects"]) >= 5


# ---------------------------------------------------------------------------
# Jury Defense Enhancements: Drift, Emergency Revocation & Breakdown Reporting
# ---------------------------------------------------------------------------

def test_dynamic_timetable_drift_gap_compression():
    """Verify that real-time delays dynamically compress or shift timetable gaps."""
    optimizer = BlockOptimizer(section_id="NCR-GZB-TDL-UP", line="UP")
    trains = [
        TrainSchedule(
            id="SCH-D1",
            train_number="12004",
            train_name="Shatabdi Express",
            train_type=TrainType.SUPERFAST,
            priority_rank=1,
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            origin_station="NDLS",
            destination_station="LKO",
            entry_time=datetime.time(6, 0),
            exit_time=datetime.time(7, 30), # Normally 07:30
            transit_duration_minutes=90,
        ),
        TrainSchedule(
            id="SCH-D2",
            train_number="12398",
            train_name="Mahabodhi Express",
            train_type=TrainType.SUPERFAST,
            priority_rank=2,
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            origin_station="NDLS",
            destination_station="GAYA",
            entry_time=datetime.time(9, 45), # Normally 09:45 -> Gap is 135 mins
            exit_time=datetime.time(11, 45),
            transit_duration_minutes=120,
        ),
    ]

    # Without delays: Gap is 07:30 to 09:45 = 135 minutes
    base_gaps = optimizer.find_timetable_gaps(trains, min_gap_minutes=60)
    assert len(base_gaps) == 1
    assert base_gaps[0]["duration_minutes"] == 135

    # With Shatabdi running 45 minutes late: Exit shifts from 07:30 to 08:15
    # Gap compresses from 135 mins down to 90 mins!
    drifted_gaps = optimizer.find_timetable_gaps(trains, min_gap_minutes=60, realtime_delays={"12004": 45})
    assert len(drifted_gaps) == 1
    assert drifted_gaps[0]["duration_minutes"] == 90
    assert drifted_gaps[0]["start_time"] == "08:15"
    assert drifted_gaps[0]["is_dynamically_drifted"] is True


def test_emergency_block_revocation_workflow(client):
    """
    Verify unilateral emergency revocation by Section Controller for SOS / Relief Train.
    Validates lease invalidation and state transition to EMERGENCY_REVOKED.
    """
    # Create block
    now = datetime.datetime.utcnow()
    b_res = client.post("/api/v1/blocks", json={
        "block_code": "TEST-EMERG-REVOKE",
        "title": "Turnout Overhaul",
        "track_section_id": "NCR-GZB-TDL-UP",
        "line": "UP",
        "start_km": 110.0,
        "end_km": 112.0,
        "time_window_start": (now + timedelta(hours=1)).isoformat(),
        "time_window_end": (now + timedelta(hours=3)).isoformat(),
        "duration_minutes": 120,
        "primary_department": "ENG"
    })
    block_id = b_res.json()["id"]

    # Controller approves
    client.post(f"/api/v1/blocks/{block_id}/approve", json={"private_number": "PN-SC-88"})
    # SM concurs & generates lease
    client.post(f"/api/v1/blocks/{block_id}/station-master-concur", json={
        "station_master_private_number": "PN-SM-99",
        "station_id": "ALJN"
    })

    # Emergency Revocation
    revoke_payload = {
        "revocation_reason": "Approaching Medical Relief Van (MRV) on Priority 1 Path",
        "private_number_cancellation": "PNC-SC-ALJN-0012",
        "order_caution_on_adjacent": True
    }
    rev_res = client.post(f"/api/v1/blocks/{block_id}/emergency-revoke", json=revoke_payload)
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["status"] == "EMERGENCY_REVOKED"
    assert rev_data["private_number_cancellation"] == "PNC-SC-ALJN-0012"
    assert "Medical Relief Van" in rev_data["controller_remarks"]
    assert rev_data["caution_order_issued"] is True

    # Verification of lease must report expired / locked
    v_res = client.post("/api/v1/sync/verify-lease", json={"block_id": block_id})
    assert v_res.status_code == 200
    assert v_res.json()["is_expired"] is True
    assert v_res.json()["lock_ui"] is True


def test_machine_breakdown_incident_reporting(client):
    """
    Verify mid-transit machine breakdown handling.
    Transitions block to MACHINE_STRANDED_OBSTRUCTION, mandates Caution Order on adjacent lines,
    and records relief loco dispatch request.
    """
    now = datetime.datetime.utcnow()
    b_res = client.post("/api/v1/blocks", json={
        "block_code": "TEST-INCIDENT-BLOCK",
        "title": "Tamping Window",
        "track_section_id": "NCR-GZB-TDL-UP",
        "line": "UP",
        "start_km": 180.0,
        "end_km": 185.0,
        "time_window_start": (now + timedelta(hours=1)).isoformat(),
        "time_window_end": (now + timedelta(hours=3)).isoformat(),
        "duration_minutes": 120,
        "primary_department": "ENG"
    })
    block_id = b_res.json()["id"]

    incident_payload = {
        "machinery_id": "CSM_02",
        "incident_type": "HYDRAULIC_HOSE_BURST",
        "current_km": 192.4,
        "track_obstructed": True,
        "relief_loco_required": True,
        "details": "Engine stalled between Sasni and Mandrak."
    }
    inc_res = client.post(f"/api/v1/blocks/{block_id}/report-incident", json=incident_payload)
    assert inc_res.status_code == 200
    inc_data = inc_res.json()
    assert inc_data["status"] == "MACHINE_STRANDED_OBSTRUCTION"
    assert inc_data["caution_order_issued"] is True
    assert "CSM_02 stalled at Km 192.4" in inc_data["controller_remarks"]
    assert "RELIEF LOCO DISPATCH REQUESTED" in inc_data["controller_remarks"]


def test_re_evaluate_block_delay_encroachment(client):
    """
    Verify dynamic G&SR delay re-evaluation detecting train encroachment
    into a scheduled maintenance block.
    """
    now = datetime.datetime.utcnow().replace(hour=10, minute=0, second=0, microsecond=0)
    b_res = client.post("/api/v1/blocks", json={
        "block_code": "TEST-ENCROACH-BLOCK",
        "title": "Signal Interlocking Work",
        "track_section_id": "NCR-GZB-TDL-UP",
        "line": "UP",
        "start_km": 120.0,
        "end_km": 125.0,
        "time_window_start": now.isoformat(), # 10:00
        "time_window_end": (now + timedelta(minutes=90)).isoformat(), # 11:30
        "duration_minutes": 90,
        "primary_department": "S&T"
    })
    block_id = b_res.json()["id"]

    # Preceding train scheduled at 08:30 (510 min) runs 95 min late -> arrives at 10:05 (605 min)
    # Block is 600 - 690 min. 605 min is inside the block window!
    eval_res = client.post(
        f"/api/v1/blocks/{block_id}/re-evaluate-delay",
        params={
            "train_number": "12004",
            "delay_minutes": 95,
            "scheduled_entry_minute": 510
        }
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["has_conflict"] is True
    assert eval_data["severity"] == "CRITICAL"
    assert eval_data["recommended_action"] == "ABORT_OR_CONTRACT_BLOCK"
