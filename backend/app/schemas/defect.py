from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.common import DepartmentEnum, SeverityEnum, LegacySystemEnum, DefectStatusEnum, SyncStatusEnum

class DefectBase(BaseModel):
    title: str = Field(..., example="Weld failure crack detected at Km 142/12")
    system: LegacySystemEnum = Field(..., example=LegacySystemEnum.TMS)
    department: DepartmentEnum = Field(..., example=DepartmentEnum.ENGINEERING)
    severity: SeverityEnum = Field(..., example=SeverityEnum.CRITICAL)
    track_section_id: str = Field(..., example="NCR-GZB-TDL-UP")
    km_marker: float = Field(..., example=142.2)
    line: str = Field(default="UP")
    latitude: Optional[float] = Field(None, example=27.1767)
    longitude: Optional[float] = Field(None, example=78.0081)
    description: str = Field(..., example="USFD flaw marked with red paint. Immediate 30 kmph TSR required.")
    speed_restriction_kmph: Optional[int] = Field(None, example=30)
    estimated_repair_minutes: int = Field(default=60, example=90)
    machinery_required: Optional[str] = Field(None, example="BCM")

class DefectCreate(DefectBase):
    id: Optional[str] = None
    has_photo: bool = False
    photo_path: Optional[str] = None
    reported_by: Optional[str] = None

class DefectUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[DefectStatusEnum] = None
    severity: Optional[SeverityEnum] = None
    speed_restriction_kmph: Optional[int] = None
    estimated_repair_minutes: Optional[int] = None
    machinery_required: Optional[str] = None
    criticality_score: Optional[float] = None

class DefectOut(DefectBase):
    id: str
    status: DefectStatusEnum
    criticality_score: float
    has_photo: bool
    photo_path: Optional[str]
    sync_status: SyncStatusEnum
    reported_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
