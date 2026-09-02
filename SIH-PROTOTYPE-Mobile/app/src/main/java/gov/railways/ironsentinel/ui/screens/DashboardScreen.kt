package gov.railways.ironsentinel.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gov.railways.ironsentinel.data.model.BlockSchedule
import gov.railways.ironsentinel.data.model.BlockStatus
import gov.railways.ironsentinel.ui.theme.*

private val CardShape = RoundedCornerShape(14.dp)
private val StatusShape = RoundedCornerShape(6.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    isOnline: Boolean,
    isHindi: Boolean,
    isDarkTheme: Boolean = false,
    onToggleLanguage: () -> Unit,
    onToggleTheme: () -> Unit = {},
    onToggleOnline: () -> Unit,
    onLogout: () -> Unit,
    onSelectBlock: (BlockSchedule) -> Unit,
    onNavigateToDefect: () -> Unit,
    onNavigateToDemand: () -> Unit,
    onNavigateToSync: () -> Unit
) {
    var showProfileModal by remember { mutableStateOf(false) }
    var showSopDialog by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    // Sample Railway Approved Blocks - Memoized
    val blocks = remember {
        listOf(
            BlockSchedule(
                id = "B-1024",
                blockCode = "#B-1024",
                startKm = "142.4",
                endKm = "148.8",
                line = "UP Main Line (Section 4B)",
                division = "Solapur Division (CR)",
                timeWindow = "09:30 - 11:30 (2.0 Hrs)",
                status = BlockStatus.IN_PROGRESS,
                remainingSeconds = 4850
            ),
            BlockSchedule(
                id = "B-1025",
                blockCode = "#B-1025",
                startKm = "150.2",
                endKm = "153.0",
                line = "DN Slow Line (Platform 3 Yard)",
                division = "Pune Division (CR)",
                timeWindow = "14:00 - 16:30 (2.5 Hrs)",
                status = BlockStatus.UPCOMING,
                remainingSeconds = 9000
            )
        )
    }

    val cardBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Shield,
                                contentDescription = null,
                                tint = if (isDarkTheme) IrDarkSafetyYellow else IrDeepBlue,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (isHindi) "आयरन सेंटिनल" else "IRON SENTINEL",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                letterSpacing = 0.5.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = if (isHindi) "लाइव ब्लॉक बोर्ड • मध्य रेल" else "Live Dashboard • Central Railway",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (isDarkTheme) IrDarkPrimary else IrPrimaryContainer,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                },
                actions = {
                    // Quick Theme Toggle Button (Moon/Sun icon)
                    IconButton(
                        onClick = onToggleTheme,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            if (isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Toggle Theme",
                            tint = if (isDarkTheme) IrDarkSafetyYellow else Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(4.dp))

                    // User Profile Avatar Button
                    IconButton(
                        onClick = { showProfileModal = true },
                        modifier = Modifier
                            .padding(end = 6.dp)
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "RS",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 13.sp,
                                color = if (isDarkTheme) Color.White else IrDeepBlue
                            )
                            // Live Online Status Dot
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(if (isOnline) (if (isDarkTheme) IrDarkGreen else IrGreen) else (if (isDarkTheme) IrDarkSignalRed else IrSignalRed))
                                    .border(1.2.dp, MaterialTheme.colorScheme.surface, CircleShape)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDarkTheme) IrDarkSurface else IrDeepBlue
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToDefect,
                containerColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue,
                contentColor = if (isDarkTheme) Color(0xFF001F3F) else Color.White,
                icon = { Icon(Icons.Default.AddAPhoto, contentDescription = null) },
                text = { Text(if (isHindi) "दोष दर्ज करें" else "Log Defect (TMS)", fontWeight = FontWeight.Bold) },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.height(52.dp)
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Supervisor Profile Banner - Shifted right to top
            item(key = "supervisor_banner") {
                SupervisorProfileBanner(
                    isOnline = isOnline,
                    isHindi = isHindi,
                    isDarkTheme = isDarkTheme,
                    border = cardBorder,
                    onClickProfile = { showProfileModal = true }
                )
            }

            // Quick Navigation Shortcuts
            item(key = "quick_shortcuts") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onNavigateToDemand,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue,
                            contentColor = if (isDarkTheme) Color(0xFF001F3F) else Color.White
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Icon(Icons.Default.Engineering, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isHindi) "मांग ब्लॉक" else "Demand Block",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    OutlinedButton(
                        onClick = onNavigateToSync,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue
                        ),
                        border = cardBorder,
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isHindi) "सिंक कतार" else "Sync Queue",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // Section Header
            item(key = "approved_blocks_header") {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = if (isHindi) "आज के स्वीकृत रखरखाव ब्लॉक" else "Approved Traffic & Power Blocks",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onBackground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer
                    ) {
                        Text(
                            text = "${blocks.size} Active",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isDarkTheme) IrDarkOnPrimaryContainer else IrOnPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Approved Block Items with unique key for optimal LazyColumn recycling
            items(blocks, key = { it.id }) { block ->
                BlockItemCard(
                    block = block,
                    isHindi = isHindi,
                    isDarkTheme = isDarkTheme,
                    border = cardBorder,
                    onSelectBlock = onSelectBlock
                )
            }
        }
    }

    // User Profile Bottom Sheet / Modal
    if (showProfileModal) {
        ModalBottomSheet(
            onDismissRequest = { showProfileModal = false },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
                    .padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Officer Profile Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(if (isDarkTheme) IrDarkPrimaryContainer else IrDeepBlue),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("RS", fontWeight = FontWeight.Black, color = if (isDarkTheme) IrDarkSafetyYellow else Color.White, fontSize = 18.sp)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Rajesh Sharma",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 17.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Senior Section Engineer (P-Way)",
                            fontSize = 12.sp,
                            color = if (isDarkTheme) IrDarkPrimary else IrDeepBlue,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Emp ID: CR-ENG-84920 • LNL-PUNE Section",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Divider(color = MaterialTheme.colorScheme.surfaceVariant)

                // Quick Action Buttons inside Profile
                Text(
                    text = if (isHindi) "त्वरित सेटिंग्स और क्रियाएं" else "Field Controls & Profile Actions",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Dark Mode / Light Mode Toggle Row
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                    border = cardBorder,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onToggleTheme() }
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                if (isDarkTheme) Icons.Default.DarkMode else Icons.Default.LightMode,
                                contentDescription = null,
                                tint = if (isDarkTheme) IrDarkSafetyYellow else IrDeepBlue,
                                modifier = Modifier.size(20.dp)
                            )
                            Column {
                                Text(
                                    text = if (isDarkTheme) "Theme: Dark Mode (Night Track)" else "Theme: Light Mode (Day Sunlight)",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = if (isDarkTheme) "OLED black contrast for night safety" else "High-vis daylight sunlight tokens",
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = isDarkTheme,
                            onCheckedChange = { onToggleTheme() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = IrDarkSafetyYellow,
                                checkedTrackColor = IrDarkYellowContainer
                            )
                        )
                    }
                }

                // Network Mode Switcher Button
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                    border = cardBorder,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onToggleOnline() }
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                if (isOnline) Icons.Default.Wifi else Icons.Default.WifiOff,
                                contentDescription = null,
                                tint = if (isOnline) (if (isDarkTheme) IrDarkGreen else IrGreen) else (if (isDarkTheme) IrDarkSignalRed else IrSignalRed),
                                modifier = Modifier.size(20.dp)
                            )
                            Column {
                                Text(
                                    text = if (isOnline) "Network: 4G Online" else "Network: Offline Field Mode",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Tap to toggle simulation",
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = isOnline,
                            onCheckedChange = { onToggleOnline() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = if (isDarkTheme) IrDarkGreen else IrGreen,
                                checkedTrackColor = if (isDarkTheme) IrDarkGreenContainer else IrGreenContainer
                            )
                        )
                    }
                }

                // Language Switch Button inside Profile
                OutlinedButton(
                    onClick = onToggleLanguage,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue
                    ),
                    border = cardBorder
                ) {
                    Icon(Icons.Default.Translate, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isHindi) "Switch to English Interface" else "हिंदी इंटरफ़ेस में बदलें (Hindi)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }

                // Safety Handshake SOP Guide Button
                OutlinedButton(
                    onClick = {
                        showProfileModal = false
                        showSopDialog = true
                    },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue
                    ),
                    border = cardBorder
                ) {
                    Icon(Icons.Default.MenuBook, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isHindi) "सुरक्षा हैंडशेक नियम एवं SOP देखें" else "Safety Handshake SOP Handbook",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }

                // Sync Queue Shortcut Button
                OutlinedButton(
                    onClick = {
                        showProfileModal = false
                        onNavigateToSync()
                    },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue
                    ),
                    border = cardBorder
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isHindi) "ऑफ़लाइन सिंक कतार केंद्र" else "Open Offline Sync Queue",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }

                // Logout Button
                Button(
                    onClick = {
                        showProfileModal = false
                        showLogoutConfirm = true
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDarkTheme) IrDarkSignalRedContainer else MaterialTheme.colorScheme.error,
                        contentColor = if (isDarkTheme) IrDarkSignalRed else Color.White
                    )
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isHindi) "फील्ड सत्र से लॉगआउट करें" else "Logout from Field Session",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }

    // Logout Confirmation Dialog
    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = {
                Text(
                    text = if (isHindi) "लॉगआउट की पुष्टि करें" else "Confirm Logout?",
                    fontWeight = FontWeight.Bold,
                    color = if (isDarkTheme) IrDarkPrimary else IrDeepBlue
                )
            },
            text = {
                Text(
                    text = if (isHindi) "क्या आप सत्र समाप्त करके लॉगिन स्क्रीन पर लौटना चाहते हैं? सभी ऑफ़लाइन रिकॉर्ड स्थानीय डेटाबेस में सुरक्षित हैं।"
                           else "Are you sure you want to end your field session and return to the login screen? All offline records remain securely saved locally.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirm = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDarkTheme) IrDarkSignalRedContainer else MaterialTheme.colorScheme.error,
                        contentColor = if (isDarkTheme) IrDarkSignalRed else Color.White
                    )
                ) {
                    Text(if (isHindi) "हाँ, लॉगआउट करें" else "Yes, Logout")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) {
                    Text(if (isHindi) "रद्द करें" else "Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        )
    }

    // Safety SOP Handbook Dialog
    if (showSopDialog) {
        AlertDialog(
            onDismissRequest = { showSopDialog = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = if (isDarkTheme) IrDarkPrimary else IrDeepBlue)
                    Text("Safety Handshake Protocol (SOP)", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("1. Station Master PTW Grant: Verify private number exchange before blocking line.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("2. Line Protection: Ensure detonators placed at 600m/1200m and banner flags positioned.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("3. Machine Deployment: BCM/CSM/Tower Wagon operators must verify track clearance.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("4. Line Clearance & Return: Issue Station Master return token only after track gauge check.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            },
            confirmButton = {
                Button(
                    onClick = { showSopDialog = false },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue,
                        contentColor = if (isDarkTheme) Color(0xFF001F3F) else Color.White
                    )
                ) {
                    Text("Understood")
                }
            }
        )
    }
}

@Composable
private fun SupervisorProfileBanner(
    isOnline: Boolean,
    isHindi: Boolean,
    isDarkTheme: Boolean,
    border: BorderStroke,
    onClickProfile: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClickProfile() },
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = border
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text("RS", fontWeight = FontWeight.ExtraBold, color = if (isDarkTheme) Color.White else IrDeepBlue, fontSize = 15.sp)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Rajesh Sharma (SSE / P-Way)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Emp ID: CR-ENG-84920 • Sec: LNL-PUNE",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isOnline) (if (isDarkTheme) IrDarkGreenContainer else IrGreenContainer) else (if (isDarkTheme) IrDarkSignalRedContainer else IrSignalRedContainer)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(if (isOnline) (if (isDarkTheme) IrDarkGreen else IrGreen) else (if (isDarkTheme) IrDarkSignalRed else IrSignalRed))
                    )
                    Text(
                        text = if (isOnline) "4G Online" else "Offline",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isOnline) (if (isDarkTheme) IrDarkGreen else IrGreen) else (if (isDarkTheme) IrDarkSignalRed else IrSignalRed)
                    )
                }
            }
        }
    }
}

