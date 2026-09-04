import json
import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert Indian Railways Chief Engineer and Safety Inspector specializing in:
1. Track Management System (TMS) - Civil Engineering (P-Way, rails, welds, ballast, sleepers, USFD testing, turnouts).
2. Signal Maintenance Management System (SMMS) - S&T (Point machines, track circuits, axel counters, relays, aspect signals).
3. Traction Distribution Management System (TDMS) - Electrical/TRD (25kV OHE, contact wires, catenary, droppers, neutral sections, insulators).

Analyze the provided unstructured field report (which may be in English, Hindi, or Hinglish).
Extract and structure it into strict JSON adhering to this schema:
{
  "title": "Concise engineering title",
  "system": "TMS" | "SMMS" | "TDMS",
  "department": "ENGINEERING" | "SIGNAL_TELECOM" | "TRACTION_DISTRIBUTION",
  "severity": "CRITICAL" | "MAJOR" | "MINOR",
  "km_marker": float (best estimate or 90.0 if not mentioned),
  "line": "UP" | "DOWN",
  "speed_restriction_kmph": integer or null (e.g., 30, 45, 60 or null if none needed),
  "estimated_repair_minutes": integer (e.g., 45, 60, 90, 120),
  "machinery_required": "BCM" | "CSM" | "TOWER_WAGON" | "UNIMAT" | "MANUAL_CREW" | "RAIL_TENSOR",
  "root_cause_analysis": "Technical engineering rationale explaining why this happened and risk factors",
  "safety_precaution": "Mandatory safety checklist item before track occupation (e.g. OHE power block, caution order)"
}
Output ONLY valid JSON.
"""

class GeminiService:
    @classmethod
    async def parse_field_report(cls, raw_text: str) -> Dict[str, Any]:
        """
        Calls Google Gemini Pro to parse raw field engineer notes into structured defect schemas.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.warning("GEMINI_API_KEY not configured. Falling back to heuristic rule parser.")
            return cls._heuristic_fallback(raw_text)

        # Candidate models to try in order of capability
        candidate_models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]

        async with httpx.AsyncClient(timeout=35.0) as client:
            for model_name in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {"text": SYSTEM_PROMPT},
                                {"text": f"Raw Field Report:\n'''\n{raw_text}\n'''"}
                            ]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json"
                    }
                }

                try:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content_parts = candidates[0].get("content", {}).get("parts", [])
                            if content_parts:
                                json_str = content_parts[0].get("text", "{}").strip()
                                if json_str.startswith("```json"):
                                    json_str = json_str[7:]
                                if json_str.startswith("```"):
                                    json_str = json_str[3:]
                                if json_str.endswith("```"):
                                    json_str = json_str[:-3]
                                json_str = json_str.strip()
                                parsed = json.loads(json_str)
                                parsed["ai_model_used"] = model_name
                                return parsed
                    else:
                        logger.warning(f"Gemini API returned {response.status_code} for {model_name}: {response.text}")
                except Exception as e:
                    logger.error(f"Error querying Gemini model {model_name}: {e}")

        # If all API calls fail, fallback to heuristic
        return cls._heuristic_fallback(raw_text)

    @classmethod
    def _heuristic_fallback(cls, raw_text: str) -> Dict[str, Any]:
        text = raw_text.lower()

        system = "TMS"
        department = "ENGINEERING"
        machinery = "MANUAL_CREW"
        severity = "MAJOR"
        tsr = None

        if any(k in text for k in ["point", "signal", "track circuit", "relay", "smms", "axle counter"]):
            system = "SMMS"
            department = "SIGNAL_TELECOM"
            machinery = "MANUAL_CREW"
        elif any(k in text for k in ["ohe", "wire", "pantograph", "cantilever", "insulator", "tdms", "traction"]):
            system = "TDMS"
            department = "TRACTION_DISTRIBUTION"
            machinery = "TOWER_WAGON"
        elif any(k in text for k in ["bcm", "cushion", "ballast"]):
            machinery = "BCM"
        elif any(k in text for k in ["turnout", "crossing"]):
            machinery = "UNIMAT"

        if any(k in text for k in ["critical", "emergency", "fracture", "crack", "urgent", "imr", "hazard"]):
            severity = "CRITICAL"

        if "30" in text:
            tsr = 30
        elif "45" in text:
            tsr = 45
        elif "60" in text:
            tsr = 60

        return {
            "title": raw_text[:80],
            "system": system,
            "department": department,
            "severity": severity,
            "km_marker": 88.5,
            "line": "UP",
            "speed_restriction_kmph": tsr,
            "estimated_repair_minutes": 60,
            "machinery_required": machinery,
            "root_cause_analysis": "Parsed via heuristic fallback engine.",
            "safety_precaution": "Enforce caution order and notify Section Controller.",
            "ai_model_used": "heuristic_fallback"
        }
