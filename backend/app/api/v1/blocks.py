import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.block import MaintenanceBlock, BlockDefectAssociation, BlockStatus
from app.models.defect import Defect, DefectStatus
from app.models.timetable import TrainSchedule
from app.schemas.block import (
    MaintenanceBlockCreate,
    MaintenanceBlockUpdate,
    MaintenanceBlockOut,
    BlockApprovalRequest,
    StationMasterConcurrenceRequest,
    BlockLeaseTokenOut,
    EmergencyRevokeRequest,
    MachineIncidentReportRequest,
    BlockExecutionUpdate,
    DefectSummaryInBlock
)
from app.services.block_optimizer import BlockOptimizer
from app.services.safety_lease_service import safety_lease_service

router = APIRouter(prefix="/blocks", tags=["Maintenance Blocks & Optimization"])

def map_block_out(block: MaintenanceBlock) -> MaintenanceBlockOut:
    defects_summary = []
    if hasattr(block, "defects") and block.defects:
        for assoc in block.defects:
            d = getattr(assoc, "defect", None)
            if d:
                defects_summary.append(
                    DefectSummaryInBlock(
                        id=d.id,
                        title=d.title,
                        department=d.department.value if hasattr(d.department, "value") else str(d.department),
                        severity=d.severity.value if hasattr(d.severity, "value") else str(d.severity),
                        km_marker=d.km_marker
                    )
                )

    now = datetime.datetime.utcnow()
    controller_pn = block.controller_private_number or block.private_number

    data = MaintenanceBlockOut(
        id=block.id,
        block_code=block.block_code,
        title=block.title,
        track_section_id=block.track_section_id,
        line=block.line,
        division=block.division,
        start_km=block.start_km,
        end_km=block.end_km,
        elementary_section_id=getattr(block, "elementary_section_id", None),
        time_window_start=block.time_window_start,
        time_window_end=block.time_window_end,
        duration_minutes=block.duration_minutes,
        primary_department=block.primary_department,
        bundled_departments=block.bundled_departments,
        machinery_assigned=block.machinery_assigned,
        status=block.status,
        private_number=controller_pn,
        controller_private_number=controller_pn,
        station_master_private_number=getattr(block, "station_master_private_number", None),
        station_master_station=getattr(block, "station_master_station", None),
        controller_approved_at=getattr(block, "controller_approved_at", None),
        station_master_concurred_at=getattr(block, "station_master_concurred_at", None),
        safety_lease_token=getattr(block, "safety_lease_token", None),
        lease_expires_at=getattr(block, "lease_expires_at", None),
        traffic_regulation_order=getattr(block, "traffic_regulation_order", None),
        private_number_cancellation=block.private_number_cancellation,
        protocol_step=block.protocol_step if block.protocol_step is not None else 0,
        caution_order_issued=block.caution_order_issued if block.caution_order_issued is not None else False,
        ohe_power_isolated=block.ohe_power_isolated if block.ohe_power_isolated is not None else False,
        actual_start_time=block.actual_start_time,
        actual_end_time=block.actual_end_time,
        affected_trains=block.affected_trains,
        optimization_score=block.optimization_score if block.optimization_score is not None else 100.0,
        controller_remarks=block.controller_remarks,
        created_at=block.created_at or now,
        updated_at=block.updated_at or now,
        defects=defects_summary
    )
    return data

@router.get("", response_model=List[MaintenanceBlockOut])
def list_blocks(
    status: Optional[BlockStatus] = None,
    track_section_id: Optional[str] = None,
    line: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MaintenanceBlock)
    if status:
        query = query.filter(MaintenanceBlock.status == status)
    if track_section_id:
        query = query.filter(MaintenanceBlock.track_section_id == track_section_id)
    if line:
        query = query.filter(MaintenanceBlock.line == line)

    blocks = query.order_by(MaintenanceBlock.time_window_start.asc()).all()
    return [map_block_out(b) for b in blocks]

@router.post("", response_model=MaintenanceBlockOut, status_code=201)
def create_block(payload: MaintenanceBlockCreate, db: Session = Depends(get_db)):
    block_id = payload.id or f"BLK-{uuid.uuid4().hex[:8].upper()}"

    db_block = MaintenanceBlock(
        id=block_id,
        block_code=payload.block_code,
        title=payload.title,
        track_section_id=payload.track_section_id,
        line=payload.line,
        division=payload.division,
        start_km=payload.start_km,
        end_km=payload.end_km,
        time_window_start=payload.time_window_start,
        time_window_end=payload.time_window_end,
        duration_minutes=payload.duration_minutes,
        primary_department=payload.primary_department,
        bundled_departments=payload.bundled_departments,
        machinery_assigned=payload.machinery_assigned,
        status=BlockStatus.PENDING,
        protocol_step=0
    )

    db.add(db_block)

    # Associate defects
    if payload.defect_ids:
        for did in payload.defect_ids:
            assoc = BlockDefectAssociation(block_id=block_id, defect_id=did)
            db.add(assoc)
            # Update defect status to SCHEDULED
            d = db.query(Defect).filter(Defect.id == did).first()
            if d:
                d.status = DefectStatus.SCHEDULED

    db.commit()
    db.refresh(db_block)
    return map_block_out(db_block)

