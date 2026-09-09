"""
Pydantic schemas for live telemetry, weather, and real-time operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TrainPositionDTO(BaseModel):
    """Real-time train position on the corridor."""
    train_number: str
    train_name: str
    current_km: float
    latitude: float
    longitude: float
    speed_kmph: float = 0.0
    delay_minutes: int = 0
    status: str = "ON_TIME"
    direction: str = "UP"
    next_station: Optional[str] = None
    eta_next_station: Optional[str] = None


class RailHazards(BaseModel):
    """Rail-specific environmental hazard assessments."""
    track_buckling_risk: str = "LOW"
    fog_risk_level: str = "NONE"
    ohe_wire_sag_risk: str = "LOW"
    monsoon_flood_risk: str = "NONE"


class WeatherAlertDTO(BaseModel):
    """Corridor weather snapshot with rail-specific hazards."""
    ambient_temp_c: float
    humidity_pct: float = 50.0
    estimated_rail_temp_c: float
    wind_speed_kmph: float = 0.0
    visibility_km: float = 10.0
    condition: str = "CLEAR"
    rail_hazards: RailHazards = Field(default_factory=RailHazards)
    updated_at: Optional[datetime] = None


class KavachResponseDTO(BaseModel):
    """Kavach SIL-4 ATP response for a specific train-block interaction."""
    mode: str
    gap_meters: float
    target_speed_kmph: float
    current_speed_kmph: float
    braking_severity: str
    description: str


class LiveConflictAlert(BaseModel):
    """A real-time conflict alert for the control room dashboard."""
    alert_id: str
    level: str  # CRITICAL_BURST, WARNING_BURST_IMMINENT, WARNING_ENCROACHMENT
    block_id: str
    block_code: str
    message: str
    recommended_action: str
    timestamp: str
    train_number: Optional[str] = None
    train_name: Optional[str] = None


class TelemetrySnapshot(BaseModel):
    """Unified live operations snapshot for the control room."""
    timestamp: datetime
    corridor: str = "Ghaziabad - Kanpur Main Line (NCR)"
    active_blocks_count: int = 0
    weather: WeatherAlertDTO
    trains: List[TrainPositionDTO]
    conflicts: List[LiveConflictAlert] = Field(default_factory=list)
