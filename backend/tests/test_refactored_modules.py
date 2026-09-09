"""
Unit Tests for Module 1 (Graph), Module 2 (ML Duration), Module 3 (Conflict Detector),
and Module 4 (OR-Tools CP-SAT Optimizer).
"""

import pytest
from app.services.graph_network import corridor_network
from app.services.duration_predictor import duration_predictor
from app.services.conflict_engine import conflict_engine
from app.services.block_optimizer import BlockOptimizer
from app.models.defect import Defect, Department, Severity, DefectStatus


def test_network_graph_topology():
    """Verify directed multigraph stations, edges, and trajectories."""
    topo = corridor_network.get_topology_dict()
    assert topo["total_length_km"] == 440.0
    assert len(topo["nodes"]) == 12
    assert topo["nodes"][0]["id"] == "GZB"
    assert topo["nodes"][-1]["id"] == "CNB"

    # Check edges exist for UP and DN
    edges = topo["edges"]
    assert any(e["direction"] == "DN" for e in edges)
    assert any(e["direction"] == "UP" for e in edges)

    # Check trajectories
    trajs = corridor_network.get_scheduled_train_trajectories()
    assert len(trajs) >= 5
    vb = next(t for t in trajs if t["train_id"] == "22436")
    assert vb["name"] == "Vande Bharat Express"
    assert vb["weight"] == 10


def test_duration_predictor_inference():
    """Verify Scikit-Learn RandomForest duration prediction and risk scoring."""
    res = duration_predictor.predict(
        department="TMS",
        activity_type="DEEP_SCREENING",
        track_type="MAIN_LINE",
        machinery_deployed="BCM",
        weather_condition="CLEAR",
        requested_duration_mins=180,
    )
    assert "predicted_duration_mins" in res
    assert res["predicted_duration_mins"] > 0
    assert 0.0 <= res["overrun_risk_score"] <= 1.0
    assert res["risk_level"] in ["LOW", "MODERATE", "CRITICAL"]
    assert "recommendation" in res


def test_conflict_engine_detection():
    """Verify spatial-temporal collision and inter-departmental overlap detection."""
    # Propose 2 blocks: one overlapping with Vande Bharat at Km 126
    # and another from SMMS at Km 128 (within 5 km bundling threshold)
    test_blocks = [
        {
            "id": "TMS-TEST-1",
            "department": "TMS",
            "activity_type": "TAMPING",
            "line_type": "DN_MAIN",
            "direction": "DN",
            "start_km": 126.0,
            "end_km": 130.0,
            "start_minute": 430,  # Vande Bharat is at ALJN at min 435!
            "duration_minutes": 90,
            "machinery_deployed": "CSM",
            "track_type": "MAIN_LINE",
            "weather_condition": "CLEAR",
        },
        {
            "id": "SMMS-TEST-1",
            "department": "SMMS",
            "activity_type": "POINT_OVERHAUL",
            "line_type": "DN_MAIN",
            "direction": "DN",
            "start_km": 128.0,
            "end_km": 129.0,
            "start_minute": 450,
            "duration_minutes": 60,
            "machinery_deployed": "MANUAL_GANG",
            "track_type": "MAIN_LINE",
            "weather_condition": "CLEAR",
        }
    ]

    report = conflict_engine.detect_conflicts(test_blocks)
    assert report["summary"]["total_conflicts"] > 0
    # Must detect Train Starvation for Vande Bharat (22436)
    conflict_types = [c["type"] for c in report["conflicts"]]
    assert "TRAIN_STARVATION" in conflict_types
    # Must detect Inter-Departmental Bundling Opportunity
    assert "INTER_DEPARTMENTAL_OVERLAP" in conflict_types
    assert len(report["bundling_opportunities"]) > 0


def test_block_optimizer_proximity_bundling():
    """Verify OR-Tools bundles defects within distance <= 5 km."""
    d1 = Defect(
        id="D-1",
        title="Rail Joint Fracture",
        department=Department.ENGINEERING,
        severity=Severity.CRITICAL,
        km_marker=88.2,
        line="UP",
        track_section_id="NCR-GZB-TDL-UP",
        status=DefectStatus.OPEN,
        estimated_repair_minutes=90,
        criticality_score=92.0,
    )
    d2 = Defect(
        id="D-2",
        title="Signal Point 204 Flutter",
        department=Department.SIGNAL_TELECOM,
        severity=Severity.MAJOR,
        km_marker=89.5,
        line="UP",
        track_section_id="NCR-GZB-TDL-UP",
        status=DefectStatus.OPEN,
        estimated_repair_minutes=60,
        criticality_score=80.0,
    )

    optimizer = BlockOptimizer(section_id="NCR-GZB-TDL-UP", line="UP")
    bundles = optimizer.bundle_defects_by_proximity([d1, d2], max_distance_km=5.0)
    assert len(bundles) == 1
    assert len(bundles[0]) == 2
