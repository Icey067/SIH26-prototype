from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

# Mobile Downstream Models (Exact parity with gov.railways.ironsentinel.data.model)
class MobileBlockSchedule(BaseModel):
    id: str
    blockCode: str
    startKm: str
    endKm: str
    line: str
    division: str
    timeWindow: str # e.g. "08:30 - 10:00"
    status: str     # "PENDING", "IN_PROGRESS", "UPCOMING", "COMPLETED"
    privateNumber: Optional[str] = None
    remainingSeconds: int = 5400
    protocolStep: int = 0

class MobileDefectLog(BaseModel):
    id: str
    title: str
    system: str     # "TMS", "SMMS", "TDMS"
    severity: str   # "CRITICAL", "MAJOR", "MINOR"
    latitude: float
    longitude: float
    description: str
    hasPhoto: bool = False
    photoPath: Optional[str] = None
    timestamp: int
    syncStatus: str = "SYNCED"

class ActiveTSR(BaseModel):
    section: str
    startKm: float
    endKm: float
    speedKmph: int
    reason: str

class DownstreamSyncResponse(BaseModel):
    serverTime: int
    division: str
    corridor: str
    blocks: List[MobileBlockSchedule]
    defects: List[MobileDefectLog]
    activeTSRs: List[ActiveTSR]

# Upstream Sync Models
class SyncQueueItemPayload(BaseModel):
    id: str
    title: str
    category: str # "defect", "demand", "inspection", "block_update"
    timestamp: int
    payloadJson: str

class UpstreamSyncRequest(BaseModel):
    clientId: str = Field(default="IRONSENTINEL-FIELD-APP")
    items: List[SyncQueueItemPayload]

class UpstreamSyncResponse(BaseModel):
    receivedCount: int
    processedCount: int
    failedCount: int
    syncedIds: List[str]
    errors: List[str] = Field(default_factory=list)
