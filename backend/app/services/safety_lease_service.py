"""
Samanvay-AI: Offline Safety Lease Token & Dual-Handshake PTW Service
Implements HMAC-SHA256 digital safety leases with strict TTL for offline field operations
(IronSentinel Mobile App) complying with Indian Railways G&SR standards.
"""

import hmac
import hashlib
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.core.config import settings


class SafetyLeaseService:
    DEFAULT_GRACE_MINUTES = 10

    @classmethod
    def generate_lease_token(
        cls,
        block_id: str,
        block_code: str,
        time_window_end: datetime,
        controller_pn: str,
        station_master_pn: str,
        grace_minutes: int = DEFAULT_GRACE_MINUTES,
    ) -> Dict[str, Any]:
        """
        Generates an HMAC-SHA256 signed BlockLeaseToken for offline field operations.
        Allocated block time + grace period sets the hard cutoff TTL.
        """
        expires_at = time_window_end + timedelta(minutes=grace_minutes)
        now = datetime.utcnow()

        payload = {
            "block_id": block_id,
            "block_code": block_code,
            "controller_pn": controller_pn,
            "station_master_pn": station_master_pn,
            "issued_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "grace_period_mins": grace_minutes,
            "protocol_standard": "IR_GSR_DUAL_KEY_HANDSHAKE",
        }

        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

        secret = settings.SECRET_KEY.encode("utf-8")
        signature = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()

        token_str = f"{payload_b64}.{signature}"

        return {
            "token": token_str,
            "expires_at": expires_at,
            "payload": payload,
            "signature": signature,
        }

    @classmethod
    def verify_lease_token(cls, token: str) -> Dict[str, Any]:
        """
        Verifies token authenticity, integrity, and expiration status.
        """
        if not token or "." not in token:
            return {
                "valid": False,
                "is_expired": True,
                "status": "SAFETY_TIMEOUT_SUSPENDED",
                "reason": "Malformed or missing lease token.",
            }

        payload_b64, signature = token.split(".", 1)

        # 1. Verify HMAC Signature
        secret = settings.SECRET_KEY.encode("utf-8")
        expected_signature = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return {
                "valid": False,
                "is_expired": True,
                "status": "SAFETY_TIMEOUT_SUSPENDED",
                "reason": "Invalid HMAC signature. Untrusted token.",
            }

        # 2. Decode Payload
        try:
            # Add padding back if necessary
            pad = len(payload_b64) % 4
            b64_padded = payload_b64 + ("=" * (4 - pad) if pad else "")
            payload = json.loads(base64.urlsafe_b64decode(b64_padded.encode("utf-8")).decode("utf-8"))
        except Exception as e:
            return {
                "valid": False,
                "is_expired": True,
                "status": "SAFETY_TIMEOUT_SUSPENDED",
                "reason": f"Corrupt payload: {str(e)}",
            }

        # 3. Check TTL Expiration
        expires_at_str = payload.get("expires_at")
        if not expires_at_str:
            return {
                "valid": False,
                "is_expired": True,
                "status": "SAFETY_TIMEOUT_SUSPENDED",
                "reason": "Token missing expires_at timestamp.",
            }

        expires_at = datetime.fromisoformat(expires_at_str)
        now = datetime.utcnow()
        is_expired = now > expires_at

        return {
            "valid": True,
            "is_expired": is_expired,
            "status": "SAFETY_TIMEOUT_SUSPENDED" if is_expired else "ACTIVE",
            "expires_at": expires_at,
            "now": now,
            "seconds_remaining": max(0.0, (expires_at - now).total_seconds()) if not is_expired else 0.0,
            "payload": payload,
            "lock_ui": is_expired,
            "audible_warning": is_expired,
            "reason": "Offline lease TTL expired. Work must immediately halt." if is_expired else "Lease active and valid.",
        }

    @classmethod
    def is_lease_expired(cls, lease_expires_at: Optional[datetime]) -> bool:
        """Helper to test if a datetime has elapsed."""
        if not lease_expires_at:
            return False
        return datetime.utcnow() > lease_expires_at


safety_lease_service = SafetyLeaseService()
