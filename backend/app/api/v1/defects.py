import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.defect import Defect, LegacySystem, Department, Severity, DefectStatus, SyncStatus
from app.schemas.defect import DefectCreate, DefectUpdate, DefectOut
from app.services.defect_scorer import DefectScorer
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/defects", tags=["Defects (TMS, SMMS, TDMS)"])

class AIParsedDefectRequest(BaseModel):
    raw_text: str = Field(..., example="Aligarh ke paas switch point 204 me relay flutter ho rahi hai aur contact wire loose hai. 30 ka TSR lagana padega.")
    track_section_id: str = "NCR-GZB-TDL-UP"
    auto_create: bool = False
    reported_by: Optional[str] = "FIELD_VOICE_REPORT"

class AIParsedDefectResponse(BaseModel):
    raw_text: str
    structured_data: Dict[str, Any]
    created_defect: Optional[DefectOut] = None

@router.post("/ai-parse", response_model=AIParsedDefectResponse)
async def ai_parse_defect_report(payload: AIParsedDefectRequest, db: Session = Depends(get_db)):
    """
    Uses Google Gemini Pro to parse noisy, unformatted field engineer reports
    (English, Hindi, or Hinglish) into structured TMS, SMMS, or TDMS records.
    """
    structured = await GeminiService.parse_field_report(payload.raw_text)

    created_record = None
    if payload.auto_create:
        system_val = structured.get("system", "TMS")
        dept_val = structured.get("department", "ENGINEERING")
        sev_val = structured.get("severity", "MAJOR")

        sys_enum = LegacySystem(system_val) if system_val in LegacySystem.__members__ else LegacySystem.TMS
        dept_enum = Department(dept_val) if dept_val in Department.__members__ else Department.ENGINEERING
        sev_enum = Severity(sev_val) if sev_val in Severity.__members__ else Severity.MAJOR

        defect_create_payload = DefectCreate(
            title=structured.get("title", "AI Parsed Field Defect"),
            system=sys_enum,
            department=dept_enum,
            severity=sev_enum,
            track_section_id=payload.track_section_id,
            km_marker=float(structured.get("km_marker", 88.0)),
            line=structured.get("line", "UP"),
            description=f"{payload.raw_text}\n\n[AI Root Cause]: {structured.get('root_cause_analysis', '')}\n[Safety Precaution]: {structured.get('safety_precaution', '')}",
            speed_restriction_kmph=structured.get("speed_restriction_kmph"),
            estimated_repair_minutes=int(structured.get("estimated_repair_minutes", 60)),
            machinery_required=structured.get("machinery_required"),
            reported_by=payload.reported_by
        )
        created_record = create_defect(defect_create_payload, db)

    return AIParsedDefectResponse(
        raw_text=payload.raw_text,
        structured_data=structured,
        created_defect=created_record
    )

@router.get("", response_model=List[DefectOut])
def list_defects(
    system: Optional[LegacySystem] = None,
    department: Optional[Department] = None,
    severity: Optional[Severity] = None,
    status: Optional[DefectStatus] = None,
    track_section_id: Optional[str] = None,
    min_criticality: Optional[float] = Query(None, ge=0, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve defect backlog with multi-parameter filtering."""
    query = db.query(Defect)
    if system:
        query = query.filter(Defect.system == system)
    if department:
        query = query.filter(Defect.department == department)
    if severity:
        query = query.filter(Defect.severity == severity)
    if status:
        query = query.filter(Defect.status == status)
    if track_section_id:
        query = query.filter(Defect.track_section_id == track_section_id)
    if min_criticality is not None:
        query = query.filter(Defect.criticality_score >= min_criticality)

    return query.order_by(Defect.criticality_score.desc()).all()

@router.post("", response_model=DefectOut, status_code=201)
def create_defect(payload: DefectCreate, db: Session = Depends(get_db)):
    """Ingest a new defect record from TMS/SMMS/TDMS or field engineer report."""
    defect_id = payload.id or f"DEF-{payload.system.value}-{uuid.uuid4().hex[:8].upper()}"

    # Verify unique ID
    existing = db.query(Defect).filter(Defect.id == defect_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Defect ID {defect_id} already exists.")

    # Calculate initial criticality score
    score = DefectScorer.calculate_criticality(
        severity=payload.severity,
        system=payload.system,
        speed_restriction_kmph=payload.speed_restriction_kmph,
        estimated_repair_minutes=payload.estimated_repair_minutes,
        age_days=0
    )

    db_defect = Defect(
        id=defect_id,
        title=payload.title,
        system=payload.system,
        department=payload.department,
        severity=payload.severity,
        status=DefectStatus.OPEN,
        track_section_id=payload.track_section_id,
        km_marker=payload.km_marker,
        line=payload.line,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
        speed_restriction_kmph=payload.speed_restriction_kmph,
        estimated_repair_minutes=payload.estimated_repair_minutes,
        machinery_required=payload.machinery_required,
        criticality_score=score,
        has_photo=payload.has_photo,
        photo_path=payload.photo_path,
        sync_status=SyncStatus.SYNCED,
        reported_by=payload.reported_by
    )

    db.add(db_defect)
    db.commit()
    db.refresh(db_defect)
    return db_defect

@router.get("/{defect_id}", response_model=DefectOut)
def get_defect(defect_id: str, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect

@router.put("/{defect_id}", response_model=DefectOut)
def update_defect(defect_id: str, payload: DefectUpdate, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(defect, key, value)

    # Re-evaluate criticality if parameters changed
    if "severity" in update_data or "speed_restriction_kmph" in update_data:
        defect.criticality_score = DefectScorer.score_defect_instance(defect)

    db.commit()
    db.refresh(defect)
    return defect

@router.delete("/{defect_id}", status_code=204)
def delete_defect(defect_id: str, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    db.delete(defect)
    db.commit()
    return None
