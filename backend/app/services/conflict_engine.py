"""
Samanvay-AI: Module 3 - Dynamic Spatial-Temporal Conflict Detector
Detects train starvation/collisions, inter-departmental overlaps, and block burst hazards
across the network graph and timetable trajectories.
Includes Kavach SIL-4 kinematic emulation for gap-based braking thresholds.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.graph_network import corridor_network
from app.services.duration_predictor import duration_predictor


# ---------------------------------------------------------------------------
# Kavach SIL-4 ATP Kinematic Constants (RDSO Spec)
# ---------------------------------------------------------------------------
KAVACH_EMERGENCY_BRAKE_GAP_M = 9.2      # Gap ≤ 9.2m → full emergency stop
KAVACH_CAUTION_DECELERATION_GAP_M = 18.0  # 9.2m < Gap ≤ 18.0m → caution speed
KAVACH_CLEAR_HEADWAY_GAP_M = 18.0       # Gap > 18.0m → authorized speed

# Economic penalty constants (Indian Railways fare/revenue estimates)
PASSENGER_PENALTY_PER_MINUTE_LAKHS = 0.12  # ₹ Lakhs per minute delay for mail/express
VIP_PENALTY_PER_MINUTE_LAKHS = 0.35        # ₹ Lakhs per minute for Rajdhani/Vande Bharat
FREIGHT_PENALTY_PER_MINUTE_LAKHS = 0.05    # ₹ Lakhs per minute for freight
AVG_PASSENGERS_PER_TRAIN = {
    "VIP_PREMIUM": 850,
    "HIGH_SPEED_SUPERFAST": 1100,
    "SUPERFAST": 1200,
    "EXPRESS": 1400,
    "FREIGHT": 0,
}


class SpatialTemporalConflictEngine:
    """Detects timetable and inter-departmental track possession conflicts."""

    def __init__(self):
        self.network = corridor_network

    @staticmethod
    def compute_kavach_response(
        gap_km: float,
        train_speed_kmph: float = 130.0,
    ) -> Dict[str, Any]:
        """
        Kavach SIL-4 Kinematic Emulation.
        Evaluates the gap between a train and a maintenance possession boundary
        and determines the appropriate ATP braking response.

        Args:
            gap_km: Distance in kilometers between train and block boundary
            train_speed_kmph: Current train speed in km/h

        Returns:
            Kavach response with braking mode, target speed, and deceleration profile
        """
        gap_m = gap_km * 1000.0  # Convert to meters

        if gap_m <= KAVACH_EMERGENCY_BRAKE_GAP_M:
            return {
                "mode": "EMERGENCY_BRAKE_APPLICATION",
                "gap_meters": round(gap_m, 1),
                "target_speed_kmph": 0,
                "current_speed_kmph": train_speed_kmph,
                "braking_severity": "SIL-4_FULL_SERVICE",
                "description": (
                    f"KAVACH EMERGENCY BRAKE: Gap {gap_m:.1f}m ≤ {KAVACH_EMERGENCY_BRAKE_GAP_M}m threshold. "
                    f"Full emergency braking applied, target speed 0 km/h."
                ),
            }
        elif gap_m <= KAVACH_CAUTION_DECELERATION_GAP_M:
            # Target speed matching block clearance curve (proportional deceleration)
            ratio = (gap_m - KAVACH_EMERGENCY_BRAKE_GAP_M) / (
                KAVACH_CAUTION_DECELERATION_GAP_M - KAVACH_EMERGENCY_BRAKE_GAP_M
            )
            target_speed = round(train_speed_kmph * ratio * 0.3, 1)  # Max 30% of line speed
            return {
                "mode": "CAUTION_DECELERATION",
                "gap_meters": round(gap_m, 1),
                "target_speed_kmph": target_speed,
                "current_speed_kmph": train_speed_kmph,
                "braking_severity": "SIL-4_SERVICE_BRAKE",
                "description": (
                    f"KAVACH CAUTION: Gap {gap_m:.1f}m in caution zone "
                    f"({KAVACH_EMERGENCY_BRAKE_GAP_M}-{KAVACH_CAUTION_DECELERATION_GAP_M}m). "
                    f"Decelerating to {target_speed} km/h."
                ),
            }
        else:
            return {
                "mode": "CLEAR_HEADWAY",
                "gap_meters": round(gap_m, 1),
                "target_speed_kmph": train_speed_kmph,
                "current_speed_kmph": train_speed_kmph,
                "braking_severity": "NONE",
                "description": (
                    f"KAVACH CLEAR: Gap {gap_m:.1f}m > {KAVACH_CLEAR_HEADWAY_GAP_M}m. "
                    f"Authorized section speed {train_speed_kmph} km/h."
                ),
            }

    @staticmethod
    def compute_economic_penalty(
        delay_mins: float,
        train_priority: str = "EXPRESS",
        train_id: str = "",
    ) -> Dict[str, Any]:
        """
        Calculates delay propagation impact: affected passengers and economic
        penalty in ₹ Lakhs based on train priority category.
        """
        if train_priority in ("VIP_PREMIUM",):
            penalty_rate = VIP_PENALTY_PER_MINUTE_LAKHS
        elif train_priority in ("HIGH_SPEED_SUPERFAST", "SUPERFAST"):
            penalty_rate = PASSENGER_PENALTY_PER_MINUTE_LAKHS
        elif "FREIGHT" in train_priority:
            penalty_rate = FREIGHT_PENALTY_PER_MINUTE_LAKHS
        else:
            penalty_rate = PASSENGER_PENALTY_PER_MINUTE_LAKHS

        affected_passengers = AVG_PASSENGERS_PER_TRAIN.get(train_priority, 1000)
        economic_penalty_lakhs = round(delay_mins * penalty_rate, 2)

        return {
            "affected_passengers": affected_passengers,
            "economic_penalty_lakhs": economic_penalty_lakhs,
            "penalty_rate_per_min_lakhs": penalty_rate,
            "train_priority": train_priority,
        }

    def detect_conflicts(
        self,
        proposed_blocks: List[Dict[str, Any]],
        custom_trajectories: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Accepts proposed maintenance blocks and tests against:
        1. Train Collision / Starvation (Train needs track during block window)
        2. Inter-Departmental Overlaps (TMS, SMMS, TDMS competing for adjacent space/time)
        3. Block Burst Overrun Hazard (ML predicted duration > requested window)
        4. Kavach SIL-4 ATP braking response for each detected conflict
        5. Economic penalty computation per conflict
        """
        trajectories = custom_trajectories or self.network.get_scheduled_train_trajectories()
        conflicts = []
        bundling_opportunities = []
        total_economic_penalty_lakhs = 0.0
        total_affected_passengers = 0

        # 1. Check Block Burst Hazards & Duration Underestimation
        for b in proposed_blocks:
            req_dur = b.get("duration_minutes", 120)
            pred = duration_predictor.predict(
                department=b.get("department", "TMS"),
                activity_type=b.get("activity_type", "TAMPING"),
                track_type=b.get("track_type", "MAIN_LINE"),
                machinery_deployed=b.get("machinery_deployed", "CSM"),
                weather_condition=b.get("weather_condition", "CLEAR"),
                requested_duration_mins=req_dur,
            )

            if pred["overrun_risk_score"] > 0.60:
                conflicts.append({
                    "id": f"BURST_{b.get('id', 'BLK')}",
                    "type": "BLOCK_BURST_HAZARD",
                    "severity": "CRITICAL" if pred["overrun_risk_score"] > 0.75 else "WARNING",
                    "title": f"Block Burst Hazard on {b.get('line_type', 'Track')}",
                    "location_km": b.get("start_km", 0.0),
                    "end_km": b.get("end_km", 5.0),
                    "department": b.get("department", "TMS"),
                    "impacted_trains": [],
                    "estimated_delay_mins": round(pred["duration_discrepancy_mins"], 1),
                    "message": (
                        f"ML Model predicts {pred['predicted_duration_mins']} mins vs requested {req_dur} mins "
                        f"({int(pred['overrun_risk_score'] * 100)}% burst risk)."
                    ),
                    "recommended_action": f"Expand granted window to at least {int(pred['predicted_duration_mins'])} mins or deploy backup machinery.",
                    "kavach_response": None,
                    "economic_impact": None,
                })

        # 2. Check Train Starvation / Collisions with Kavach ATP
        for b in proposed_blocks:
            b_dir = b.get("direction", "DN")
            b_start_km = float(b.get("start_km", 0.0))
            b_end_km = float(b.get("end_km", b_start_km + 5.0))
            b_min_km = min(b_start_km, b_end_km)
            b_max_km = max(b_start_km, b_end_km)

            # Block time interval in minutes from 00:00
            b_start_min = float(b.get("start_minute", 400))
            b_end_min = float(b.get("end_minute", b_start_min + b.get("duration_minutes", 120)))
            headway_buffer = 15.0  # G&SR mandatory 15-minute safety buffer

            for train in trajectories:
                if train.get("direction") != b_dir and b.get("department") != "TDMS":
                    # TDMS (OHE) isolates both UP and DN, other depts generally isolate single track
                    continue

                pts = train.get("points", [])
                for i in range(len(pts) - 1):
                    p1 = pts[i]
                    p2 = pts[i + 1]

                    t_km_min = min(p1["km"], p2["km"])
                    t_km_max = max(p1["km"], p2["km"])

                    # Spatial overlap check
                    if not (b_max_km < t_km_min or b_min_km > t_km_max):
                        # Interpolate train traversal time through the block zone
                        t1_min = p1["minute"]
                        t2_min = p2["minute"]

                        entry_min = min(t1_min, t2_min)
                        exit_min = max(t1_min, t2_min)

                        # Temporal conflict check with safety buffer
                        if not (b_end_min + headway_buffer < entry_min or b_start_min - headway_buffer > exit_min):
                            delay_exposure = round(max(10.0, (b_end_min + headway_buffer) - entry_min), 1)

                            # Compute gap in km between train position and block boundary
                            gap_km = max(0.001, abs(b_min_km - t_km_max))
                            train_speed = train.get("max_speed_kmh", 130.0)
                            kavach = self.compute_kavach_response(gap_km, train_speed)

                            # Economic penalty
                            econ = self.compute_economic_penalty(
                                delay_mins=delay_exposure,
                                train_priority=train.get("priority", "EXPRESS"),
                                train_id=train["train_id"],
                            )
                            total_economic_penalty_lakhs += econ["economic_penalty_lakhs"]
                            total_affected_passengers += econ["affected_passengers"]

                            conflicts.append({
                                "id": f"TRAIN_CONFLICT_{train['train_id']}_{b.get('id', 'BLK')}",
                                "type": "TRAIN_STARVATION",
                                "severity": "CRITICAL" if train.get("weight", 5) >= 8 else "WARNING",
                                "title": f"Train Traversal Conflict: {train['name']} ({train['train_id']})",
                                "location_km": b_start_km,
                                "end_km": b_end_km,
                                "department": b.get("department", "OPERATIONS"),
                                "impacted_trains": [train["train_id"]],
                                "train_priority_weight": train.get("weight", 5),
                                "estimated_delay_mins": delay_exposure,
                                "kavach_response": kavach,
                                "economic_impact": econ,
                                "message": (
                                    f"Train {train['train_id']} ({train['name']}) scheduled to enter Km {b_start_km} "
                                    f"at minute {entry_min} during active {b.get('department')} possession ({b_start_min}-{b_end_min})."
                                ),
                                "recommended_action": f"Shift block window to natural gap after {train['name']} passes, or regulate train by {int(delay_exposure)} mins.",
                            })
                            break

        # 3. Check OHE Elementary Section (ES) Isolation & Neutral Section Hazards (G&SR Standard)
        for b in proposed_blocks:
            is_ohe = (
                b.get("department") in ("TDMS", "TRD", "TRACTION_DISTRIBUTION") or
                b.get("ohe_power_isolated", False) is True
            )
            if not is_ohe:
                continue

            b_start_km = float(b.get("start_km", 0.0))
            b_end_km = float(b.get("end_km", b_start_km + 5.0))
            mean_km = (b_start_km + b_end_km) / 2.0
            es = self.network.get_elementary_section_for_km(mean_km, b.get("direction", "UP"))

            if es:
                es_start_km = es.start_km
                es_end_km = es.end_km
                b_start_min = float(b.get("start_minute", 400))
                b_end_min = float(b.get("end_minute", b_start_min + b.get("duration_minutes", 120)))

                for train in trajectories:
                    pts = train.get("points", [])
                    for i in range(len(pts) - 1):
                        p1 = pts[i]
                        p2 = pts[i + 1]
                        t_km_min = min(p1["km"], p2["km"])
                        t_km_max = max(p1["km"], p2["km"])

                        # Spatial overlap with the full physical Elementary Section
                        if not (es_end_km < t_km_min or es_start_km > t_km_max):
                            entry_min = min(p1["minute"], p2["minute"])
                            exit_min = max(p1["minute"], p2["minute"])

                            # Temporal overlap with power cutoff window
                            if not (b_end_min < entry_min or b_start_min > exit_min):
                                neutral_info = f", Neutral Section at Km {es.neutral_section_km}" if es.neutral_section_km else ""
                                delay_est = round(max(20.0, b_end_min - entry_min), 1)

                                # Kavach and economic impact for OHE hazard
                                gap_km = max(0.001, abs(es_start_km - t_km_max))
                                kavach = self.compute_kavach_response(gap_km, 130.0)
                                econ = self.compute_economic_penalty(
                                    delay_mins=delay_est,
                                    train_priority=train.get("priority", "EXPRESS"),
                                    train_id=train["train_id"],
                                )
                                total_economic_penalty_lakhs += econ["economic_penalty_lakhs"]
                                total_affected_passengers += econ["affected_passengers"]

                                conflicts.append({
                                    "id": f"OHE_HAZARD_{train['train_id']}_{es.section_id}",
                                    "type": "OHE_NEUTRAL_SECTION_HAZARD",
                                    "severity": "CRITICAL",
                                    "title": f"OHE Neutral Section Hazard: {train['name']} ({train['train_id']})",
                                    "location_km": es_start_km,
                                    "end_km": es_end_km,
                                    "department": "TDMS",
                                    "elementary_section_id": es.section_id,
                                    "feeding_post": es.feeding_post,
                                    "isolator_id": es.isolator_id,
                                    "neutral_section_km": es.neutral_section_km,
                                    "impacted_trains": [train["train_id"]],
                                    "estimated_delay_mins": delay_est,
                                    "kavach_response": kavach,
                                    "economic_impact": econ,
                                    "message": (
                                        f"Electric locomotive on {train['name']} ({train['train_id']}) scheduled to enter "
                                        f"de-energized OHE Elementary Section {es.section_id} (Km {es_start_km:.1f} - {es_end_km:.1f}, "
                                        f"Feeding Post: {es.feeding_post}, Isolator: {es.isolator_id}{neutral_info}) "
                                        f"during 25kV power cutoff window ({b_start_min:.0f} - {b_end_min:.0f} mins)."
                                    ),
                                    "recommended_action": (
                                        f"De-energize section between Isolators {es.isolator_id}, issue Caution Order "
                                        f"for electric locos to coast or regulate at upstream junction."
                                    ),
                                })
                                break

        # 4. Check Inter-Departmental Overlaps & Bundling Synergies
        for i in range(len(proposed_blocks)):
            for j in range(i + 1, len(proposed_blocks)):
                b1 = proposed_blocks[i]
                b2 = proposed_blocks[j]

                dist_diff = abs(float(b1.get("start_km", 0.0)) - float(b2.get("start_km", 0.0)))
                t1_start = float(b1.get("start_minute", 400))
                t2_start = float(b2.get("start_minute", 400))
                time_diff = abs(t1_start - t2_start)

                # If within 10 km and 240 minutes, but separate
                if dist_diff <= 10.0 and time_diff <= 240.0:
                    if b1.get("department") != b2.get("department"):
                        bundling_opportunities.append({
                            "block_a_id": b1.get("id"),
                            "block_b_id": b2.get("id"),
                            "dept_a": b1.get("department"),
                            "dept_b": b2.get("department"),
                            "distance_km": round(dist_diff, 1),
                            "time_gap_mins": round(time_diff, 1),
                            "synergy_type": "MEGA_SHADOW_BLOCK",
                            "potential_savings_mins": min(b1.get("duration_minutes", 120), b2.get("duration_minutes", 120)),
                        })

                        conflicts.append({
                            "id": f"OVERLAP_{b1.get('id')}_{b2.get('id')}",
                            "type": "INTER_DEPARTMENTAL_OVERLAP",
                            "severity": "OPPORTUNITY",
                            "title": f"Bundling Opportunity: {b1.get('department')} + {b2.get('department')}",
                            "location_km": min(b1.get("start_km", 0), b2.get("start_km", 0)),
                            "end_km": max(b1.get("end_km", 5), b2.get("end_km", 5)),
                            "department": "MULTI_DEPT",
                            "impacted_trains": [],
                            "estimated_delay_mins": 0.0,
                            "kavach_response": None,
                            "economic_impact": None,
                            "message": (
                                f"Separate possession requests from {b1.get('department')} and {b2.get('department')} "
                                f"within {dist_diff} km. Can be fused into a single Mega-Window."
                            ),
                            "recommended_action": "Execute OR-Tools CP-SAT Bundler to fuse into a single shadow window.",
                        })

        total_delay_exposure = sum(c.get("estimated_delay_mins", 0.0) for c in conflicts if c["type"] == "TRAIN_STARVATION")
        critical_conflicts = [c for c in conflicts if c["severity"] == "CRITICAL"]

        return {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_conflicts": len(conflicts),
                "critical_conflicts": len(critical_conflicts),
                "total_delay_exposure_mins": round(total_delay_exposure, 1),
                "total_affected_passengers": total_affected_passengers,
                "total_economic_penalty_lakhs": round(total_economic_penalty_lakhs, 2),
                "bundling_opportunities_count": len(bundling_opportunities),
            },
            "conflicts": conflicts,
            "bundling_opportunities": bundling_opportunities,
        }


# Singleton instance
conflict_engine = SpatialTemporalConflictEngine()



