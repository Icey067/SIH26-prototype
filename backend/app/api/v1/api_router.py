from fastapi import APIRouter
from app.api.v1.defects import router as defects_router
from app.api.v1.blocks import router as blocks_router
from app.api.v1.timetable import router as timetable_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.conflicts import router as conflicts_router
from app.api.v1.live_ws import router as live_router

api_router = APIRouter()

api_router.include_router(defects_router)
api_router.include_router(blocks_router)
api_router.include_router(timetable_router)
api_router.include_router(predictions_router)
api_router.include_router(conflicts_router)
api_router.include_router(live_router)
