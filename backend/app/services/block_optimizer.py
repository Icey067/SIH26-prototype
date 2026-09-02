import datetime
from typing import List, Dict, Any, Optional
from ortools.sat.python import cp_model
from app.models.defect import Defect, Department
from app.models.timetable import TrainSchedule

class BlockOptimizer:
    """
    Constraint-based automatic maintenance block planner for Indian Railways.
    Uses Google OR-Tools CP-SAT solver to:
    1. Identify natural timetable slots (gaps between trains on the section).
    2. Bundle multi-department defects (Civil, Electrical, S&T) into the same spatial-temporal window.
    3. Minimize total train delay penalty while maximizing defect backlog resolution.
    """

    def __init__(self, section_id: str, line: str = "UP"):
        self.section_id = section_id
        self.line = line

    def find_timetable_gaps(
        self,
        trains: List[TrainSchedule],
        min_gap_minutes: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Calculates time intervals between consecutive trains on this line.
        """
        sorted_trains = sorted(trains, key=lambda t: t.entry_time)
        gaps = []

        for i in range(len(sorted_trains) - 1):
            curr_exit = sorted_trains[i].exit_time
            next_entry = sorted_trains[i+1].entry_time

            # Convert to minutes from midnight
            curr_exit_min = curr_exit.hour * 60 + curr_exit.minute
            next_entry_min = next_entry.hour * 60 + next_entry.minute

            gap_duration = next_entry_min - curr_exit_min
            if gap_duration >= min_gap_minutes:
                gaps.append({
                    "start_time": curr_exit.strftime("%H:%M"),
                    "end_time": next_entry.strftime("%H:%M"),
                    "duration_minutes": gap_duration,
                    "start_minute": curr_exit_min,
                    "end_minute": next_entry_min,
                    "preceding_train": f"{sorted_trains[i].train_number} - {sorted_trains[i].train_name}",
                    "following_train": f"{sorted_trains[i+1].train_number} - {sorted_trains[i+1].train_name}",
                })

        return gaps

    def bundle_defects(
        self,
        defects: List[Defect],
        max_distance_km: float = 10.0
    ) -> List[List[Defect]]:
        """
        Clusters pending defects along the track within spatial threshold
        so track machines (BCM/CSM/Tower Wagon) can service them simultaneously.
        """
        if not defects:
            return []

        sorted_defects = sorted(defects, key=lambda d: d.km_marker)
        bundles: List[List[Defect]] = []
        current_bundle = [sorted_defects[0]]

        for d in sorted_defects[1:]:
            if abs(d.km_marker - current_bundle[0].km_marker) <= max_distance_km:
                current_bundle.append(d)
            else:
                bundles.append(current_bundle)
                current_bundle = [d]

        if current_bundle:
            bundles.append(current_bundle)

        return bundles

    def solve_optimal_block_plan(
        self,
        candidate_defects: List[Defect],
        train_schedules: List[TrainSchedule],
        target_date: datetime.date,
        max_blocks: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Uses OR-Tools CP-SAT to select which defect bundles get scheduled into which timetable gaps.
        """
        gaps = self.find_timetable_gaps(train_schedules, min_gap_minutes=60)
        bundles = self.bundle_defects(candidate_defects, max_distance_km=8.0)

        if not gaps or not bundles:
            return []

        model = cp_model.CpModel()

        # Decision variables: x[b, g] = 1 if bundle b is assigned to gap g
        num_bundles = len(bundles)
        num_gaps = len(gaps)
        x = {}

        for b in range(num_bundles):
            for g in range(num_gaps):
                x[b, g] = model.NewBoolVar(f"bundle_{b}_gap_{g}")

        # Constraint 1: Each bundle can be assigned to at most 1 gap
        for b in range(num_bundles):
            model.Add(sum(x[b, g] for g in range(num_gaps)) <= 1)

        # Constraint 2: Each gap can host at most 1 primary block bundle
        for g in range(num_gaps):
            model.Add(sum(x[b, g] for b in range(num_bundles)) <= 1)

        # Constraint 3: Time fit - bundle duration must not exceed gap duration
        for b in range(num_bundles):
            bundle_work_time = max(d.estimated_repair_minutes for d in bundles[b])
            for g in range(num_gaps):
                if bundle_work_time > gaps[g]["duration_minutes"]:
                    model.Add(x[b, g] == 0)

        # Objective: Maximize total criticality score resolved + bonus for multi-department bundling
        objective_terms = []
        for b in range(num_bundles):
            bundle_defects = bundles[b]
            bundle_score = sum(int(d.criticality_score) for d in bundle_defects)

            # Check cross-department synergy bonus
            departments = {d.department for d in bundle_defects}
            synergy_bonus = len(departments) * 20 # Extra points for joint S&T + ENG + TRD block

            total_weight = bundle_score + synergy_bonus

            for g in range(num_gaps):
                objective_terms.append(x[b, g] * total_weight)

        model.Maximize(sum(objective_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5.0
        status = solver.Solve(model)

        planned_blocks = []
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for b in range(num_bundles):
                for g in range(num_gaps):
                    if solver.Value(x[b, g]) == 1:
                        assigned_bundle = bundles[b]
                        gap = gaps[g]

                        min_km = min(d.km_marker for d in assigned_bundle)
                        max_km = max(d.km_marker for d in assigned_bundle)
                        departments = list({d.department.value if hasattr(d.department, 'value') else str(d.department) for d in assigned_bundle})
                        machinery_set = {d.machinery_required for d in assigned_bundle if d.machinery_required}

                        # Compute datetime windows
                        start_h, start_m = map(int, gap["start_time"].split(":"))
                        end_h, end_m = map(int, gap["end_time"].split(":"))

                        dt_start = datetime.datetime.combine(target_date, datetime.time(start_h, start_m))
                        dt_end = datetime.datetime.combine(target_date, datetime.time(end_h, end_m))

                        block_code = f"{self.section_id[:6]}-{self.line}-{start_h:02d}{start_m:02d}"

                        planned_blocks.append({
                            "block_code": block_code,
                            "title": f"Bundled Block: {', '.join(departments)} ({min_km:.1f} - {max_km:.1f} Km)",
                            "track_section_id": self.section_id,
                            "line": self.line,
                            "start_km": min_km,
                            "end_km": max(max_km, min_km + 1.0),
                            "time_window_start": dt_start,
                            "time_window_end": dt_end,
                            "duration_minutes": gap["duration_minutes"],
                            "primary_department": departments[0] if departments else "ENGINEERING",
                            "bundled_departments": ",".join(departments),
                            "machinery_assigned": ", ".join(machinery_set) if machinery_set else "MANUAL_GANG",
                            "defects": assigned_bundle,
                            "optimization_score": float(solver.ObjectiveValue()),
                            "preceding_train": gap["preceding_train"],
                            "following_train": gap["following_train"]
                        })

        return planned_blocks[:max_blocks]
