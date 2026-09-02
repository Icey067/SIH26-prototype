from enum import Enum

class DepartmentEnum(str, Enum):
    ENGINEERING = "ENGINEERING"
    SIGNAL_TELECOM = "SIGNAL_TELECOM"
    TRACTION_DISTRIBUTION = "TRACTION_DISTRIBUTION"

class SeverityEnum(str, Enum):
    CRITICAL = "CRITICAL" # P1
    MAJOR = "MAJOR"       # P2
    MINOR = "MINOR"       # P3

class LegacySystemEnum(str, Enum):
    TMS = "TMS"
    SMMS = "SMMS"
    TDMS = "TDMS"

class BlockStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    UPCOMING = "UPCOMING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BURSTED = "BURSTED"
    CANCELLED = "CANCELLED"

class DefectStatusEnum(str, Enum):
    OPEN = "OPEN"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class SyncStatusEnum(str, Enum):
    WAITING_SYNC = "WAITING_SYNC"
    SYNCED = "SYNCED"
    FAILED = "FAILED"
