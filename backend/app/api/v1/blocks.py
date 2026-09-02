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
    BlockExecutionUpdate,
    DefectSummaryInBlock
)
from app.services.block_optimizer import BlockOptimizer

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
    data = MaintenanceBlockOut(
        id=block.id,
        block_code=block.block_code,
        title=block.title,
        track_section_id=block.track_section_id,
        line=block.line,
        division=block.division,
        start_km=block.start_km,
        end_km=block.end_km,
        time_window_start=block.time_window_start,
        time_window_end=block.time_window_end,
        duration_minutes=block.duration_minutes,
        primary_department=block.primary_department,
        bundled_departments=block.bundled_departments,
        machinery_assigned=block.machinery_assigned,
        status=block.status,
        private_number=block.private_number,
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
    """Section Controller grants block with Private Number (PTW) exchange."""
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")

    block.status = BlockStatus.APPROVED
    block.private_number = payload.private_number
    block.controller_remarks = payload.controller_remarks
    block.caution_order_issued = payload.caution_order_issued
    block.ohe_power_isolated = payload.ohe_power_isolated
    block.protocol_step = 1 # Caution order / granted

    db.commit()
    db.refresh(block)
    return map_block_out(block)

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

    created_blocks = []
    for plan in solution:
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
            for d in plan["defects"]:
                assoc = BlockDefectAssociation(block_id=block_id, defect_id=d.id)
                db.add(assoc)
            db.commit()
            db.refresh(db_block)

        created_blocks.append(db_block)

    return [map_block_out(b) for b in created_blocks]
