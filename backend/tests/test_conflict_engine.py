"""
Dedicated Conflict Engine Tests for Samanvay-AI (SIH-26027).
Tests:
1. Kavach SIL-4 kinematic braking thresholds (9.2m and 18.0m boundaries)
2. Economic penalty calculation
3. Train starvation detection with Kavach response
4. OHE neutral section hazard detection
5. Inter-departmental bundling opportunity detection
"""

import pytest
from app.services.conflict_engine import (
    conflict_engine,
    SpatialTemporalConflictEngine,
    KAVACH_EMERGENCY_BRAKE_GAP_M,
    KAVACH_CAUTION_DECELERATION_GAP_M,
)


class TestKavachSIL4Emulation:
    """Verify Kavach ATP gap-based braking thresholds per RDSO spec."""

    def test_emergency_brake_within_9_2m(self):
        """Gap ≤ 9.2m → EMERGENCY_BRAKE_APPLICATION, target speed 0."""
        response = SpatialTemporalConflictEngine.compute_kavach_response(
            gap_km=0.005,  # 5 meters
            train_speed_kmph=130.0,
        )
        assert response["mode"] == "EMERGENCY_BRAKE_APPLICATION"
        assert response["target_speed_kmph"] == 0
        assert response["braking_severity"] == "SIL-4_FULL_SERVICE"
        assert response["gap_meters"] == 5.0

    def test_emergency_brake_at_boundary(self):
        """Gap exactly at 9.2m → still EMERGENCY_BRAKE."""
        response = SpatialTemporalConflictEngine.compute_kavach_response(
            gap_km=0.0092,  # 9.2 meters
            train_speed_kmph=130.0,
        )
        assert response["mode"] == "EMERGENCY_BRAKE_APPLICATION"
        assert response["target_speed_kmph"] == 0

    def test_caution_deceleration_zone(self):
        """9.2m < Gap ≤ 18.0m → CAUTION_DECELERATION with reduced speed."""
        response = SpatialTemporalConflictEngine.compute_kavach_response(
            gap_km=0.014,  # 14 meters (between 9.2 and 18.0)
            train_speed_kmph=130.0,
        )
        assert response["mode"] == "CAUTION_DECELERATION"
        assert response["braking_severity"] == "SIL-4_SERVICE_BRAKE"
        assert 0 < response["target_speed_kmph"] < 130.0

    def test_caution_at_18m_boundary(self):
        """Gap exactly at 18.0m → CAUTION_DECELERATION (inclusive boundary)."""
        response = SpatialTemporalConflictEngine.compute_kavach_response(
            gap_km=0.018,  # 18.0 meters
            train_speed_kmph=130.0,
        )
        assert response["mode"] == "CAUTION_DECELERATION"

    def test_clear_headway_beyond_18m(self):
        """Gap > 18.0m → CLEAR_HEADWAY, authorized section speed."""
        response = SpatialTemporalConflictEngine.compute_kavach_response(
            gap_km=0.050,  # 50 meters
            train_speed_kmph=130.0,
        )
        assert response["mode"] == "CLEAR_HEADWAY"
        assert response["target_speed_kmph"] == 130.0
        assert response["braking_severity"] == "NONE"

    def test_large_gap_clear(self):
        """Multi-km gap → definitely CLEAR_HEADWAY."""
        response = SpatialTemporalConflictEngine.compute_kavach_response(
            gap_km=5.0,  # 5 km
            train_speed_kmph=130.0,
        )
        assert response["mode"] == "CLEAR_HEADWAY"
        assert response["gap_meters"] == 5000.0


class TestEconomicPenaltyCalculation:
    """Verify economic penalty computation per train priority."""

    def test_vip_train_high_penalty(self):
        """VIP/Premium trains incur ₹0.35 Lakhs/min penalty."""
        econ = SpatialTemporalConflictEngine.compute_economic_penalty(
            delay_mins=30.0,
            train_priority="VIP_PREMIUM",
            train_id="22436",
        )
        assert econ["affected_passengers"] == 850
        assert econ["economic_penalty_lakhs"] == 10.5  # 30 * 0.35
        assert econ["penalty_rate_per_min_lakhs"] == 0.35

    def test_freight_low_penalty(self):
        """Freight trains incur ₹0.05 Lakhs/min penalty."""
        econ = SpatialTemporalConflictEngine.compute_economic_penalty(
            delay_mins=60.0,
            train_priority="FREIGHT",
            train_id="BOXN_701",
        )
        assert econ["affected_passengers"] == 0
        assert econ["economic_penalty_lakhs"] == 3.0  # 60 * 0.05

    def test_express_standard_penalty(self):
        """Express trains incur ₹0.12 Lakhs/min penalty."""
        econ = SpatialTemporalConflictEngine.compute_economic_penalty(
            delay_mins=45.0,
            train_priority="EXPRESS",
            train_id="12004",
        )
        assert econ["economic_penalty_lakhs"] == 5.4  # 45 * 0.12


