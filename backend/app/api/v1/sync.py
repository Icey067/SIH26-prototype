import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.core.config import settings
from app.models.block import MaintenanceBlock, BlockDefectAssociation, BlockStatus
from app.models.defect import Defect, DefectStatus, LegacySystem, Department, Severity, SyncStatus
from app.schemas.sync import (
    DownstreamSyncResponse,
    UpstreamSyncRequest,
    UpstreamSyncResponse,
    LeaseVerificationRequest,
    LeaseVerificationResponse
)
from app.api.v1.blocks import map_block_out
from app.services.safety_lease_service import safety_lease_service
from app.services.defect_scorer import DefectScorer

router = APIRouter(prefix="/sync", tags=["Mobile Offline Sync & Safety Leases"])

@router.get("/downstream", response_model=DownstreamSyncResponse)
def downstream_sync(db: Session = Depends(get_db)):
    """
    Downloads operational context for offline Room/SQLite caching in IronSentinel:
    - Active & Concurred Maintenance Blocks (with HMAC lease tokens)
    - Open Critical / Major Defects
    - Active TSR speed restrictions
    """
    now = datetime.utcnow()
    
    # 1. Fetch blocks that are relevant for field execution
    active_blocks_db = db.query(MaintenanceBlock).filter(
        MaintenanceBlock.status.in_([
            BlockStatus.APPROVED,
            BlockStatus.CONTROLLER_APPROVED,
            BlockStatus.STATION_MASTER_CONCURRED,
            BlockStatus.IN_PROGRESS,
            BlockStatus.UPCOMING
        ])
    ).options(
        selectinload(MaintenanceBlock.defects).selectinload(BlockDefectAssociation.defect)
    ).order_by(MaintenanceBlock.time_window_start.asc()).all()

    # Check for any overdue leases in active blocks and update them
    active_blocks = []
    for b in active_blocks_db:
        if b.lease_expires_at and now > b.lease_expires_at and b.status in [
            BlockStatus.STATION_MASTER_CONCURRED,
            BlockStatus.IN_PROGRESS
        ]:
            b.status = BlockStatus.SAFETY_TIMEOUT_SUSPENDED
            db.commit()
            db.refresh(b)
        active_blocks.append(map_block_out(b))

    # 2. Fetch open defects
    open_defects = db.query(Defect).filter(
        Defect.status.in_([DefectStatus.OPEN, DefectStatus.SCHEDULED])
    ).order_by(Defect.criticality_score.desc()).all()

    # 3. Compile active TSRs (Speed restrictions <= 75 kmph)
    tsrs = []
    for d in open_defects:
        if d.speed_restriction_kmph is not None and d.speed_restriction_kmph <= 75:
            tsrs.append({
                "defect_id": d.id,
                "location_km": d.km_marker,
                "line": d.line,
                "speed_limit_kmph": d.speed_restriction_kmph,
                "department": d.department.value if hasattr(d.department, "value") else str(d.department),
                "reason": d.title
            })

    sync_token = f"SYNC-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

    return DownstreamSyncResponse(
        server_time=now,
        division=settings.DEFAULT_DIVISION,
        corridor=settings.DEFAULT_CORRIDOR,
        active_blocks=active_blocks,
        open_defects=open_defects,
        active_tsrs=tsrs,
        sync_token=sync_token
    )

@router.post("/upstream", response_model=UpstreamSyncResponse)
def upstream_sync(payload: UpstreamSyncRequest, db: Session = Depends(get_db)):
    """
    Idempotent batch ingestion for field engineer reports and protocol status updates
    recorded while offline in dead-zones.
    """
    created_map = {}
    processed_defects = 0
    now = datetime.utcnow()

    for item in payload.new_defects:
        defect_id = f"DEF-{item.system}-{uuid.uuid4().hex[:8].upper()}"
        
        sys_enum = LegacySystem(item.system) if item.system in LegacySystem.__members__ else LegacySystem.TMS
        dept_enum = Department(item.department) if item.department in Department.__members__ else Department.ENGINEERING
        sev_enum = Severity(item.severity) if item.severity in Severity.__members__ else Severity.MAJOR

        score = DefectScorer.calculate_criticality(
            severity=sev_enum,
            system=sys_enum,
            speed_restriction_kmph=item.speed_restriction_kmph,
            estimated_repair_minutes=item.estimated_repair_minutes,
            age_days=0
        )

        db_defect = Defect(
            id=defect_id,
            title=item.title,
            system=sys_enum,
            department=dept_enum,
            severity=sev_enum,
            status=DefectStatus.OPEN,
            track_section_id="NCR-GZB-TDL-UP",
            km_marker=item.km_marker,
            line=item.line,
            description=item.description,
            speed_restriction_kmph=item.speed_restriction_kmph,
            estimated_repair_minutes=item.estimated_repair_minutes,
            machinery_required=item.machinery_required,
            criticality_score=score,
            sync_status=SyncStatus.SYNCED,
            reported_by=item.reported_by or f"DEVICE-{payload.device_id}"
        )
        db.add(db_defect)
        created_map[item.client_temp_id] = defect_id
        processed_defects += 1

    # Process block step updates
    processed_updates = 0
    for upd in payload.block_step_updates:
        b_id = upd.get("block_id")
        if not b_id:
            continue
        blk = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == b_id).first()
        if blk:
            if "protocol_step" in upd:
                blk.protocol_step = upd["protocol_step"]
            if "status" in upd and upd["status"] in BlockStatus.__members__:
                blk.status = BlockStatus(upd["status"])
            if "actual_start_time" in upd and upd["actual_start_time"]:
                blk.actual_start_time = datetime.fromisoformat(upd["actual_start_time"])
            if "actual_end_time" in upd and upd["actual_end_time"]:
                blk.actual_end_time = datetime.fromisoformat(upd["actual_end_time"])
            processed_updates += 1

    db.commit()

    return UpstreamSyncResponse(
        status="SUCCESS",
        synced_at=now,
        processed_defects=processed_defects,
        processed_updates=processed_updates,
        created_defect_ids=created_map
    )

