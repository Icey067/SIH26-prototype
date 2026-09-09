"""
Samanvay-AI: Conflict Alert & Resolution Models
Persists detected spatial-temporal conflicts for audit trail and historical analysis.
"""

import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Text, Enum as SqlEnum
from enum import Enum
from app.core.database import Base


class ConflictType(str, Enum):
    TRAIN_STARVATION = "TRAIN_STARVATION"
    BLOCK_BURST_HAZARD = "BLOCK_BURST_HAZARD"
    OHE_NEUTRAL_SECTION_HAZARD = "OHE_NEUTRAL_SECTION_HAZARD"
    INTER_DEPARTMENTAL_OVERLAP = "INTER_DEPARTMENTAL_OVERLAP"
    MACHINE_CONFLICT = "MACHINE_CONFLICT"


class ConflictSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    OPPORTUNITY = "OPPORTUNITY"


class KavachBrakingMode(str, Enum):
    EMERGENCY_BRAKE_APPLICATION = "EMERGENCY_BRAKE_APPLICATION"
    CAUTION_DECELERATION = "CAUTION_DECELERATION"
    CLEAR_HEADWAY = "CLEAR_HEADWAY"


class ResolutionStatus(str, Enum):
    UNRESOLVED = "UNRESOLVED"
    AUTO_RESOLVED = "AUTO_RESOLVED"
    MANUALLY_RESOLVED = "MANUALLY_RESOLVED"
    ESCALATED = "ESCALATED"


class ConflictAlert(Base):
    """Persistent record of a detected spatial-temporal conflict."""
    __tablename__ = "conflict_alerts"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)
    block_id = Column(String, index=True)
    train_number = Column(String)
    location_km = Column(Float)
    end_km = Column(Float)
    department = Column(String)
    estimated_delay_mins = Column(Float, default=0.0)
    affected_passengers = Column(Integer, default=0)
    economic_penalty_lakhs = Column(Float, default=0.0)

    # Kavach SIL-4 ATP Response
    kavach_mode = Column(String)
    kavach_gap_meters = Column(Float)
    kavach_target_speed_kmph = Column(Float)

    # Elementary Section context (OHE conflicts)
    elementary_section_id = Column(String)
    feeding_post = Column(String)
    isolator_id = Column(String)
    neutral_section_km = Column(Float)

    # Resolution tracking
    resolution_status = Column(String, default="UNRESOLVED")
    resolution_notes = Column(Text)
    resolved_at = Column(DateTime)
    resolved_by = Column(String)

    message = Column(Text)
    recommended_action = Column(Text)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
