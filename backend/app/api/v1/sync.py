import json
import time
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.block import MaintenanceBlock, BlockStatus
from app.models.defect import Defect, DefectStatus, SyncStatus, LegacySystem, Department, Severity
from app.schemas.sync import (
    DownstreamSyncResponse,
    MobileBlockSchedule,
    MobileDefectLog,
    ActiveTSR,
    UpstreamSyncRequest,
    UpstreamSyncResponse
)
from app.services.defect_scorer import DefectScorer

router = APIRouter(prefix="/sync", tags=["Offline Mobile Synchronization"])

@router.get("/downstream", response_model=DownstreamSyncResponse)
def get_downstream_sync(
    division: str = "Prayagraj (NCR)",
    section_id: str = "NCR-GZB-TDL-UP",
    db: Session = Depends(get_db)
):
    """
    Delta sync endpoint for Field Engineer Mobile App (IronSentinel).
    Supplies approved maintenance blocks, active speed restrictions (TSRs),
    and unresolved defects for offline local Room/SQLite caching.
    """
    # 1. Fetch relevant blocks
    db_blocks = db.query(MaintenanceBlock).filter(
        MaintenanceBlock.track_section_id == section_id
    ).all()

    mobile_blocks: List[MobileBlockSchedule] = []
    for b in db_blocks:
        # Calculate timeWindow format e.g. "08:30 - 10:00"
        tw_start = b.time_window_start.strftime("%H:%M")
        tw_end = b.time_window_end.strftime("%H:%M")
        time_window = f"{tw_start} - {tw_end}"

        # Map block status string for mobile Room enum
        status_str = b.status.value if hasattr(b.status, "value") else str(b.status)
        if status_str not in ["PENDING", "IN_PROGRESS", "UPCOMING", "COMPLETED"]:
            status_str = "PENDING"

        mobile_blocks.append(
            MobileBlockSchedule(
                id=b.id,
                blockCode=b.block_code,
                startKm=f"{b.start_km:.1f}",
                endKm=f"{b.end_km:.1f}",
                line=b.line,
                division=b.division,
                timeWindow=time_window,
                status=status_str,
                privateNumber=b.private_number,
                remainingSeconds=b.duration_minutes * 60,
                protocolStep=b.protocol_step
            )
        )

    # 2. Fetch active defects
    db_defects = db.query(Defect).filter(
        Defect.track_section_id == section_id,
        Defect.status.in_([DefectStatus.OPEN, DefectStatus.SCHEDULED, DefectStatus.IN_PROGRESS])
    ).all()

    mobile_defects: List[MobileDefectLog] = []
    active_tsrs: List[ActiveTSR] = []

    for d in db_defects:
        sys_str = d.system.value if hasattr(d.system, "value") else str(d.system)
        sev_str = d.severity.value if hasattr(d.severity, "value") else str(d.severity)

        mobile_defects.append(
            MobileDefectLog(
                id=d.id,
                title=d.title,
                system=sys_str,
                severity=sev_str,
                latitude=d.latitude or 27.1767,
                longitude=d.longitude or 78.0081,
                description=d.description,
                hasPhoto=d.has_photo,
                photoPath=d.photo_path,
                timestamp=int(d.created_at.timestamp() * 1000) if d.created_at else int(time.time() * 1000),
                syncStatus="SYNCED"
            )
        )

        # Collect active TSRs
        if d.speed_restriction_kmph:
            active_tsrs.append(
                ActiveTSR(
                    section=section_id,
                    startKm=d.km_marker,
                    endKm=d.km_marker + 0.5,
                    speedKmph=d.speed_restriction_kmph,
                    reason=f"{sys_str}: {d.title}"
                )
            )

    return DownstreamSyncResponse(
        serverTime=int(time.time() * 1000),
        division=division,
        corridor="Ghaziabad - Kanpur Main Line",
        blocks=mobile_blocks,
        defects=mobile_defects,
        activeTSRs=active_tsrs
    )

@router.post("/upstream", response_model=UpstreamSyncResponse)
def post_upstream_sync(request: UpstreamSyncRequest, db: Session = Depends(get_db)):
    """
    Idempotent upstream batch processor for offline queued actions from field staff.
    Handles newly logged defects, block demands, and protocol status updates.
    """
    processed = 0
    failed = 0
    synced_ids: List[str] = []
    errors: List[str] = []

    for item in request.items:
        try:
            payload = {}
            if item.payloadJson:
                try:
                    payload = json.loads(item.payloadJson)
                except Exception:
                    payload = {}

            if item.category == "defect":
                # Check if defect with this ID already exists
                existing = db.query(Defect).filter(Defect.id == item.id).first()
                if not existing:
                    # Ingest new defect reported from mobile
                    sys_name = payload.get("system", "TMS")
                    sev_name = payload.get("severity", "MAJOR")
                    dept_name = payload.get("department", "ENGINEERING")
                    km = float(payload.get("kmMarker", payload.get("km", 100.0)))
                    lat = float(payload.get("lat", payload.get("latitude", 27.1767)))
                    lng = float(payload.get("lng", payload.get("longitude", 78.0081)))
                    desc = payload.get("description", item.title)

                    system_enum = LegacySystem(sys_name) if sys_name in LegacySystem.__members__ else LegacySystem.TMS
                    severity_enum = Severity(sev_name) if sev_name in Severity.__members__ else Severity.MAJOR
                    dept_enum = Department(dept_name) if dept_name in Department.__members__ else Department.ENGINEERING

                    score = DefectScorer.calculate_criticality(
                        severity=severity_enum,
                        system=system_enum,
                        speed_restriction_kmph=payload.get("speedRestriction"),
                        estimated_repair_minutes=payload.get("duration", 60)
                    )

                    new_defect = Defect(
                        id=item.id,
                        title=item.title,
                        system=system_enum,
                        department=dept_enum,
                        severity=severity_enum,
                        status=DefectStatus.OPEN,
                        track_section_id=payload.get("trackSectionId", "NCR-GZB-TDL-UP"),
                        km_marker=km,
                        line=payload.get("line", "UP"),
                        latitude=lat,
                        longitude=lng,
                        description=desc,
                        speed_restriction_kmph=payload.get("speedRestriction"),
                        estimated_repair_minutes=payload.get("duration", 60),
                        machinery_required=payload.get("machinery"),
                        criticality_score=score,
                        sync_status=SyncStatus.SYNCED,
                        reported_by=request.clientId
                    )
                    db.add(new_defect)

            elif item.category == "block_update":
                # Handle execution status or protocol step update
                block_id = payload.get("blockId", item.id)
                db_block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
                if db_block:
                    if "protocolStep" in payload:
                        db_block.protocol_step = int(payload["protocolStep"])
                    if "status" in payload and payload["status"] in BlockStatus.__members__:
                        db_block.status = BlockStatus(payload["status"])
                    if "privateNumber" in payload:
                        db_block.private_number = payload["privateNumber"]
                    if "privateNumberCancellation" in payload:
                        db_block.private_number_cancellation = payload["privateNumberCancellation"]

            db.commit()
            processed += 1
            synced_ids.append(item.id)

        except Exception as e:
            db.rollback()
            failed += 1
            errors.append(f"Failed to process item {item.id}: {str(e)}")

    return UpstreamSyncResponse(
        receivedCount=len(request.items),
        processedCount=processed,
        failedCount=failed,
        syncedIds=synced_ids,
        errors=errors
    )
