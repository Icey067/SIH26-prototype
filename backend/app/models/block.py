import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class BlockStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    UPCOMING = "UPCOMING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BURSTED = "BURSTED"     # Block overrun beyond granted time window
    CANCELLED = "CANCELLED"

class MaintenanceBlock(Base):
    __tablename__ = "maintenance_blocks"

    id = Column(String(50), primary_key=True, index=True) # e.g. "BLK-NCR-2026-001"
    block_code = Column(String(50), unique=True, index=True, nullable=False) # "TDL-GZB-UP-0830"
    title = Column(String(200), nullable=False)
    
    # Corridor & Track
    track_section_id = Column(String(50), ForeignKey("track_sections.id"), nullable=False)
    line = Column(String(20), default="UP")
    division = Column(String(50), default="Prayagraj (NCR)")
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    
    # Timing
    time_window_start = Column(DateTime, nullable=False)
    time_window_end = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False) # e.g., 90 mins
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    
    # Bundling & Departments
    primary_department = Column(String(50), nullable=False) # "ENG", "S&T", or "TRD"
    bundled_departments = Column(String(100), default="ENG") # "ENG,S&T,TRD"
    machinery_assigned = Column(String(255), nullable=True) # "BCM, TOWER_WAGON"
    
    # Operational & Safety Protocols
    status = Column(SQLEnum(BlockStatus, native_enum=False), default=BlockStatus.PENDING, index=True)
    private_number = Column(String(50), nullable=True) # PTW / Private Number granted by Section Controller
    private_number_cancellation = Column(String(50), nullable=True) # Return PN on block clearance
    protocol_step = Column(Integer, default=0) # 0: Requested, 1: Caution Order Issued, 2: Traffic Stopped, 3: OHE Isolated, 4: Work In Progress, 5: Reconnected & Cleared
    caution_order_issued = Column(Boolean, default=False)
    ohe_power_isolated = Column(Boolean, default=False)
    
    # Conflict & Timetable Impact
    affected_trains = Column(Text, nullable=True) # JSON list or comma-separated train numbers delayed/regulated
    optimization_score = Column(Float, default=100.0)
    controller_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    track_section = relationship("TrackSection", back_populates="blocks")
    defects = relationship("BlockDefectAssociation", back_populates="block")

class BlockDefectAssociation(Base):
    __tablename__ = "block_defect_associations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    block_id = Column(String(50), ForeignKey("maintenance_blocks.id"), nullable=False)
    defect_id = Column(String(50), ForeignKey("defects.id"), nullable=False)
    resolved_in_this_block = Column(Boolean, default=False)

    block = relationship("MaintenanceBlock", back_populates="defects")
    defect = relationship("Defect", back_populates="block_associations")
