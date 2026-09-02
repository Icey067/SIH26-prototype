package gov.railways.ironsentinel

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import gov.railways.ironsentinel.data.local.AppDatabase
import gov.railways.ironsentinel.data.model.BlockSchedule
import gov.railways.ironsentinel.data.model.SyncQueueItem
import gov.railways.ironsentinel.data.model.SyncStatus
import gov.railways.ironsentinel.data.repository.IronSentinelRepository
import gov.railways.ironsentinel.ui.screens.*
import gov.railways.ironsentinel.ui.theme.IronSentinelTheme
import kotlinx.coroutines.launch

sealed class BottomNavItem(val route: String, val title: String, val titleHi: String, val icon: ImageVector) {
    object Dashboard : BottomNavItem("dashboard", "Blocks", "ब्लॉक बोर्ड", Icons.Default.Dashboard)
    object Demand : BottomNavItem("demand", "Demand", "मांग", Icons.Default.Engineering)
    object Defect : BottomNavItem("defect", "Defect", "दोष दर्ज", Icons.Default.AddAPhoto)
    object Sync : BottomNavItem("sync", "Sync Queue", "सिंक कतार", Icons.Default.Sync)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val database = AppDatabase.getDatabase(applicationContext)
        val repository = IronSentinelRepository(database, applicationContext)