@router.get("/{block_id}", response_model=MaintenanceBlockOut)
def get_block(block_id: str, db: Session = Depends(get_db)):
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")
    return map_block_out(block)

@router.post("/{block_id}/approve", response_model=MaintenanceBlockOut)
def approve_block(block_id: str, payload: BlockApprovalRequest, db: Session = Depends(get_db)):
    """Section Controller grants block with Private Number (PTW) exchange - Handshake 1."""
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    now = datetime.datetime.utcnow()
    block.status = BlockStatus.APPROVED
    block.private_number = payload.private_number
    block.controller_private_number = payload.private_number
    block.controller_approved_at = now
    block.controller_remarks = payload.controller_remarks
    block.caution_order_issued = payload.caution_order_issued
    block.ohe_power_isolated = payload.ohe_power_isolated
    block.protocol_step = max(block.protocol_step or 0, 1) # Caution order / granted

    db.commit()
    db.refresh(block)
    return map_block_out(block)

@router.post("/{block_id}/station-master-concur", response_model=MaintenanceBlockOut)
def station_master_concur(block_id: str, payload: StationMasterConcurrenceRequest, db: Session = Depends(get_db)):
    """
    Dual-Key Handshake Part 2: Station Master concurs block, verifying signal interlock
    and route isolation with an independent Private Number. Issues HMAC-SHA256 offline safety lease.
    """
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    if not block.controller_private_number and not block.private_number:
        raise HTTPException(
            status_code=400,
            detail="Section Controller Private Number required before Station Master concurrence."
        )

    now = datetime.datetime.utcnow()
    block.status = BlockStatus.STATION_MASTER_CONCURRED
    block.station_master_private_number = payload.station_master_private_number
    block.station_master_station = payload.station_id
    block.station_master_concurred_at = now
    block.protocol_step = max(block.protocol_step or 0, 2) # Traffic stopped / concurred

    if payload.station_master_remarks:
        cur_rem = block.controller_remarks or ""
        block.controller_remarks = f"{cur_rem} | [SM {payload.station_id}]: {payload.station_master_remarks}".strip(" |")

    # Generate HMAC-SHA256 offline lease token with 10-minute grace period TTL
    controller_pn = block.controller_private_number or block.private_number or "PN-SC-GEN"
    lease = safety_lease_service.generate_lease_token(
        block_id=block.id,
        block_code=block.block_code,
        time_window_end=block.time_window_end,
        controller_pn=controller_pn,
        station_master_pn=payload.station_master_private_number,
        grace_minutes=10
    )

    block.safety_lease_token = lease["token"]
    block.lease_expires_at = lease["expires_at"]

    db.commit()
    db.refresh(block)
    return map_block_out(block)

@router.get("/{block_id}/lease", response_model=BlockLeaseTokenOut)
def get_block_lease(block_id: str, db: Session = Depends(get_db)):
    """Fetches the active HMAC-SHA256 BlockLeaseToken and TTL countdown."""
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    if not block.safety_lease_token or not block.lease_expires_at:
        if block.status in (BlockStatus.APPROVED, BlockStatus.CONTROLLER_APPROVED, BlockStatus.STATION_MASTER_CONCURRED):
            controller_pn = block.controller_private_number or block.private_number or "PN-SC"
            sm_pn = block.station_master_private_number or "PN-SM"
            lease = safety_lease_service.generate_lease_token(
                block_id=block.id,
                block_code=block.block_code,
                time_window_end=block.time_window_end,
                controller_pn=controller_pn,
                station_master_pn=sm_pn,
                grace_minutes=10
            )
            block.safety_lease_token = lease["token"]
            block.lease_expires_at = lease["expires_at"]
            db.commit()
            db.refresh(block)
        else:
            raise HTTPException(status_code=400, detail="Block has not received concurrence; no lease issued.")

    verification = safety_lease_service.verify_lease_token(block.safety_lease_token)
    return BlockLeaseTokenOut(
        token=block.safety_lease_token,
        block_id=block.id,
        block_code=block.block_code,
        issued_at=block.station_master_concurred_at or block.created_at or datetime.datetime.utcnow(),
        expires_at=block.lease_expires_at,
        grace_period_mins=10,
        status=verification["status"],
        lock_ui=verification["lock_ui"]
    )

