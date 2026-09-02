from datetime import datetime
from typing import Optional
from app.models.defect import Defect, Severity, LegacySystem

class DefectScorer:
    """
    ML/Heuristic Criticality Engine for Indian Railways infrastructure defects.
    Produces a composite Risk & Priority Index from 0 to 100.
    """

    @staticmethod
    def calculate_criticality(
        severity: Severity,
        system: LegacySystem,
        speed_restriction_kmph: Optional[int] = None,
        estimated_repair_minutes: int = 60,
        age_days: int = 0
    ) -> float:
        score = 0.0

        # 1. Base Severity Weight (Max 50 pts)
        if severity == Severity.CRITICAL:
            score += 50.0
        elif severity == Severity.MAJOR:
            score += 30.0
        else:
            score += 12.0

        # 2. Operational Impact: Temporary Speed Restriction (TSR) Penalty (Max 25 pts)
        # Severe speed restrictions on 130 km/h trunk routes severely burst line capacity
        if speed_restriction_kmph is not None:
            if speed_restriction_kmph <= 30:
                score += 25.0
            elif speed_restriction_kmph <= 50:
                score += 18.0
            elif speed_restriction_kmph <= 75:
                score += 10.0
            else:
                score += 5.0

        # 3. Legacy System Failure Hazard (Max 15 pts)
        # Rail fractures / weld cracks (TMS) carry direct derailment hazards
        if system == LegacySystem.TMS:
            score += 15.0
        elif system == LegacySystem.SMMS:
            # Signal failure triggers red aspect, halting trains
            score += 12.0
        elif system == LegacySystem.TDMS:
            # OHE tripping affects entire sub-sector
            score += 10.0

        # 4. Aging Penalty (Max 10 pts)
        # Backlog age penalty (+1 point per 2 days up to 10)
        age_penalty = min(10.0, age_days * 0.5)
        score += age_penalty

        return round(min(100.0, max(0.0, score)), 2)

    @classmethod
    def score_defect_instance(cls, defect: Defect) -> float:
        age_days = 0
        if defect.created_at:
            delta = datetime.utcnow() - defect.created_at
            age_days = delta.days

        return cls.calculate_criticality(
            severity=defect.severity,
            system=defect.system,
            speed_restriction_kmph=defect.speed_restriction_kmph,
            estimated_repair_minutes=defect.estimated_repair_minutes,
            age_days=age_days
        )
