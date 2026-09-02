from pydantic import BaseModel, Field
from typing import Optional
from datetime import time

class TrainScheduleBase(BaseModel):
    train_number: str = Field(..., example="12004")
    train_name: str = Field(..., example="Lucknow Swarna Shatabdi")
    train_type: str = Field(..., example="SUPERFAST")
    priority_rank: int = Field(default=3, ge=1, le=5)
    track_section_id: str = Field(..., example="NCR-GZB-TDL-UP")
    line: str = Field(default="UP")
    origin_station: str = Field(..., example="NDLS")
    destination_station: str = Field(..., example="LKO")
    entry_time: time
    exit_time: time
    transit_duration_minutes: int
    day_of_week: str = "DAILY"

class TrainScheduleCreate(TrainScheduleBase):
    id: Optional[str] = None

class TrainScheduleOut(TrainScheduleBase):
    id: str

    class Config:
        from_attributes = True

class TimetableGap(BaseModel):
    track_section_id: str
    line: str
    gap_start: time
    gap_end: time
    duration_minutes: int
    preceding_train: Optional[str] = None
    following_train: Optional[str] = None
    corridor_capacity_status: str # "HIGH_AVAILABILITY", "MEDIUM", "CONGESTED"
