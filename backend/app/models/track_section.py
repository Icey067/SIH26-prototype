from sqlalchemy import Column, String, Float, Integer, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class TrackSection(Base):
    __tablename__ = "track_sections"

    id = Column(String(50), primary_key=True, index=True) # e.g. "NCR-GZB-TDL-UP"
    division = Column(String(50), nullable=False, index=True) # e.g. "Prayagraj (NCR)"
    section_name = Column(String(100), nullable=False) # e.g. "Ghaziabad - Tundla"
    line_type = Column(String(20), nullable=False) # "UP", "DOWN", "3RD", "4TH"
    start_km = Column(Float, nullable=False) # e.g. 15.0
    end_km = Column(Float, nullable=False) # e.g. 205.0
    station_start = Column(String(50), nullable=False) # "GZB"
    station_end = Column(String(50), nullable=False) # "TDL"
    max_permissible_speed = Column(Integer, default=130) # 130 km/h or 160 km/h (Mission Raftaar)
    is_electrified = Column(Boolean, default=True)
    ohe_voltage_kv = Column(Float, default=25.0)

    # Relationships
    defects = relationship("Defect", back_populates="track_section")
    blocks = relationship("MaintenanceBlock", back_populates="track_section")
    train_schedules = relationship("TrainSchedule", back_populates="track_section")