@router.post("/{block_id}/protocol", response_model=MaintenanceBlockOut)
def update_protocol_step(block_id: str, payload: BlockExecutionUpdate, db: Session = Depends(get_db)):
    """Advances field execution protocol step (0 to 5) or marks block completed/bursted."""
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    block.protocol_step = payload.protocol_step

    if payload.status:
        block.status = payload.status
    elif payload.protocol_step == 4:
        block.status = BlockStatus.IN_PROGRESS
        if not block.actual_start_time:
            block.actual_start_time = datetime.datetime.utcnow()
    elif payload.protocol_step == 5:
        block.status = BlockStatus.COMPLETED
        if not block.actual_end_time:
            block.actual_end_time = datetime.datetime.utcnow()
        # Mark associated defects as RESOLVED
        for assoc in block.defects:
            assoc.resolved_in_this_block = True
            assoc.defect.status = DefectStatus.RESOLVED

    if payload.private_number_cancellation:
        block.private_number_cancellation = payload.private_number_cancellation

    db.commit()
    db.refresh(block)
    return map_block_out(block)

@router.post("/{block_id}/emergency-revoke", response_model=MaintenanceBlockOut)
def emergency_revoke_block(block_id: str, payload: EmergencyRevokeRequest, db: Session = Depends(get_db)):
    """
    Emergency Fail-Safe Revocation: Section Controller unilaterally aborts an approved
    or in-progress block for approaching relief trains / SOS calls.
    Invalidates safety lease and switches status to EMERGENCY_REVOKED.
    """
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    now = datetime.datetime.utcnow()
    block.status = BlockStatus.EMERGENCY_REVOKED
    block.private_number_cancellation = payload.private_number_cancellation
    block.actual_end_time = now

    cur_rem = block.controller_remarks or ""
    block.controller_remarks = f"{cur_rem} | [EMERGENCY REVOCATION]: {payload.revocation_reason} (PNC: {payload.private_number_cancellation})".strip(" |")

    # Invalidate lease immediately
    block.lease_expires_at = now - datetime.timedelta(seconds=1)

    if payload.order_caution_on_adjacent:
        block.caution_order_issued = True

    db.commit()
    db.refresh(block)
    return map_block_out(block)

@router.post("/{block_id}/report-incident", response_model=MaintenanceBlockOut)
def report_machinery_incident(block_id: str, payload: MachineIncidentReportRequest, db: Session = Depends(get_db)):
    """
    Incident Reporting: Reports machinery breakdown or track obstruction (e.g. stalled BCM/CSM).
    Switches block to MACHINE_STRANDED_OBSTRUCTION, mandates Caution Order on adjacent tracks,
    and updates controller remarks.
    """
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    block.status = BlockStatus.MACHINE_STRANDED_OBSTRUCTION
    block.caution_order_issued = True

    cur_rem = block.controller_remarks or ""
    details_str = f" | {payload.details}" if payload.details else ""
    relief_str = " [RELIEF LOCO DISPATCH REQUESTED]" if payload.relief_loco_required else ""
    block.controller_remarks = (
        f"{cur_rem} | [INCIDENT - {payload.incident_type}]: Unit {payload.machinery_id} stalled at Km {payload.current_km:.1f}. "
        f"Track Obstructed: {payload.track_obstructed}.{relief_str}{details_str}"
    ).strip(" |")

    db.commit()
    db.refresh(block)
    return map_block_out(block)

@router.post("/{block_id}/re-evaluate-delay")
def re_evaluate_block_delay(
    block_id: str,
    train_number: str,
    delay_minutes: int,
    scheduled_entry_minute: int = 480,
    db: Session = Depends(get_db)
):
    """
    Dynamic Timetable Drift Re-evaluation: Checks if live delayed train encroaches
    on the scheduled maintenance block.
    """
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    b_start = block.time_window_start.hour * 60 + block.time_window_start.minute
    b_end = block.time_window_end.hour * 60 + block.time_window_end.minute

    eval_result = BlockOptimizer.re_evaluate_block_against_delays(
        block_start_min=b_start,
        block_end_min=b_end,
        train_number=train_number,
        scheduled_entry_minute=scheduled_entry_minute,
        delay_minutes=delay_minutes,
        headway_buffer_mins=12.0
    )
    return eval_result

