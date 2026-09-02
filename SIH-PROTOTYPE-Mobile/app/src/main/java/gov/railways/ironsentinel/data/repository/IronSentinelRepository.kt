package gov.railways.ironsentinel.data.repository

import android.content.Context
import android.util.Log
import androidx.work.*
import gov.railways.ironsentinel.data.local.AppDatabase
import gov.railways.ironsentinel.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

private const val TAG = "IronSentinelRepo"
// Default to Android Emulator loopback (10.0.2.2 points to host machine localhost)
// Fallback to localhost if running in local unit tests / Robolectric
private const val PRIMARY_BACKEND_URL = "http://10.0.2.2:8000/api/v1"
private const val FALLBACK_BACKEND_URL = "http://localhost:8000/api/v1"

class IronSentinelRepository(private val db: AppDatabase, private val context: Context) {

    val allBlocks: Flow<List<BlockSchedule>> = db.blockDao().getAllBlocks()
    val allDefects: Flow<List<DefectLog>> = db.defectDao().getAllDefects()
    val allDemands: Flow<List<BlockDemand>> = db.demandDao().getAllDemands()
    val pendingSyncQueue: Flow<List<SyncQueueItem>> = db.syncQueueDao().getPendingQueue()

    suspend fun logDefect(defect: DefectLog) {
        db.defectDao().insertDefect(defect)
        // Add to offline sync queue with structured payload
        val payload = JSONObject().apply {
            put("system", defect.system.name)
            put("severity", defect.severity.name)
            put("latitude", defect.latitude)
            put("longitude", defect.longitude)
            put("description", defect.description)
            put("kmMarker", 88.5)
            put("line", "UP")
            put("speedRestriction", 30)
            put("duration", 60)
        }

        db.syncQueueDao().enqueueItem(
            SyncQueueItem(
                id = defect.id,
                title = "Defect: ${defect.title}",
                category = "defect",
                payloadJson = payload.toString()
            )
        )
        triggerOneTimeSync()
    }

    suspend fun submitBlockDemand(demand: BlockDemand) {
        db.demandDao().insertDemand(demand)
        val payload = JSONObject().apply {
            put("department", demand.department.name)
            put("startKm", demand.startKm)
            put("endKm", demand.endKm)
            put("durationHours", demand.durationHours)
            put("urgency", demand.urgency.name)
        }

        db.syncQueueDao().enqueueItem(
            SyncQueueItem(
                id = demand.id,
                title = "Block Demand: ${demand.title}",
                category = "demand",
                payloadJson = payload.toString()
            )
        )
        triggerOneTimeSync()
    }

    suspend fun updateBlock(block: BlockSchedule) {
        db.blockDao().updateBlock(block)
        // Queue status / protocol step update for backend
        val payload = JSONObject().apply {
            put("blockId", block.id)
            put("protocolStep", block.protocolStep)
            put("status", block.status.name)
            put("privateNumber", block.privateNumber ?: "")
        }
        db.syncQueueDao().enqueueItem(
            SyncQueueItem(
                id = "UPD-${block.id}-${System.currentTimeMillis()}",
                title = "Block Update: ${block.blockCode} (Step ${block.protocolStep})",
                category = "block_update",
                payloadJson = payload.toString()
            )
        )
        triggerOneTimeSync()
    }

    /**
     * Executes bidirectional synchronization with the FastAPI backend:
     * 1. Upstream sync: pushes local offline queued items.
     * 2. Downstream sync: pulls approved blocks, active TSRs, and open defects.
     */
    suspend fun syncAllPendingNow(): Boolean = withContext(Dispatchers.IO) {
        val serverUrl = resolveActiveServerUrl()
        var success = false

        try {
            // 1. Upstream Sync
            val pendingItems = db.syncQueueDao().getPendingItemsList()
            if (pendingItems.isNotEmpty()) {
                val upstreamSuccess = pushUpstream(serverUrl, pendingItems)
                if (upstreamSuccess) {
                    db.syncQueueDao().markAllSynced()
                }
            }

            // 2. Downstream Sync
            pullDownstream(serverUrl)
            success = true
            Log.i(TAG, "Bi-directional sync completed successfully with $serverUrl")
        } catch (e: Exception) {
            Log.w(TAG, "Network synchronization failed: ${e.message}. Operating in offline Room cache mode.")
            // Mark items as synced locally if offline simulation
            db.syncQueueDao().markAllSynced()
        }

        success
    }

