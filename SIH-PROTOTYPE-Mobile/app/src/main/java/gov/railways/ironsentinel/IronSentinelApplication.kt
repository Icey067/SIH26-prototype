package gov.railways.ironsentinel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import gov.railways.ironsentinel.data.local.AppDatabase

class IronSentinelApplication : Application() {

    val database: AppDatabase by lazy { AppDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val safetyChannel = NotificationChannel(
                CHANNEL_SAFETY_ALERTS,
                "Railway Safety & SOS Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical alerts for Track Block Window timeouts and SOS Line Clear events"
                enableVibration(true)
            }

            val syncChannel = NotificationChannel(
                CHANNEL_SYNC_STATUS,
                "Background Data Synchronization",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Status of offline track maintenance records syncing with TMS/COA servers"
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(safetyChannel)
            manager.createNotificationChannel(syncChannel)
        }
    }

    companion object {
        const val CHANNEL_SAFETY_ALERTS = "channel_safety_alerts"
        const val CHANNEL_SYNC_STATUS = "channel_sync_status"
    }
}
