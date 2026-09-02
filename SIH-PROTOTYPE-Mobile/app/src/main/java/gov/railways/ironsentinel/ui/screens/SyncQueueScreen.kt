package gov.railways.ironsentinel.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gov.railways.ironsentinel.data.model.SyncQueueItem
import gov.railways.ironsentinel.data.model.SyncStatus
import gov.railways.ironsentinel.ui.theme.*

private val CardShape = RoundedCornerShape(12.dp)
private val BadgeShape = RoundedCornerShape(4.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncQueueScreen(
    queueItems: List<SyncQueueItem>,
    isOnline: Boolean,
    onBack: () -> Unit,
    onSyncNow: () -> Unit
) {
    val pendingCount by remember(queueItems) {
        derivedStateOf { queueItems.count { it.status == SyncStatus.WAITING_SYNC } }
    }

    val isDark = MaterialTheme.colorScheme.background == IrDarkBackground
    val cardBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Offline Sync Center",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) IrDarkSurface else IrDeepBlue
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Network Connectivity Banner
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isOnline) (if (isDark) IrDarkGreenContainer else IrGreenContainer) else (if (isDark) IrDarkSignalRedContainer else IrSignalRedContainer)
                )
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        if (isOnline) Icons.Default.Wifi else Icons.Default.WifiOff,
                        contentDescription = null,
                        tint = if (isOnline) (if (isDark) IrDarkGreen else IrGreen) else (if (isDark) IrDarkSignalRed else IrSignalRed),
                        modifier = Modifier.size(28.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (isOnline) "Connected to Railway Central Server" else "Operating in Remote / Ghat Offline Mode",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = if (isOnline) (if (isDark) IrDarkGreen else IrGreen) else (if (isDark) IrDarkSignalRed else IrSignalRed)
                        )
                        Text(
                            text = if (isOnline) "All queued offline items will sync automatically" else "Actions are encrypted and queued locally in Room DB",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Summary Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Pending Offline Records ($pendingCount)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Button(
                    onClick = onSyncNow,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDark) IrDarkPrimary else IrDeepBlue,
                        contentColor = if (isDark) Color(0xFF001F3F) else Color.White
                    ),
                    shape = RoundedCornerShape(10.dp),
                    enabled = pendingCount > 0
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Sync Now", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Queue List with Keys for 60/120fps scrolling
            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(queueItems, key = { it.id }) { item ->
                    SyncQueueItemCard(item = item, isDark = isDark, border = cardBorder)
                }
            }
        }
    }
}

@Composable
private fun SyncQueueItemCard(item: SyncQueueItem, isDark: Boolean, border: BorderStroke) {
    val isWaiting = item.status == SyncStatus.WAITING_SYNC
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = border
    ) {
        Row(modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
            // Left Accent Strip
            Box(
                modifier = Modifier
                    .width(6.dp)
                    .fillMaxHeight()
                    .background(if (isWaiting) (if (isDark) IrDarkSafetyYellow else IrSafetyYellow) else (if (isDark) IrDarkGreen else IrGreen))
            )
            Column(modifier = Modifier.padding(14.dp).weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(item.title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                    Surface(
                        shape = BadgeShape,
                        color = if (isWaiting) (if (isDark) IrDarkYellowContainer else Color(0xFFFFF099)) else (if (isDark) IrDarkGreenContainer else IrGreenContainer)
                    ) {
                        Text(
                            text = if (isWaiting) "QUEUED" else "SYNCED",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isWaiting) (if (isDark) IrDarkSafetyYellow else IrYellowContainer) else (if (isDark) IrDarkGreen else IrGreen)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Record ID: ${item.id} • Category: ${item.category.uppercase()}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