@router.post("/optimize/generate", response_model=List[MaintenanceBlockOut])
def run_block_optimization(
    track_section_id: str = "NCR-GZB-TDL-UP",
    line: str = "UP",
    target_date: Optional[datetime.date] = None,
    save_to_db: bool = False,
    db: Session = Depends(get_db)
):
    """
    Triggers Google OR-Tools CP-SAT solver to automatically bundle defects into timetable gaps.
    """
    if not target_date:
        target_date = datetime.date.today()

    defects = db.query(Defect).filter(
        Defect.track_section_id == track_section_id,
        Defect.line == line,
        Defect.status.in_([DefectStatus.OPEN, DefectStatus.SCHEDULED])
    ).all()

    trains = db.query(TrainSchedule).filter(
        TrainSchedule.track_section_id == track_section_id,
        TrainSchedule.line == line
    ).all()

    optimizer = BlockOptimizer(section_id=track_section_id, line=line)
    solution = optimizer.solve_optimal_block_plan(
        candidate_defects=defects,
        train_schedules=trains,
        target_date=target_date,
        max_blocks=5
    )

    planned_list = solution.get("planned_blocks", []) if isinstance(solution, dict) else solution

    created_blocks = []
    for plan in planned_list:
        block_id = f"BLK-OPT-{uuid.uuid4().hex[:6].upper()}"
        db_block = MaintenanceBlock(
            id=block_id,
            block_code=plan["block_code"],
            title=plan["title"],
            track_section_id=plan["track_section_id"],
            line=plan["line"],
            division="Prayagraj (NCR)",
            start_km=plan["start_km"],
            end_km=plan["end_km"],
            elementary_section_id=plan.get("elementary_section_id"),
            traffic_regulation_order=plan.get("traffic_regulation_order"),
            time_window_start=plan["time_window_start"],
            time_window_end=plan["time_window_end"],
            duration_minutes=plan["duration_minutes"],
            primary_department=plan["primary_department"],
            bundled_departments=plan["bundled_departments"],
            machinery_assigned=plan["machinery_assigned"],
            status=BlockStatus.PENDING,
            optimization_score=plan["optimization_score"],
            controller_remarks=f"Recommended by OR-Tools solver between {plan['preceding_train']} and {plan['following_train']}"
        )

        if save_to_db:
            db.add(db_block)
            for d in plan.get("defects", []):
                assoc = BlockDefectAssociation(block_id=block_id, defect_id=d.id)
                db.add(assoc)
            db.commit()
            db.refresh(db_block)

        created_blocks.append(db_block)

    return [map_block_out(b) for b in created_blocks]

@router.post("/optimize/bundle")
def run_block_optimization_with_metrics(
    track_section_id: str = "NCR-GZB-TDL-UP",
    line: str = "UP",
    target_date: Optional[datetime.date] = None,
    db: Session = Depends(get_db)
):
    """
    Returns the OR-Tools bundled maintenance block schedule alongside quantified
    asset availability metrics and downtime reduction percentages.
    """
    if not target_date:
        target_date = datetime.date.today()

    defects = db.query(Defect).filter(
        Defect.track_section_id == track_section_id,
        Defect.line == line,
        Defect.status.in_([DefectStatus.OPEN, DefectStatus.SCHEDULED])
    ).all()

    trains = db.query(TrainSchedule).filter(
        TrainSchedule.track_section_id == track_section_id,
        TrainSchedule.line == line
    ).all()

    optimizer = BlockOptimizer(section_id=track_section_id, line=line)
    solution = optimizer.solve_optimal_block_plan(
        candidate_defects=defects,
        train_schedules=trains,
        target_date=target_date,
        max_blocks=5
    )

    planned_list = solution.get("planned_blocks", []) if isinstance(solution, dict) else solution
    metrics = solution.get("metrics", {}) if isinstance(solution, dict) else {}

    # Format blocks
    out_blocks = []
    for plan in planned_list:
        block_id = f"BLK-OPT-{uuid.uuid4().hex[:6].upper()}"
        out_blocks.append({
            "id": block_id,
            "block_code": plan["block_code"],
            "title": plan["title"],
            "track_section_id": plan["track_section_id"],
            "line": plan["line"],
            "division": "Prayagraj (NCR)",
            "start_km": plan["start_km"],
            "end_km": plan["end_km"],
            "time_window_start": plan["time_window_start"].isoformat() if hasattr(plan["time_window_start"], "isoformat") else str(plan["time_window_start"]),
            "time_window_end": plan["time_window_end"].isoformat() if hasattr(plan["time_window_end"], "isoformat") else str(plan["time_window_end"]),
            "duration_minutes": plan["duration_minutes"],
            "primary_department": plan["primary_department"],
            "bundled_departments": plan["bundled_departments"],
            "machinery_assigned": plan["machinery_assigned"],
            "status": "PENDING",
            "optimization_score": plan["optimization_score"],
            "preceding_train": plan["preceding_train"],
            "following_train": plan["following_train"],
            "is_joint_bundle": plan.get("is_joint_bundle", True),
            "predicted_duration_mins": plan.get("predicted_duration_mins", plan["duration_minutes"]),
            "elementary_section_id": plan.get("elementary_section_id"),
            "traffic_regulation_order": plan.get("traffic_regulation_order"),
            "is_emergency_regulation": plan.get("is_emergency_regulation", False),
        })

    return {
        "blocks": out_blocks,
        "metrics": metrics
    }

