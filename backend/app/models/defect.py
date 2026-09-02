import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class Department(str, enum.Enum):
    ENGINEERING = "ENGINEERING"
    SIGNAL_TELECOM = "SIGNAL_TELECOM"
    TRACTION_DISTRIBUTION = "TRACTION_DISTRIBUTION"

class Severity(str, enum.Enum):
    CRITICAL = "CRITICAL" # P1 - Safety risk, immediate traffic stop / severe TSR
    MAJOR = "MAJOR"       # P2 - Urgent repair within 24-48h
    MINOR = "MINOR"       # P3 - Routine maintenance

class LegacySystem(str, enum.Enum):
    TMS = "TMS"   # Track Management System
    SMMS = "SMMS" # Signal Maintenance Management System
    TDMS = "TDMS" # Traction Distribution Management System

class DefectStatus(str, enum.Enum):
    OPEN = "OPEN"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class SyncStatus(str, enum.Enum):
    WAITING_SYNC = "WAITING_SYNC"
    SYNCED = "SYNCED"
    FAILED = "FAILED"

class Defect(Base):
    __tablename__ = "defects"

    id = Column(String(50), primary_key=True, index=True) # UUID or e.g. "DEF-TMS-1049"
    title = Column(String(200), nullable=False)
    system = Column(SQLEnum(LegacySystem, native_enum=False), nullable=False, index=True)
    department = Column(SQLEnum(Department, native_enum=False), nullable=False, index=True)
    severity = Column(SQLEnum(Severity, native_enum=False), nullable=False, index=True)
    status = Column(SQLEnum(DefectStatus, native_enum=False), default=DefectStatus.OPEN, index=True)
    
    # Location
    track_section_id = Column(String(50), ForeignKey("track_sections.id"), nullable=False)
    km_marker = Column(Float, nullable=False, index=True)
    line = Column(String(20), default="UP") # "UP", "DOWN"
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Engineering & Repair Parameters
    description = Column(Text, nullable=False)
    speed_restriction_kmph = Column(Integer, nullable=True) # If TSR imposed (e.g., 30 km/h)
    estimated_repair_minutes = Column(Integer, default=60) # Expected track occupation required
    machinery_required = Column(String(100), nullable=True) # e.g. "BCM", "CSM", "TOWER_WAGON", "UNIMAT"
    criticality_score = Column(Float, default=50.0) # ML calculated (0-100)
    
    # Media & Field Sync
    has_photo = Column(Boolean, default=False)
    photo_path = Column(String(255), nullable=True)
    sync_status = Column(SQLEnum(SyncStatus, native_enum=False), default=SyncStatus.SYNCED)
    reported_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    track_section = relationship("TrackSection", back_populates="defects")
    block_associations = relationship("BlockDefectAssociation", back_populates="defect")
