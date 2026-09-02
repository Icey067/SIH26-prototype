import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.block import MaintenanceBlock, BlockStatus
from app.services.live_train_service import LiveTrainService

class LiveConflictMonitor:
    @classmethod
    async def evaluate_conflicts(cls, db: Session, section_id: str = "NCR-GZB-TDL-UP") -> List[Dict[str, Any]]:
        """
        Scans active & upcoming blocks against live train movements to flag block bursts and safety collisions.
        """
        now = datetime.datetime.utcnow()
        active_blocks = db.query(MaintenanceBlock).filter(
            MaintenanceBlock.track_section_id == section_id,
            MaintenanceBlock.status.in_([BlockStatus.APPROVED, BlockStatus.IN_PROGRESS, BlockStatus.UPCOMING])
        ).all()

        live_trains = await LiveTrainService.get_corridor_train_feed(section_id=section_id)
        alerts = []

        for block in active_blocks:
            # 1. Block Burst Detection (Overrunning granted possession window)
            # If block is in progress and current time is past window end or < 10 mins remaining
            time_to_end = (block.time_window_end - now).total_seconds() / 60.0

            if block.status == BlockStatus.IN_PROGRESS and time_to_end < 0:
                alerts.append({
                    "alert_id": f"BURST-{block.id}",
                    "level": "CRITICAL_BURST",
                    "block_id": block.id,
                    "block_code": block.block_code,
                    "message": f"BLOCK BURST ALERT: Block {block.block_code} has exceeded granted window by {abs(round(time_to_end))} mins! Track not cleared.",
                    "recommended_action": "Section Controller must immediately contact SSE P-Way to release track or regulate approaching trains.",
                    "timestamp": now.isoformat()
                })
            elif block.status == BlockStatus.IN_PROGRESS and 0 <= time_to_end <= 10:
                alerts.append({
                    "alert_id": f"WARN-BURST-{block.id}",
                    "level": "WARNING_BURST_IMMINENT",
                    "block_id": block.id,
                    "block_code": block.block_code,
                    "message": f"Possession window expiring in {round(time_to_end)} minutes for Block {block.block_code}.",
                    "recommended_action": "Field engineer must initiate track reconnection and test S&T circuits.",
                    "timestamp": now.isoformat()
                })

            # 2. Train Encroachment & Headway Clash
            # Check if any live train is approaching the block section
            for t in live_trains:
                train_km = t["current_km"]
                # Train approaching block if it's within 15 km before block start
                distance_to_block = block.start_km - train_km

                if 0 <= distance_to_block <= 15.0 and block.status in [BlockStatus.APPROVED, BlockStatus.IN_PROGRESS]:
                    alerts.append({
                        "alert_id": f"ENCROACH-{block.id}-{t['train_number']}",
                        "level": "WARNING_ENCROACHMENT",
                        "block_id": block.id,
                        "block_code": block.block_code,
                        "train_number": t["train_number"],
                        "train_name": t["train_name"],
                        "message": f"Train {t['train_number']} ({t['train_name']}) is {round(distance_to_block, 1)} km from active block window ({block.start_km:.1f} - {block.end_km:.1f} Km).",
                        "recommended_action": "Section controller to check home signal aspect at preceding station.",
                        "timestamp": now.isoformat()
                    })

        return alerts
