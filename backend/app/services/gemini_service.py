import json
import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

from app.core.key_rotator import KeyRotator

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
    _rotator: Optional[KeyRotator] = None

    @classmethod
    def _get_rotator(cls) -> KeyRotator:
        if cls._rotator is None:
            cls._rotator = KeyRotator("Gemini")
            for k in settings.gemini_keys_list:
                cls._rotator.add_keys(k)
        return cls._rotator

    @classmethod
    async def parse_field_report(cls, raw_text: str) -> Dict[str, Any]:
        """
        Calls Google Gemini Pro to parse raw field engineer notes into structured defect schemas
        using Round-Robin API key distribution with automatic rate-limit failover.
        """
        rotator = cls._get_rotator()
        ordered_keys = rotator.get_all_ordered_from_current()

        if not ordered_keys:
            logger.warning("No GEMINI_API_KEY configured. Falling back to heuristic rule parser.")
            return cls._heuristic_fallback(raw_text)

        candidate_models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]

        async with httpx.AsyncClient(timeout=6.0) as client:
            for api_key, key_idx in ordered_keys:
                masked_key = KeyRotator.mask_key(api_key)
                key_label = f"[{key_idx + 1}/{rotator.count}] ({masked_key})"

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
                                    parsed["ai_model_used"] = f"Samanvay-NLP-Core (Engine #{key_idx + 1})"
                                    logger.info(f"NLP parse succeeded using key {key_label} with engine {model_name}")
                                    return parsed
                        elif response.status_code in (400, 401, 403, 404, 429):
                            logger.warning(
                                f"Gemini API key {key_label} hit HTTP {response.status_code}. "
                                f"Rotating to next round-robin key or heuristic fallback."
                            )
                            # Break model loop to rotate to the next API key or fallback
                            break
                        else:
                            logger.warning(f"Gemini API returned {response.status_code} for key {key_label} model {model_name}: {response.text[:100]}")
                    except Exception as e:
                        logger.warning(f"Gemini call error for model {model_name} with key {key_label}: {e}")

        # If all API keys and models fail, fallback to heuristic
        logger.warning("All Gemini API keys/models exhausted. Using heuristic defect fallback parser.")
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
            "ai_model_used": "Samanvay-Rule-Fallback"
        }
