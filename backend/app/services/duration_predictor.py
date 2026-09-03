"""
Samanvay-AI: Module 2 - Scikit-Learn Predictive Duration & Overrun Risk Pipeline
Predicts realistic block maintenance duration (mins) and block burst overrun risk (0.0 - 1.0)
using RandomForestRegressor trained on RDSO permanent way maintenance standards.
"""

import os
from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "duration_model.joblib")

# Baseline durations (minutes) grounded in Indian Railways RDSO / P-Way Manual norms
ACTIVITY_BASELINES = {
    "DEEP_SCREENING": 210.0,
    "TURNOUT_REPLACEMENT": 240.0,
    "RAIL_RENEWAL": 150.0,
    "TAMPING": 90.0,
    "POINT_OVERHAUL": 90.0,
    "CABLE_TESTING": 60.0,
    "CATENARY_MAST_REPAIR": 120.0,
    "OHE_INSPECTION": 75.0,
    "ROUTINE_INSPECTION": 45.0,
}

WEATHER_MULTIPLIERS = {
    "CLEAR": 1.0,
    "FOG": 1.15,
    "EXTREME_HEAT": 1.25,
    "HEAVY_RAIN": 1.40,
}

MACHINERY_VARIANCE = {
    "BCM": 25.0,
    "CSM": 15.0,
    "UNIMAT": 20.0,
    "TOWER_WAGON": 12.0,
    "MANUAL_GANG": 30.0,
}


def _generate_synthetic_training_data(n_samples: int = 2500) -> pd.DataFrame:
    """Synthesizes historical Indian Railways maintenance records for training."""
    np.random.seed(42)

    departments = ["TMS", "SMMS", "TDMS"]
    activities = list(ACTIVITY_BASELINES.keys())
    track_types = ["MAIN_LINE", "LOOP_LINE", "YARD"]
    machinery = list(MACHINERY_VARIANCE.keys())
    weathers = list(WEATHER_MULTIPLIERS.keys())

    data = []
    for _ in range(n_samples):
        dept = np.random.choice(departments)
        if dept == "TMS":
            act = np.random.choice(["DEEP_SCREENING", "RAIL_RENEWAL", "TAMPING", "TURNOUT_REPLACEMENT", "ROUTINE_INSPECTION"])
            mach = np.random.choice(["BCM", "CSM", "MANUAL_GANG"])
        elif dept == "SMMS":
            act = np.random.choice(["POINT_OVERHAUL", "CABLE_TESTING", "ROUTINE_INSPECTION"])
            mach = np.random.choice(["MANUAL_GANG", "UNIMAT"])
        else:  # TDMS
            act = np.random.choice(["CATENARY_MAST_REPAIR", "OHE_INSPECTION", "ROUTINE_INSPECTION"])
            mach = np.random.choice(["TOWER_WAGON", "MANUAL_GANG"])

        track = np.random.choice(track_types, p=[0.70, 0.20, 0.10])
        weather = np.random.choice(weathers, p=[0.60, 0.15, 0.15, 0.10])

        base = ACTIVITY_BASELINES.get(act, 90.0)
        mult = WEATHER_MULTIPLIERS.get(weather, 1.0)
        var = MACHINERY_VARIANCE.get(mach, 15.0)

        # Realistic duration with Gaussian noise
        noise = np.random.normal(0, var)
        actual_duration = max(30.0, (base * mult) + noise)

        # Engineers typically underestimate by 10-25%
        requested_duration = actual_duration * np.random.uniform(0.75, 1.05)

        data.append({
            "department": dept,
            "activity_type": act,
            "track_type": track,
            "machinery_deployed": mach,
            "weather_condition": weather,
            "requested_duration": round(requested_duration, 1),
            "actual_duration": round(actual_duration, 1),
        })

    return pd.DataFrame(data)


class DurationRiskPredictor:
    """Predictive pipeline for maintenance block duration and overrun risk."""

    def __init__(self):
        self.model: Optional[Pipeline] = None
        self._load_or_train()

    def _load_or_train(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception as e:
                print(f"[DurationPredictor] Failed to load cached model: {e}. Retraining...")

        # Train new model
        print("[DurationPredictor] Training RandomForest model on synthetic Indian Railways norms...")
        df = _generate_synthetic_training_data()

        X = df[["department", "activity_type", "track_type", "machinery_deployed", "weather_condition", "requested_duration"]]
        y = df["actual_duration"]

        cat_features = ["department", "activity_type", "track_type", "machinery_deployed", "weather_condition"]
        num_features = ["requested_duration"]

        preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore"), cat_features),
            ],
            remainder="passthrough",
        )

        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", RandomForestRegressor(n_estimators=100, random_state=42, max_depth=12)),
        ])

        pipeline.fit(X, y)
        self.model = pipeline

        # Save to disk
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(pipeline, MODEL_PATH)
        print(f"[DurationPredictor] Model saved to {MODEL_PATH}")

    def predict(
        self,
        department: str,
        activity_type: str,
        track_type: str,
        machinery_deployed: str,
        weather_condition: str,
        requested_duration_mins: float,
    ) -> Dict[str, Any]:
        """
        Infers realistic duration and computes overrun probability score (0.0 to 1.0).
        """
        if self.model is None:
            self._load_or_train()

        input_df = pd.DataFrame([{
            "department": department.upper(),
            "activity_type": activity_type.upper(),
            "track_type": track_type.upper(),
            "machinery_deployed": machinery_deployed.upper(),
            "weather_condition": weather_condition.upper(),
            "requested_duration": float(requested_duration_mins),
        }])

        predicted_duration = float(self.model.predict(input_df)[0])
        predicted_duration = round(predicted_duration, 1)

        # Standard deviation heuristic based on machinery complexity
        sigma = MACHINERY_VARIANCE.get(machinery_deployed.upper(), 18.0)
        delta = predicted_duration - requested_duration_mins

        # Logistic overrun risk calculation: P(Actual > Requested)
        # Shifted sigmoid centered around zero discrepancy
        z = delta / sigma
        overrun_prob = float(1.0 / (1.0 + np.exp(-1.5 * z)))
        overrun_prob = round(min(0.98, max(0.04, overrun_prob)), 3)

        if overrun_prob > 0.65:
            risk_level = "CRITICAL"
            recommendation = "High Block Burst Risk: Grant +25% buffer or deploy secondary backup machinery."
        elif overrun_prob > 0.35:
            risk_level = "MODERATE"
            recommendation = "Moderate Risk: Closely monitor progress at T-30 minutes."
        else:
            risk_level = "LOW"
            recommendation = "Low Risk: Work is well within empirical completion envelope."

        return {
            "requested_duration_mins": round(float(requested_duration_mins), 1),
            "predicted_duration_mins": predicted_duration,
            "duration_discrepancy_mins": round(predicted_duration - requested_duration_mins, 1),
            "overrun_risk_score": overrun_prob,
            "risk_level": risk_level,
            "recommendation": recommendation,
        }


# Singleton instance
duration_predictor = DurationRiskPredictor()
