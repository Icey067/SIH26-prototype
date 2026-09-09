"""
Samanvay-AI: Core Security Module
Implements Indian Railways G&SR compliant cryptographic primitives:
- Private Number (PN) generation for Dual-Key Handshakes
- PNC (Private Number Cancellation) token issuance
- SHA-256 hashing for audit trail integrity
- HMAC-SHA256 signing for offline safety lease tokens
"""

import hmac
import hashlib
import secrets
import string
from datetime import datetime
from typing import Optional

from app.core.config import settings


# ---------------------------------------------------------------------------
# G&SR Block State Machine Protocol Constants
# ---------------------------------------------------------------------------
PROTOCOL_STAGES = {
    0: "DEMAND_LOGGED",
    1: "CAUTION_ORDER_ISSUED",
    2: "SM_CONCURRED",
    3: "OHE_ISOLATED",
    4: "WORK_IN_PROGRESS",
    5: "TRACK_CLEARED",
}

PROTOCOL_STAGE_DESCRIPTIONS = {
    0: "Block demand registered by SSE/JE in the system",
    1: "Section Controller issues Caution Order, stops traffic on block section",
    2: "Station Master concurs with independent Private Number, route isolated",
    3: "OHE power block obtained from TPC/TSS (for TDMS work), 25kV isolated",
    4: "Field crew on track, work in progress under safety lease",
    5: "Track reconnected, S&T circuits tested, line clear certificate issued",
}


def _random_digits(n: int = 4) -> str:
    """Generate a cryptographically random numeric string of length n."""
    return "".join(secrets.choice(string.digits) for _ in range(n))


def generate_controller_private_number() -> str:
    """
    Generate a Section Controller Private Number in G&SR format.
    Format: PN-CTRL-XXXX where XXXX is a random 4-digit code.
    Used in Dual-Key Handshake Part 1.
    """
    return f"PN-CTRL-{_random_digits(4)}"


def generate_station_master_private_number(station_id: str) -> str:
    """
    Generate a Station Master Private Number in G&SR format.
    Format: PN-SM-{STATION}-YYYY where YYYY is a random 4-digit code.
    Used in Dual-Key Handshake Part 2.

    Args:
        station_id: The controlling station code (e.g., "ALJN", "TDL", "GZB")
    """
    return f"PN-SM-{station_id.upper()}-{_random_digits(4)}"


def generate_pnc_cancellation(station_id: str) -> str:
    """
    Generate a Private Number Cancellation (PNC) token for block clearance
    or emergency revocation.
    Format: PNC-{STATION}-ZZZZ

    Args:
        station_id: The station issuing the cancellation
    """
    return f"PNC-{station_id.upper()}-{_random_digits(4)}"


def hash_private_number(private_number: str) -> str:
    """
    Compute a SHA-256 hash of a Private Number for tamper-proof audit storage.
    The hash is stored alongside the PN to verify integrity during G&SR audits.

    Args:
        private_number: The raw PN string (e.g., "PN-CTRL-8831")

    Returns:
        Hex-encoded SHA-256 digest
    """
    return hashlib.sha256(private_number.encode("utf-8")).hexdigest()


def sign_payload(payload: str) -> str:
    """
    Compute HMAC-SHA256 signature of a payload string using the application
    secret key. Used for offline safety lease token signing.

    Args:
        payload: The base64-encoded payload to sign

    Returns:
        Hex-encoded HMAC-SHA256 signature
    """
    secret = settings.SECRET_KEY.encode("utf-8")
    return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_signature(payload: str, signature: str) -> bool:
    """
    Verify an HMAC-SHA256 signature using constant-time comparison
    to prevent timing attacks.

    Args:
        payload: The base64-encoded payload
        signature: The hex-encoded signature to verify

    Returns:
        True if signature is valid
    """
    expected = sign_payload(payload)
    return hmac.compare_digest(signature, expected)
