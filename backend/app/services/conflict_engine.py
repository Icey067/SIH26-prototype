"""
Samanvay-AI: Module 3 - Dynamic Spatial-Temporal Conflict Detector
Detects train starvation/collisions, inter-departmental overlaps, and block burst hazards
across the network graph and timetable trajectories.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.graph_network import corridor_network
from app.services.duration_predictor import duration_predictor


class SpatialTemporalConflictEngine:
    """Detects timetable and inter-departmental track possession conflicts."""

    def __init__(self):
        self.network = corridor_network

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
        """
        trajectories = custom_trajectories or self.network.get_scheduled_train_trajectories()
        conflicts = []
        bundling_opportunities = []

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
                })

        # 2. Check Train Starvation / Collisions
        for b in proposed_blocks:
            b_dir = b.get("direction", "DN")
            b_start_km = float(b.get("start_km", 0.0))
            b_end_km = float(b.get("end_km", b_start_km + 5.0))
            b_min_km = min(b_start_km, b_end_km)
            b_max_km = max(b_start_km, b_end_km)

            # Block time interval in minutes from 00:00
            b_start_min = float(b.get("start_minute", 400))
            b_end_min = float(b.get("end_minute", b_start_min + b.get("duration_minutes", 120)))
            headway_buffer = 12.0  # 12 minutes safety buffer

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
                                "message": (
                                    f"Train {train['train_id']} ({train['name']}) scheduled to enter Km {b_start_km} "
                                    f"at minute {entry_min} during active {b.get('department')} possession ({b_start_min}-{b_end_min})."
                                ),
                                "recommended_action": f"Shift block window to natural gap after {train['name']} passes, or regulate train by {int(delay_exposure)} mins.",
                            })
                            break

        # 3. Check Inter-Departmental Overlaps & Bundling Synergies
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
                "bundling_opportunities_count": len(bundling_opportunities),
            },
            "conflicts": conflicts,
            "bundling_opportunities": bundling_opportunities,
        }


# Singleton instance
conflict_engine = SpatialTemporalConflictEngine()
