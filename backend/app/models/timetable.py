import enum
from datetime import datetime, time
from sqlalchemy import Column, String, Integer, Time, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class TrainType(str, enum.Enum):
    RAJDHANI = "RAJDHANI"           # Priority 1 (VIP)
    VANDE_BHARAT = "VANDE_BHARAT"   # Priority 1 (Semi-High Speed)
    SUPERFAST = "SUPERFAST"         # Priority 2
    MAIL_EXPRESS = "MAIL_EXPRESS"   # Priority 3
    PASSENGER = "PASSENGER"         # Priority 4
    FREIGHT_CONTAINER = "FREIGHT"   # Priority 5
    FREIGHT_COAL = "FREIGHT_COAL"   # Priority 5

class TrainSchedule(Base):
    __tablename__ = "train_schedules"

    id = Column(String(50), primary_key=True, index=True) # e.g. "SCH-12004"
    train_number = Column(String(10), nullable=False, index=True) # e.g. "12004"
    train_name = Column(String(100), nullable=False) # e.g. "Lucknow Swarna Shatabdi"
    train_type = Column(SQLEnum(TrainType, native_enum=False), nullable=False)
    priority_rank = Column(Integer, default=3) # 1 (highest) to 5 (lowest)
    
    # Corridor Slot
    track_section_id = Column(String(50), ForeignKey("track_sections.id"), nullable=False)
    line = Column(String(20), default="UP") # "UP" or "DOWN"
    origin_station = Column(String(50), nullable=False)
    destination_station = Column(String(50), nullable=False)
    
    # Section transit timing
    entry_time = Column(Time, nullable=False) # Time train enters this section
    exit_time = Column(Time, nullable=False)  # Time train exits this section
    transit_duration_minutes = Column(Integer, nullable=False)
    day_of_week = Column(String(20), default="DAILY") # "DAILY", "MON", "TUE", etc.

    # Relationships
    track_section = relationship("TrackSection", back_populates="train_schedules")
