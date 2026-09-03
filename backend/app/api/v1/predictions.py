"""
API Route for Scikit-Learn Predictive Duration & Risk Modeling
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.duration_predictor import duration_predictor

router = APIRouter(prefix="/predict", tags=["Predictive Analytics"])

class DurationPredictionRequest(BaseModel):
    department: str = Field(..., description="TMS (Track), SMMS (Signals), TDMS (Traction)")
    activity_type: str = Field(..., description="e.g. DEEP_SCREENING, TAMPING, RAIL_RENEWAL, POINT_OVERHAUL, OHE_INSPECTION")
    track_type: str = Field("MAIN_LINE", description="MAIN_LINE, LOOP_LINE, YARD")
    machinery_deployed: str = Field("CSM", description="BCM, CSM, TOWER_WAGON, MANUAL_GANG, UNIMAT")
    weather_condition: str = Field("CLEAR", description="CLEAR, EXTREME_HEAT, FOG, HEAVY_RAIN")
    requested_duration_mins: float = Field(..., ge=15, le=720, description="Engineer's requested duration in minutes")

class DurationPredictionResponse(BaseModel):
    requested_duration_mins: float
    predicted_duration_mins: float
    duration_discrepancy_mins: float
    overrun_risk_score: float
    risk_level: str
    recommendation: str

@router.post("/duration-and-risk", response_model=DurationPredictionResponse)
def predict_duration_and_risk(req: DurationPredictionRequest):
    """
    Infers empirical block duration and overrun risk probability score (0.0 to 1.0)
    using the Scikit-Learn RandomForest pipeline.
    """
    try:
        result = duration_predictor.predict(
            department=req.department,
            activity_type=req.activity_type,
            track_type=req.track_type,
            machinery_deployed=req.machinery_deployed,
            weather_condition=req.weather_condition,
            requested_duration_mins=req.requested_duration_mins,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction pipeline error: {str(e)}")
