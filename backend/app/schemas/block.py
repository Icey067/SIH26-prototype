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

class StationMasterConcurrenceRequest(BaseModel):
    station_master_private_number: str = Field(..., example="PN-SM-ALJN-4102")
    station_id: str = Field(..., example="ALJN")
    station_master_remarks: Optional[str] = Field(None, example="Point 204 clamped & padlocked. Route isolated.")

class BlockLeaseTokenOut(BaseModel):
    token: str
    block_id: str
    block_code: str
    issued_at: datetime
    expires_at: datetime
    grace_period_mins: int = 10
    status: str = "ACTIVE"
    lock_ui: bool = False

class TrafficRegulationOrder(BaseModel):
    train_held: str
    train_name: str
    loop_station: str
    loop_station_name: str
    delay_incurred_mins: int
    carved_block_mins: int
    reason: str
    regulation_type: str = "LOOP_LINE_SHUTTLE"

class EmergencyRevokeRequest(BaseModel):
    revocation_reason: str = Field(..., json_schema_extra={"example": "Approaching Breakdown Special / Medical Relief Train (MRV)"})
    private_number_cancellation: str = Field(..., json_schema_extra={"example": "PNC-SC-ALJN-9988"})
    order_caution_on_adjacent: bool = True

class MachineIncidentReportRequest(BaseModel):
    machinery_id: str = Field(..., json_schema_extra={"example": "CSM_02"})
    incident_type: str = Field("MACHINE_BREAKDOWN", json_schema_extra={"example": "HYDRAULIC_FAILURE"})
    current_km: float = Field(..., json_schema_extra={"example": 190.5})
    track_obstructed: bool = True
    relief_loco_required: bool = True
    details: Optional[str] = Field(None, json_schema_extra={"example": "Engine stalled between Sasni and Mandrak."})

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
    controller_private_number: Optional[str] = None
    station_master_private_number: Optional[str] = None
    station_master_station: Optional[str] = None
    controller_approved_at: Optional[datetime] = None
    station_master_concurred_at: Optional[datetime] = None
    safety_lease_token: Optional[str] = None
    lease_expires_at: Optional[datetime] = None
    elementary_section_id: Optional[str] = None
    private_number_cancellation: Optional[str] = None
    protocol_step: int = 0
    caution_order_issued: bool = False
    ohe_power_isolated: bool = False
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    affected_trains: Optional[str] = None
    traffic_regulation_order: Optional[str] = None
    optimization_score: float
    controller_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    defects: List[DefectSummaryInBlock] = Field(default_factory=list)

    class Config:
        from_attributes = True
