package gov.railways.ironsentinel.data.model

import androidx.compose.runtime.Immutable
import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

enum class Department(val displayName: String, val code: String) {
    ENGINEERING("Engineering (ENG)", "ENG"),
    SIGNAL_TELECOM("Signal & Telecom (S&T)", "S&T"),
    TRACTION_DISTRIBUTION("Traction (TRD)", "TRD")
}

enum class Severity(val label: String) {
    MINOR("Minor (P3)"),
    MAJOR("Major (P2)"),
    CRITICAL("Critical Safety (P1)")
}

enum class LegacySystem(val title: String) {
    TMS("Track Management System (TMS)"),
    SMMS("Signal Maintenance Mgt System (SMMS)"),
    TDMS("Traction Distribution Mgt (TDMS)")
}

enum class Machinery(val label: String) {
    BCM("Ballast Cleaning Machine (BCM)"),
    CSM("Continuous Tamping Machine (CSM)"),
    TOWER_WAGON("Tower Wagon (TRD)"),
    UNIMAT("Points & Crossing Tamping (UNIMAT)")
}

enum class BlockStatus {
    PENDING,
    IN_PROGRESS,
    UPCOMING,
    COMPLETED
}

enum class SyncStatus {
    WAITING_SYNC,
    SYNCED,
    FAILED
}

@Immutable
@Entity(tableName = "blocks")
@Serializable
data class BlockSchedule(
    @PrimaryKey val id: String,
    val blockCode: String,
    val startKm: String,
    val endKm: String,
    val line: String,
    val division: String,
    val timeWindow: String,
    val status: BlockStatus,
    val privateNumber: String? = null,
    val remainingSeconds: Int = 5400, // 90 minutes default
    val protocolStep: Int = 0
)

@Immutable
@Entity(tableName = "defects")
@Serializable
data class DefectLog(
    @PrimaryKey val id: String,
    val title: String,
    val system: LegacySystem,
    val severity: Severity,
    val latitude: Double,
    val longitude: Double,
    val description: String,
    val hasPhoto: Boolean = true,
    val photoPath: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val syncStatus: SyncStatus = SyncStatus.WAITING_SYNC
)

@Immutable
@Entity(tableName = "block_demands")
@Serializable
data class BlockDemand(
    @PrimaryKey val id: String,
    val title: String,
    val department: Department,
    val startKm: String,
    val endKm: String,
    val durationHours: Double,
    val machineryListJson: String, // Stored as comma-separated or JSON list
    val urgency: Severity,
    val timestamp: Long = System.currentTimeMillis(),
    val syncStatus: SyncStatus = SyncStatus.WAITING_SYNC
)

@Immutable
@Entity(tableName = "sync_queue")
@Serializable
data class SyncQueueItem(
    @PrimaryKey val id: String,
    val title: String,
    val category: String, // "defect", "demand", "inspection"
    val timestamp: Long = System.currentTimeMillis(),
    val status: SyncStatus = SyncStatus.WAITING_SYNC,
    val payloadJson: String
)

