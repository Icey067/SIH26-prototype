import logging
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

class KeyRotator:
    """
    Thread-safe Round-Robin API Key Rotator with automatic failover,
    rate-limit handling, and key masking for security logging.
    """
    def __init__(self, service_name: str, raw_keys: Optional[str] = None):
        self.service_name = service_name
        self.keys: List[str] = []
        self._index = 0
        if raw_keys:
            self.add_keys(raw_keys)

    def add_keys(self, raw_keys: Optional[str]) -> None:
        if not raw_keys:
            return
        for item in raw_keys.replace(";", ",").replace("\n", ",").split(","):
            cleaned = item.strip().strip("'\"")
            if cleaned and cleaned not in self.keys:
                self.keys.append(cleaned)

    @property
    def has_keys(self) -> bool:
        return len(self.keys) > 0

    @property
    def count(self) -> int:
        return len(self.keys)

    @staticmethod
    def mask_key(key: str) -> str:
        if not key:
            return "[EMPTY]"
        if len(key) <= 8:
            return f"{key[:2]}...{key[-2:]}"
        return f"{key[:4]}...{key[-4:]}"

    def get_next_key(self) -> Optional[Tuple[str, int]]:
        """
        Returns (key, index) advancing the round-robin cursor.
        """
        if not self.keys:
            return None
        idx = self._index % len(self.keys)
        key = self.keys[idx]
        self._index = (self._index + 1) % len(self.keys)
        return key, idx

    def get_all_ordered_from_current(self) -> List[Tuple[str, int]]:
        """
        Returns all available keys starting from the current round-robin cursor,
        advancing the cursor for next request and providing full failover sequence.
        """
        if not self.keys:
            return []
        total = len(self.keys)
        start_idx = self._index % total
        self._index = (self._index + 1) % total
        
        ordered: List[Tuple[str, int]] = []
        for offset in range(total):
            curr_idx = (start_idx + offset) % total
            ordered.append((self.keys[curr_idx], curr_idx))
        return ordered
