from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.common import BlockStatusEnum

class MaintenanceBlockBase(BaseModel):
    block_code: str = Field(..., example="TDL-GZB-UP-0830")
    title: str = Field(..., example="Joint Track & OHE Maintenance Window")
    track_section_id: str = Field(..., example="NCR-GZB-TDL-UP")
    line: str = Field(default="UP")
    division: str = Field(default="Prayagraj (NCR)")
    start_km: float = Field(..., example=85.0)
    end_km: float = Field(..., example=92.5)
    time_window_start: datetime
    time_window_end: datetime
    duration_minutes: int = Field(..., example=90)
    primary_department: str = Field(..., example="ENG")
    bundled_departments: str = Field(default="ENG,TRD", example="ENG,TRD,S&T")
    machinery_assigned: Optional[str] = Field(None, example="BCM, TOWER_WAGON")

class MaintenanceBlockCreate(MaintenanceBlockBase):
    id: Optional[str] = None
    defect_ids: Optional[List[str]] = Field(default_factory=list)

class MaintenanceBlockUpdate(BaseModel):
    title: Optional[str] = None
    time_window_start: Optional[datetime] = None
    time_window_end: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[BlockStatusEnum] = None
    private_number: Optional[str] = None
    private_number_cancellation: Optional[str] = None
    protocol_step: Optional[int] = None
    caution_order_issued: Optional[bool] = None
    ohe_power_isolated: Optional[bool] = None
    controller_remarks: Optional[str] = None

class BlockApprovalRequest(BaseModel):
    private_number: str = Field(..., example="PN-NCR-9942")
    controller_remarks: Optional[str] = Field(None, example="Caution order 40 kmph enforced on adjacent line.")
    caution_order_issued: bool = True
    ohe_power_isolated: bool = False

class BlockExecutionUpdate(BaseModel):
    protocol_step: int = Field(..., ge=0, le=5)
    status: Optional[BlockStatusEnum] = None
    private_number_cancellation: Optional[str] = None
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None

class DefectSummaryInBlock(BaseModel):
    id: str
    title: str
    department: str
    severity: str
    km_marker: float

class MaintenanceBlockOut(MaintenanceBlockBase):
    id: str
    status: BlockStatusEnum
    private_number: Optional[str] = None
    private_number_cancellation: Optional[str] = None
    protocol_step: int = 0
    caution_order_issued: bool = False
    ohe_power_isolated: bool = False
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    affected_trains: Optional[str] = None
    optimization_score: float
    controller_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    defects: List[DefectSummaryInBlock] = Field(default_factory=list)

    class Config:
        from_attributes = True