        setContent {
            val systemDark = isSystemInDarkTheme()
            var isDarkTheme by remember { mutableStateOf(systemDark) }

            IronSentinelTheme(darkTheme = isDarkTheme) {
                val navController = rememberNavController()
                val coroutineScope = rememberCoroutineScope()
                var isOnline by remember { mutableStateOf(false) }
                var isHindi by remember { mutableStateOf(false) }

                val initialQueue = remember {
                    mutableStateListOf(
                        SyncQueueItem("DEF-101", "Defect: Loose Switch Point lock", "defect", payloadJson = "{}"),
                        SyncQueueItem("REQ-204", "Demand: Power Isolation (Sub A)", "demand", payloadJson = "{}"),
                        SyncQueueItem("INSP-309", "Inspection: OHE Dropper Slack check", "inspection", payloadJson = "{}")
                    )
                }

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val bottomNavItems = remember {
                    listOf(
                        BottomNavItem.Dashboard,
                        BottomNavItem.Demand,
                        BottomNavItem.Defect,
                        BottomNavItem.Sync
                    )
                }

                // Only show bottom navigation bar when logged into the main app sections
                val showBottomBar by remember(currentRoute) {
                    derivedStateOf { currentRoute in listOf("dashboard", "demand", "defect", "sync") }
                }

                val pendingCount by remember {
                    derivedStateOf { initialQueue.count { it.status == SyncStatus.WAITING_SYNC } }
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = MaterialTheme.colorScheme.background,
                    bottomBar = {
                        if (showBottomBar) {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface,
                                contentColor = MaterialTheme.colorScheme.onSurface
                            ) {
                                bottomNavItems.forEach { item ->
                                    val isSelected = currentRoute == item.route

                                    NavigationBarItem(
                                        icon = {
                                            if (item is BottomNavItem.Sync && pendingCount > 0) {
                                                BadgedBox(badge = {
                                                    Badge(
                                                        containerColor = MaterialTheme.colorScheme.secondary,
                                                        contentColor = MaterialTheme.colorScheme.onSecondary
                                                    ) {
                                                        Text("$pendingCount")
                                                    }
                                                }) {
                                                    Icon(item.icon, contentDescription = item.title)
                                                }
                                            } else {
                                                Icon(item.icon, contentDescription = item.title)
                                            }
                                        },
                                        label = {
                                            Text(
                                                text = if (isHindi) item.titleHi else item.title,
                                                style = MaterialTheme.typography.labelSmall
                                            )
                                        },
                                        selected = isSelected,
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = MaterialTheme.colorScheme.primary,
                                            selectedTextColor = MaterialTheme.colorScheme.primary,
                                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                                        ),
                                        onClick = {
                                            if (currentRoute != item.route) {
                                                navController.navigate(item.route) {
                                                    popUpTo(navController.graph.findStartDestination().id) {
                                                        saveState = true
                                                    }
                                                    launchSingleTop = true
                                                    restoreState = true
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = "login",
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable("login") {
                            LoginScreen(
                                isHindi = isHindi,
                                isDarkTheme = isDarkTheme,
                                onToggleLanguage = { isHindi = !isHindi },
                                onToggleTheme = { isDarkTheme = !isDarkTheme },
                                onLoginSuccess = {
                                    navController.navigate("dashboard") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                }
                            )
                        }

                        composable("dashboard") {
                            DashboardScreen(
                                isOnline = isOnline,
                                isHindi = isHindi,
                                isDarkTheme = isDarkTheme,
                                onToggleLanguage = { isHindi = !isHindi },
                                onToggleTheme = { isDarkTheme = !isDarkTheme },
                                onToggleOnline = { isOnline = !isOnline },
                                onLogout = {
                                    navController.navigate("login") {
                                        popUpTo(0) { inclusive = true }
                                    }
                                },
                                onSelectBlock = { block ->
                                    navController.navigate("execution/${block.id}")
                                },
                                onNavigateToDefect = { navController.navigate("defect") },
                                onNavigateToDemand = { navController.navigate("demand") },
                                onNavigateToSync = { navController.navigate("sync") }
                            )
                        }

                        composable("execution/{blockId}") { backStackEntry ->
                            val blockId = backStackEntry.arguments?.getString("blockId") ?: "B-1024"
                            val mockBlock = BlockSchedule(
                                id = blockId,
                                blockCode = "#$blockId",
                                startKm = "142.4",
                                endKm = "148.8",
                                line = "UP Main Line (Section 4B)",
                                division = "Solapur Division (CR)",
                                timeWindow = "09:30 - 11:30 (2.0 Hrs)",
                                status = gov.railways.ironsentinel.data.model.BlockStatus.IN_PROGRESS
                            )
                            BlockExecutionScreen(
                                block = mockBlock,
                                onBack = { navController.popBackStack() },
                                onCompleteBlock = { navController.popBackStack() }
                            )
                        }

                        composable("defect") {
                            DefectLoggingScreen(
                                onBack = { navController.popBackStack() },
                                onSubmitDefect = { defect ->
                                    coroutineScope.launch {
                                        repository.logDefect(defect)
                                        initialQueue.add(
                                            SyncQueueItem(
                                                id = defect.id,
                                                title = "Defect: ${defect.title}",
                                                category = "defect",
                                                payloadJson = "{}"
                                            )
                                        )
                                        navController.navigate("dashboard") {
                                            popUpTo("dashboard") { inclusive = true }
                                        }
                                    }
                                }
                            )
                        }

                        composable("demand") {
                            BlockDemandScreen(
                                onBack = { navController.popBackStack() },
                                onSubmitDemand = { demand ->
                                    coroutineScope.launch {
                                        repository.submitBlockDemand(demand)
                                        initialQueue.add(
                                            SyncQueueItem(
                                                id = demand.id,
                                                title = "Demand: ${demand.title}",
                                                category = "demand",
                                                payloadJson = "{}"
                                            )
                                        )
                                        navController.navigate("dashboard") {
                                            popUpTo("dashboard") { inclusive = true }
                                        }
                                    }
                                }
                            )
                        }

                        composable("sync") {
                            SyncQueueScreen(
                                queueItems = initialQueue,
                                isOnline = isOnline,
                                onBack = { navController.popBackStack() },
                                onSyncNow = {
                                    coroutineScope.launch {
                                        repository.syncAllPendingNow()
                                        for (i in initialQueue.indices) {
                                            initialQueue[i] = initialQueue[i].copy(status = SyncStatus.SYNCED)
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
