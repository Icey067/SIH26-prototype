"""
API Routes for Dynamic Conflict Detection and Network Graph Topology
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.block import MaintenanceBlock
from app.services.conflict_engine import conflict_engine
from app.services.graph_network import corridor_network

router = APIRouter(tags=["Network & Conflict Detection"])

class BlockItem(BaseModel):
    id: Optional[str] = "BLK-PROP-1"
    department: str = "TMS"
    activity_type: str = "TAMPING"
    line_type: str = "UP_MAIN"
    direction: str = "UP"
    start_km: float = 88.0
    end_km: float = 93.0
    start_minute: float = 400.0
    duration_minutes: float = 120.0
    machinery_deployed: str = "CSM"
    track_type: str = "MAIN_LINE"
    weather_condition: str = "CLEAR"

class ConflictDetectRequest(BaseModel):
    blocks: List[BlockItem]

@router.post("/conflicts/detect")
def detect_conflicts(req: ConflictDetectRequest):
    """
    Evaluates proposed maintenance blocks against train trajectories and cross-departmental demands.
    Returns itemized train starvation conflicts, block burst risks, and bundling synergies.
    """
    try:
        blocks_data = [b.dict() for b in req.blocks]
        result = conflict_engine.detect_conflicts(blocks_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conflict detection error: {str(e)}")

@router.get("/conflicts/active")
def get_active_conflicts(db: Session = Depends(get_db)):
    """
    Runs real-time conflict detection against blocks currently stored in the database.
    """
    try:
        db_blocks = db.query(MaintenanceBlock).all()
        blocks_data = []
        for b in db_blocks:
            # Convert start_time to minute of day (0 - 1440)
            st_min = b.start_time.hour * 60 + b.start_time.minute if b.start_time else 480
            dur = int((b.end_time - b.start_time).total_seconds() / 60) if (b.start_time and b.end_time) else 120
            blocks_data.append({
                "id": str(b.id),
                "department": b.department.value if hasattr(b.department, "value") else str(b.department),
                "activity_type": "TAMPING",
                "line_type": b.track_line,
                "direction": "UP" if "UP" in b.track_line else "DN",
                "start_km": b.start_km,
                "end_km": b.end_km,
                "start_minute": st_min,
                "duration_minutes": dur,
                "machinery_deployed": b.machinery_required or "MANUAL_GANG",
                "track_type": "MAIN_LINE",
                "weather_condition": "CLEAR",
            })

        # If DB is empty, provide default corridor sample blocks
        if not blocks_data:
            blocks_data = [
                {
                    "id": "TMS-SAMPLE-1",
                    "department": "TMS",
                    "activity_type": "TAMPING",
                    "line_type": "UP_MAIN",
                    "direction": "UP",
                    "start_km": 126.0,
                    "end_km": 131.0,
                    "start_minute": 450,
                    "duration_minutes": 120,
                    "machinery_deployed": "CSM",
                    "track_type": "MAIN_LINE",
                    "weather_condition": "CLEAR",
                },
                {
                    "id": "SMMS-SAMPLE-1",
                    "department": "SMMS",
                    "activity_type": "POINT_OVERHAUL",
                    "line_type": "UP_MAIN",
                    "direction": "UP",
                    "start_km": 128.0,
                    "end_km": 129.0,
                    "start_minute": 500,
                    "duration_minutes": 90,
                    "machinery_deployed": "MANUAL_GANG",
                    "track_type": "MAIN_LINE",
                    "weather_condition": "CLEAR",
                },
            ]

        return conflict_engine.detect_conflicts(blocks_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Active conflict detection error: {str(e)}")

@router.get("/network/graph")
def get_corridor_graph():
    """
    Returns the serialized Directed Multigraph G = (V, E) of the Prayagraj Corridor.
    """
    return corridor_network.get_topology_dict()

@router.get("/network/trajectories")
def get_train_trajectories():
    """
    Returns 24-hour scheduled train space-time trajectories for the Time-Distance String Chart.
    """
    return {
        "trajectories": corridor_network.get_scheduled_train_trajectories()
    }
