from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.schemas.defect import DefectOut
from app.schemas.block import MaintenanceBlockOut

class DownstreamSyncResponse(BaseModel):
    server_time: datetime
    division: str
    corridor: str
    active_blocks: List[MaintenanceBlockOut]
    open_defects: List[DefectOut]
    active_tsrs: List[Dict[str, Any]]
    sync_token: str

class UpstreamDefectReport(BaseModel):
    client_temp_id: str
    title: str
    system: str
    department: str
    severity: str
    km_marker: float
    line: str = "UP"
    description: str
    speed_restriction_kmph: Optional[int] = None
    estimated_repair_minutes: int = 60
    machinery_required: Optional[str] = None
    reported_by: Optional[str] = None

class UpstreamSyncRequest(BaseModel):
    device_id: str
    last_sync_timestamp: Optional[datetime] = None
    new_defects: List[UpstreamDefectReport] = Field(default_factory=list)
    block_step_updates: List[Dict[str, Any]] = Field(default_factory=list)

class UpstreamSyncResponse(BaseModel):
    status: str = "SUCCESS"
    synced_at: datetime
    processed_defects: int
    processed_updates: int
    created_defect_ids: Dict[str, str] # map client_temp_id -> server_id

class LeaseVerificationRequest(BaseModel):
    block_id: str
    token: Optional[str] = None

class LeaseVerificationResponse(BaseModel):
    block_id: str
    status: str # ACTIVE, SAFETY_TIMEOUT_SUSPENDED, EXPIRED, NOT_FOUND
    is_valid: bool
    is_expired: bool
    seconds_remaining: float
    expires_at: Optional[datetime]
    lock_ui: bool
    audible_warning: bool
    reason: str
