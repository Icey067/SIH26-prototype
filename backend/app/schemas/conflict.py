"""
Pydantic schemas for conflict detection API responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class KavachBrakingResponse(BaseModel):
    """Kavach SIL-4 ATP kinematic braking response."""
    mode: str = Field(..., description="EMERGENCY_BRAKE_APPLICATION | CAUTION_DECELERATION | CLEAR_HEADWAY")
    gap_meters: float = Field(..., description="Distance in meters between train and block boundary")
    target_speed_kmph: float = Field(..., description="Target speed after braking")
    current_speed_kmph: float = Field(130.0, description="Current train speed before braking")
    braking_severity: str = Field("NONE", description="SIL-4_FULL_SERVICE | SIL-4_SERVICE_BRAKE | NONE")
    description: str = Field("", description="Human-readable Kavach response description")


class EconomicImpact(BaseModel):
    """Economic penalty assessment for a train delay."""
    affected_passengers: int = 0
    economic_penalty_lakhs: float = 0.0
    penalty_rate_per_min_lakhs: float = 0.0
    train_priority: str = "EXPRESS"


class SpatialTemporalConflictDTO(BaseModel):
    """A detected conflict between a maintenance block and train trajectory."""
    id: str
    type: str = Field(..., description="TRAIN_STARVATION | BLOCK_BURST_HAZARD | OHE_NEUTRAL_SECTION_HAZARD | INTER_DEPARTMENTAL_OVERLAP")
    severity: str = Field(..., description="CRITICAL | WARNING | OPPORTUNITY")
    title: str
    location_km: float
    end_km: Optional[float] = None
    department: str
    impacted_trains: List[str] = Field(default_factory=list)
    estimated_delay_mins: float = 0.0
    kavach_response: Optional[KavachBrakingResponse] = None
    economic_impact: Optional[EconomicImpact] = None
    message: str
    recommended_action: str

    # OHE-specific fields
    elementary_section_id: Optional[str] = None
    feeding_post: Optional[str] = None
    isolator_id: Optional[str] = None
    neutral_section_km: Optional[float] = None


class BundlingOpportunity(BaseModel):
    """Inter-departmental block bundling synergy opportunity."""
    block_a_id: str
    block_b_id: str
    dept_a: str
    dept_b: str
    distance_km: float
    time_gap_mins: float
    synergy_type: str = "MEGA_SHADOW_BLOCK"
    potential_savings_mins: float


class ConflictDetectionSummary(BaseModel):
    """Aggregate summary of conflict detection results."""
    total_conflicts: int = 0
    critical_conflicts: int = 0
    total_delay_exposure_mins: float = 0.0
    total_affected_passengers: int = 0
    total_economic_penalty_lakhs: float = 0.0
    bundling_opportunities_count: int = 0


class ConflictDetectionReport(BaseModel):
    """Full conflict detection report with all conflicts and bundling opportunities."""
    timestamp: datetime
    summary: ConflictDetectionSummary
    conflicts: List[SpatialTemporalConflictDTO]
    bundling_opportunities: List[BundlingOpportunity]