@Composable
private fun BlockItemCard(
    block: BlockSchedule,
    isHindi: Boolean,
    isDarkTheme: Boolean,
    border: BorderStroke,
    onSelectBlock: (BlockSchedule) -> Unit
) {
    val isInProgress = block.status == BlockStatus.IN_PROGRESS
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelectBlock(block) },
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = border
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = StatusShape,
                    color = if (isInProgress) (if (isDarkTheme) IrDarkYellowContainer else Color(0xFFFFF099)) else (if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer)
                ) {
                    Text(
                        text = block.blockCode,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        color = if (isInProgress) (if (isDarkTheme) IrDarkSafetyYellow else IrYellowContainer) else (if (isDarkTheme) IrDarkOnPrimaryContainer else IrDeepBlue)
                    )
                }

                Text(
                    text = if (isInProgress) "ACTIVE / RUNNING" else "SCHEDULED",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 10.sp,
                    color = if (isInProgress) (if (isDarkTheme) IrDarkSafetyYellow else IrYellowContainer) else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = block.line,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = block.division,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("KM BOUNDS", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                    Text("Km ${block.startKm} - ${block.endKm}", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface)
                }
                Column(horizontalAlignment = Alignment.End, modifier = Modifier.weight(1f)) {
                    Text("WINDOW", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                    Text(block.timeWindow, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = { onSelectBlock(block) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isInProgress) (if (isDarkTheme) IrDarkSafetyYellow else IrSafetyYellow) else (if (isDarkTheme) IrDarkPrimary else IrDeepBlue),
                    contentColor = if (isInProgress) Color(0xFF221B00) else (if (isDarkTheme) Color(0xFF001F3F) else Color.White)
                )
            ) {
                Text(
                    text = if (isInProgress) (if (isHindi) "ब्लॉक प्रोटोकॉल दर्ज करें (PTW)" else "Enter Block Protocol (PTW)")
                           else (if (isHindi) "ब्लॉक विवरण देखें" else "Inspect Block Details"),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
