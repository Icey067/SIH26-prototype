package gov.railways.ironsentinel.data.local

import android.content.Context
import androidx.room.*
import gov.railways.ironsentinel.data.model.*
import kotlinx.coroutines.flow.Flow

@Dao
interface BlockDao {
    @Query("SELECT * FROM blocks ORDER BY id ASC")
    fun getAllBlocks(): Flow<List<BlockSchedule>>

    @Query("SELECT * FROM blocks WHERE id = :id LIMIT 1")
    suspend fun getBlockById(id: String): BlockSchedule?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBlocks(blocks: List<BlockSchedule>)

    @Update
    suspend fun updateBlock(block: BlockSchedule)
}

@Dao
interface DefectDao {
    @Query("SELECT * FROM defects ORDER BY timestamp DESC")
    fun getAllDefects(): Flow<List<DefectLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDefect(defect: DefectLog)

    @Query("UPDATE defects SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: SyncStatus)
}

@Dao
interface DemandDao {
    @Query("SELECT * FROM block_demands ORDER BY timestamp DESC")
    fun getAllDemands(): Flow<List<BlockDemand>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDemand(demand: BlockDemand)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE status = 'WAITING_SYNC' ORDER BY timestamp ASC")
    fun getPendingQueue(): Flow<List<SyncQueueItem>>

    @Query("SELECT * FROM sync_queue WHERE status = 'WAITING_SYNC' ORDER BY timestamp ASC")
    suspend fun getPendingItemsList(): List<SyncQueueItem>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueueItem(item: SyncQueueItem)

    @Query("UPDATE sync_queue SET status = 'SYNCED' WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("UPDATE sync_queue SET status = 'SYNCED'")
    suspend fun markAllSynced()
}

@Database(
    entities = [
        BlockSchedule::class,
        DefectLog::class,
        BlockDemand::class,
        SyncQueueItem::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun blockDao(): BlockDao
    abstract fun defectDao(): DefectDao
    abstract fun demandDao(): DemandDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "iron_sentinel_database.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