class TestTrainStarvationDetection:
    """Verify spatial-temporal collision detection with Kavach responses."""

    def test_detect_collision_with_vande_bharat(self):
        """Propose a block overlapping Vande Bharat trajectory → should flag TRAIN_STARVATION."""
        test_blocks = [
            {
                "id": "BLK-VB-TEST",
                "department": "TMS",
                "activity_type": "TAMPING",
                "line_type": "DN_MAIN",
                "direction": "DN",
                "start_km": 126.0,
                "end_km": 130.0,
                "start_minute": 430,  # Vande Bharat at ALJN ~min 435
                "duration_minutes": 90,
                "machinery_deployed": "CSM",
                "track_type": "MAIN_LINE",
                "weather_condition": "CLEAR",
            }
        ]
        report = conflict_engine.detect_conflicts(test_blocks)
        conflicts = report["conflicts"]
        conflict_types = [c["type"] for c in conflicts]
        assert "TRAIN_STARVATION" in conflict_types

        # Each starvation conflict should have kavach_response and economic_impact
        starvation = [c for c in conflicts if c["type"] == "TRAIN_STARVATION"]
        for s in starvation:
            assert s["kavach_response"] is not None
            assert s["kavach_response"]["mode"] in (
                "EMERGENCY_BRAKE_APPLICATION",
                "CAUTION_DECELERATION",
                "CLEAR_HEADWAY",
            )
            assert s["economic_impact"] is not None
            assert s["economic_impact"]["economic_penalty_lakhs"] >= 0

    def test_summary_contains_economic_metrics(self):
        """Report summary should include total economic penalty and affected passengers."""
        test_blocks = [
            {
                "id": "BLK-ECON-TEST",
                "department": "TMS",
                "activity_type": "TAMPING",
                "line_type": "DN_MAIN",
                "direction": "DN",
                "start_km": 100.0,
                "end_km": 110.0,
                "start_minute": 400,
                "duration_minutes": 120,
                "machinery_deployed": "CSM",
                "track_type": "MAIN_LINE",
                "weather_condition": "CLEAR",
            }
        ]
        report = conflict_engine.detect_conflicts(test_blocks)
        summary = report["summary"]
        assert "total_economic_penalty_lakhs" in summary
        assert "total_affected_passengers" in summary


class TestOHENeutralSectionHazard:
    """Verify OHE elementary section hazard detection."""

    def test_ohe_block_triggers_neutral_section_hazard(self):
        """TDMS block on ES-GZB-TDL-04 during train transit → OHE_NEUTRAL_SECTION_HAZARD."""
        ohe_block = {
            "id": "BLK-OHE-NS-TEST",
            "department": "TDMS",
            "activity_type": "OHE_INSPECTION",
            "line_type": "DN_MAIN",
            "direction": "DN",
            "start_km": 88.5,
            "end_km": 90.0,
            "start_minute": 390,
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
        # Should have Kavach and economic impact
        assert ohe_hazard["kavach_response"] is not None
        assert ohe_hazard["economic_impact"] is not None


class TestInterDepartmentalBundling:
    """Verify bundling opportunity detection between departments."""

    def test_adjacent_blocks_flagged_as_bundling_opportunity(self):
        """Two blocks within 10 km from different departments → INTER_DEPARTMENTAL_OVERLAP."""
        blocks = [
            {
                "id": "TMS-BND-1",
                "department": "TMS",
                "activity_type": "TAMPING",
                "line_type": "UP_MAIN",
                "direction": "UP",
                "start_km": 126.0,
                "end_km": 131.0,
                "start_minute": 450,
                "duration_minutes": 120,
                "machinery_deployed": "CSM",
                "track_type": "MAIN_LINE",
                "weather_condition": "CLEAR",
            },
            {
                "id": "SMMS-BND-1",
                "department": "SMMS",
                "activity_type": "POINT_OVERHAUL",
                "line_type": "UP_MAIN",
                "direction": "UP",
                "start_km": 128.0,
                "end_km": 129.0,
                "start_minute": 500,
                "duration_minutes": 90,
                "machinery_deployed": "MANUAL_GANG",
                "track_type": "MAIN_LINE",
                "weather_condition": "CLEAR",
            },
        ]

        report = conflict_engine.detect_conflicts(blocks)
        conflict_types = [c["type"] for c in report["conflicts"]]
        assert "INTER_DEPARTMENTAL_OVERLAP" in conflict_types
        assert len(report["bundling_opportunities"]) > 0

        opp = report["bundling_opportunities"][0]
        assert opp["synergy_type"] == "MEGA_SHADOW_BLOCK"
        assert opp["distance_km"] <= 10.0