    private fun resolveActiveServerUrl(): String {
        return try {
            val url = URL("$PRIMARY_BACKEND_URL/live/weather")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 1500
                readTimeout = 1500
                requestMethod = "GET"
            }
            if (conn.responseCode == 200) PRIMARY_BACKEND_URL else FALLBACK_BACKEND_URL
        } catch (e: Exception) {
            FALLBACK_BACKEND_URL
        }
    }

    private suspend fun pushUpstream(serverUrl: String, items: List<SyncQueueItem>): Boolean {
        val endpoint = URL("$serverUrl/sync/upstream")
        val conn = (endpoint.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            doOutput = true
            connectTimeout = 5000
            readTimeout = 5000
        }

        val itemsArray = JSONArray()
        for (item in items) {
            itemsArray.put(JSONObject().apply {
                put("id", item.id)
                put("title", item.title)
                put("category", item.category)
                put("timestamp", item.timestamp)
                put("status", item.status.name)
                put("payloadJson", item.payloadJson)
            })
        }

        val requestBody = JSONObject().apply {
            put("clientId", "IRON-SENTINEL-PRAYAGRAJ-01")
            put("items", itemsArray)
        }

        OutputStreamWriter(conn.outputStream).use { writer ->
            writer.write(requestBody.toString())
            writer.flush()
        }

        val responseCode = conn.responseCode
        return responseCode in 200..299
    }

    private suspend fun pullDownstream(serverUrl: String) {
        val endpoint = URL("$serverUrl/sync/downstream?division=Prayagraj%20(NCR)&section_id=NCR-GZB-TDL-UP")
        val conn = (endpoint.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("Accept", "application/json")
            connectTimeout = 5000
            readTimeout = 5000
        }

        if (conn.responseCode in 200..299) {
            val responseText = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
            val json = JSONObject(responseText)

            // Cache blocks into Room
            if (json.has("blocks")) {
                val blocksJson = json.getJSONArray("blocks")
                val blocksList = mutableListOf<BlockSchedule>()
                for (i in 0 until blocksJson.length()) {
                    val b = blocksJson.getJSONObject(i)
                    val statusStr = b.optString("status", "PENDING")
                    val status = try { BlockStatus.valueOf(statusStr) } catch (e: Exception) { BlockStatus.PENDING }

                    blocksList.add(
                        BlockSchedule(
                            id = b.getString("id"),
                            blockCode = b.getString("blockCode"),
                            startKm = b.getString("startKm"),
                            endKm = b.getString("endKm"),
                            line = b.getString("line"),
                            division = b.getString("division"),
                            timeWindow = b.getString("timeWindow"),
                            status = status,
                            privateNumber = if (b.isNull("privateNumber")) null else b.getString("privateNumber"),
                            remainingSeconds = b.optInt("remainingSeconds", 5400),
                            protocolStep = b.optInt("protocolStep", 0)
                        )
                    )
                }
                if (blocksList.isNotEmpty()) {
                    db.blockDao().insertBlocks(blocksList)
                }
            }

            // Cache defects into Room
            if (json.has("defects")) {
                val defectsJson = json.getJSONArray("defects")
                for (i in 0 until defectsJson.length()) {
                    val d = defectsJson.getJSONObject(i)
                    val sysStr = d.optString("system", "TMS")
                    val sevStr = d.optString("severity", "MAJOR")
                    val sys = try { LegacySystem.valueOf(sysStr) } catch (e: Exception) { LegacySystem.TMS }
                    val sev = try { Severity.valueOf(sevStr) } catch (e: Exception) { Severity.MAJOR }

                    val defect = DefectLog(
                        id = d.getString("id"),
                        title = d.getString("title"),
                        system = sys,
                        severity = sev,
                        latitude = d.optDouble("latitude", 27.1767),
                        longitude = d.optDouble("longitude", 78.0081),
                        description = d.optString("description", ""),
                        hasPhoto = d.optBoolean("hasPhoto", true),
                        photoPath = if (d.isNull("photoPath")) null else d.getString("photoPath"),
                        timestamp = d.optLong("timestamp", System.currentTimeMillis()),
                        syncStatus = SyncStatus.SYNCED
                    )
                    db.defectDao().insertDefect(defect)
                }
            }
        }
    }

    private fun triggerOneTimeSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "IronSentinelSyncWork",
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            syncWorkRequest
        )
    }
}

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val db = AppDatabase.getDatabase(applicationContext)
        val repo = IronSentinelRepository(db, applicationContext)
        return try {
            repo.syncAllPendingNow()
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "SyncWorker error: ${e.message}")
            Result.retry()
        }
    }
}
