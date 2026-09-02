from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.timetable import TrainSchedule, TrainType
from app.schemas.timetable import TrainScheduleOut, TimetableGap
from app.services.block_optimizer import BlockOptimizer

router = APIRouter(prefix="/timetable", tags=["COA Timetable & Corridor Slots"])

@router.get("", response_model=List[TrainScheduleOut])
def list_schedules(
    track_section_id: Optional[str] = None,
    line: Optional[str] = None,
    train_type: Optional[TrainType] = None,
    db: Session = Depends(get_db)
):
    query = db.query(TrainSchedule)
    if track_section_id:
        query = query.filter(TrainSchedule.track_section_id == track_section_id)
    if line:
        query = query.filter(TrainSchedule.line == line)
    if train_type:
        query = query.filter(TrainSchedule.train_type == train_type)

    return query.order_by(TrainSchedule.entry_time.asc()).all()

@router.get("/gaps", response_model=List[TimetableGap])
def find_timetable_gaps(
    track_section_id: str = "NCR-GZB-TDL-UP",
    line: str = "UP",
    min_gap_minutes: int = Query(default=60, ge=30, le=360),
    db: Session = Depends(get_db)
):
    """
    Identifies natural train traffic gaps along a section corridor where maintenance can be safely accommodated.
    """
    trains = db.query(TrainSchedule).filter(
        TrainSchedule.track_section_id == track_section_id,
        TrainSchedule.line == line
    ).all()

    optimizer = BlockOptimizer(section_id=track_section_id, line=line)
    raw_gaps = optimizer.find_timetable_gaps(trains, min_gap_minutes=min_gap_minutes)

    result = []
    import datetime
    for g in raw_gaps:
        sh, sm = map(int, g["start_time"].split(":"))
        eh, em = map(int, g["end_time"].split(":"))

        capacity_status = "HIGH_AVAILABILITY" if g["duration_minutes"] >= 120 else "MEDIUM"

        result.append(
            TimetableGap(
                track_section_id=track_section_id,
                line=line,
                gap_start=datetime.time(sh, sm),
                gap_end=datetime.time(eh, em),
                duration_minutes=g["duration_minutes"],
                preceding_train=g["preceding_train"],
                following_train=g["following_train"],
                corridor_capacity_status=capacity_status
            )
        )

    return result