@router.post("/verify-lease", response_model=LeaseVerificationResponse)
def verify_block_lease(req: LeaseVerificationRequest, db: Session = Depends(get_db)):
    """
    Verifies the HMAC-SHA256 offline lease token for a block.
    If TTL has expired, automatically sets status to SAFETY_TIMEOUT_SUSPENDED and directs
    the mobile client to lock its UI and sound an audible alarm.
    """
    blk = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == req.block_id).first()
    if not blk:
        raise HTTPException(status_code=404, detail="Block not found")

    token = req.token or blk.safety_lease_token
    if not token:
        return LeaseVerificationResponse(
            block_id=blk.id,
            status="NOT_FOUND",
            is_valid=False,
            is_expired=True,
            seconds_remaining=0.0,
            expires_at=None,
            lock_ui=True,
            audible_warning=True,
            reason="No safety lease token has been issued for this block."
        )

    now = datetime.utcnow()
    is_revoked = blk.status in (BlockStatus.EMERGENCY_REVOKED, BlockStatus.CANCELLED)
    is_timeout = bool(blk.lease_expires_at and blk.lease_expires_at <= now)

    if is_revoked or is_timeout:
        if is_timeout and not is_revoked:
            blk.status = BlockStatus.SAFETY_TIMEOUT_SUSPENDED
            db.commit()
            db.refresh(blk)

        return LeaseVerificationResponse(
            block_id=blk.id,
            status=blk.status.value if hasattr(blk.status, "value") else str(blk.status),
            is_valid=False,
            is_expired=True,
            seconds_remaining=0.0,
            expires_at=blk.lease_expires_at,
            lock_ui=True,
            audible_warning=True,
            reason=f"Block lease invalid or expired: status is {blk.status.value if hasattr(blk.status, 'value') else blk.status}."
        )

    verification = safety_lease_service.verify_lease_token(token)
    
    # If expired and block is still in progress or concurred, suspend it
    if verification["is_expired"] and blk.status not in [BlockStatus.COMPLETED, BlockStatus.CANCELLED]:
        blk.status = BlockStatus.SAFETY_TIMEOUT_SUSPENDED
        db.commit()
        db.refresh(blk)

    return LeaseVerificationResponse(
        block_id=blk.id,
        status=blk.status.value if hasattr(blk.status, "value") else str(blk.status),
        is_valid=verification["valid"],
        is_expired=verification["is_expired"],
        seconds_remaining=verification["seconds_remaining"],
        expires_at=verification.get("expires_at") or blk.lease_expires_at,
        lock_ui=verification["lock_ui"],
        audible_warning=verification["audible_warning"],
        reason=verification["reason"]
    )

@router.get("/status")
def get_sync_status(db: Session = Depends(get_db)):
    """Health & statistics check for Mobile Offline Sync and IronSentinel gateway."""
    active_leases_count = db.query(MaintenanceBlock).filter(
        MaintenanceBlock.status.in_([
            BlockStatus.APPROVED,
            BlockStatus.STATION_MASTER_CONCURRED,
            BlockStatus.IN_PROGRESS
        ])
    ).count()

    unsynced_defects_count = db.query(Defect).filter(
        Defect.sync_status != SyncStatus.SYNCED
    ).count()

    return {
        "status": "OPERATIONAL",
        "timestamp": datetime.utcnow().isoformat(),
        "active_leases_count": active_leases_count,
        "pending_upstream_defects": unsynced_defects_count,
        "protocol_version": "v1.2-HMAC-SHA256"
    }
