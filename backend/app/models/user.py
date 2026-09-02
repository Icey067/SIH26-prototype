import enum
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, DateTime
from datetime import datetime
from app.core.database import Base

class UserRole(str, enum.Enum):
    DISPATCHER = "DISPATCHER"
    SECTION_CONTROLLER = "SECTION_CONTROLLER"
    ENG_OFFICER = "ENG_OFFICER"
    ST_OFFICER = "ST_OFFICER"
    TRD_OFFICER = "TRD_OFFICER"
    FIELD_ENGINEER = "FIELD_ENGINEER"

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False, default="insecure_dev_hash")
    role = Column(SQLEnum(UserRole, native_enum=False), default=UserRole.FIELD_ENGINEER, nullable=False)
    department = Column(String(50), nullable=True) # "ENG", "S&T", "TRD", "OPERATING"
    division = Column(String(50), default="Prayagraj (NCR)")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
