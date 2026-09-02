package gov.railways.ironsentinel.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gov.railways.ironsentinel.data.model.BlockSchedule
import gov.railways.ironsentinel.ui.theme.*
import kotlinx.coroutines.delay

private val CardShape = RoundedCornerShape(16.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BlockExecutionScreen(
    block: BlockSchedule,
    onBack: () -> Unit,
    onCompleteBlock: () -> Unit
) {
    var remainingSeconds by remember { mutableIntStateOf(block.remainingSeconds) }
    var currentStep by remember { mutableIntStateOf(1) }
    var showSosModal by remember { mutableStateOf(false) }
    var showReturnModal by remember { mutableStateOf(false) }
    var enteredReturnPtw by remember { mutableStateOf("") }

    val isDark = MaterialTheme.colorScheme.background == IrDarkBackground
    val cardBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    val greenBorder = BorderStroke(1.dp, if (isDark) IrDarkGreen else IrGreen)

    // Live countdown timer effect
    LaunchedEffect(Unit) {
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds--
        }
    }

    val timeFormatted by remember {
        derivedStateOf {
            val hours = remainingSeconds / 3600
            val minutes = (remainingSeconds % 3600) / 60
            val seconds = remainingSeconds % 60
            String.format("%02d:%02d:%02d", hours, minutes, seconds)
        }
    }

    // Hardware accelerated pulsing animation with graphicsLayer
    val infiniteTransition = rememberInfiniteTransition(label = "sos_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Executing ${block.blockCode}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Km ${block.startKm} - ${block.endKm} • ${block.line}",
                            fontSize = 11.sp,
                            color = if (isDark) IrDarkPrimary else IrPrimaryContainer,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Live Countdown Timer Banner
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = CardShape,
                colors = CardDefaults.cardColors(containerColor = Color(0xFF141720))
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "BLOCK WINDOW TIME REMAINING",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFB0B6C8),
                        letterSpacing = 1.5.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = timeFormatted,
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        color = if (isDark) IrDarkSafetyYellow else IrSafetyYellow
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .background(Color(0xFF262A36), RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = if (isDark) IrDarkSafetyYellow else IrSafetyYellow, modifier = Modifier.size(16.dp))
                        Text(
                            text = "SM PTW Token: PN-778942 (Verified)",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color.White
                        )
                    }
                }
            }

            // 4-Phase Safety Protocol Stepper
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = CardShape,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = cardBorder
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Safety Handshake Protocol", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)

                    val steps = listOf(
                        "1. Station Master PTW Grant Received",
                        "2. Line Protection (Detonators & Banner Flags Placed)",
                        "3. Maintenance / Machine Work In Progress",
                        "4. Track Clear & Longitudinal Level Checked"
                    )

                    steps.forEachIndexed { index, stepName ->
                        val isDone = index < currentStep
                        val isCurrent = index == currentStep
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (isCurrent) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f) else Color.Transparent, RoundedCornerShape(8.dp))
                                .padding(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (isDone) (if (isDark) IrDarkGreen else IrGreen)
                                        else if (isCurrent) (if (isDark) IrDarkPrimary else IrDeepBlue)
                                        else MaterialTheme.colorScheme.surfaceVariant
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isDone) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                } else {
                                    Text(
                                        text = "${index + 1}",
                                        color = if (isCurrent) (if (isDark) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                            Text(
                                text = stepName,
                                fontSize = 13.sp,
                                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCurrent) (if (isDark) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    if (currentStep < 3) {
                        Button(
                            onClick = { currentStep++ },
                            modifier = Modifier.fillMaxWidth().height(44.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isDark) IrDarkPrimary else IrDeepBlue,
                                contentColor = if (isDark) Color(0xFF001F3F) else Color.White
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Confirm & Advance Phase", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // High-Impact SOS Emergency Clear Action with GPU Render Layer
            Button(
                onClick = { showSosModal = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .graphicsLayer {
                        scaleX = pulseScale
                        scaleY = pulseScale
                    },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isDark) IrDarkSignalRedContainer else MaterialTheme.colorScheme.error
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = if (isDark) IrDarkSignalRed else Color.White, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "EMERGENCY CLEAR LINE (SOS)",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                    color = if (isDark) IrDarkSignalRed else Color.White
                )
            }

            // Normal Block Return Protocol
            OutlinedButton(
                onClick = { showReturnModal = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = if (isDark) IrDarkGreen else IrGreen
                ),
                border = greenBorder
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = if (isDark) IrDarkGreen else IrGreen)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Complete & Return Block to Station Master", fontWeight = FontWeight.Bold)
            }
        }
    }

    // SOS Safety Dialog
    if (showSosModal) {
        AlertDialog(
            onDismissRequest = { showSosModal = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("BROADCAST SOS LINE CLEAR?", fontWeight = FontWeight.ExtraBold, color = if (isDark) IrDarkSignalRed else MaterialTheme.colorScheme.error) },
            text = {
                Text(
                    text = "This immediately aborts the block and transmits an urgent track clearance signal to the Solapur Section Controller and Pune Station Master.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSosModal = false
                        onCompleteBlock()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDark) IrDarkSignalRedContainer else MaterialTheme.colorScheme.error,
                        contentColor = if (isDark) IrDarkSignalRed else Color.White
                    )
                ) {
                    Text("YES, CONFIRM SOS")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSosModal = false }) {
                    Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        )
    }

    // Block Return Dialog
    if (showReturnModal) {
        AlertDialog(
            onDismissRequest = { showReturnModal = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Station Master Return Handshake", fontWeight = FontWeight.Bold, color = if (isDark) IrDarkPrimary else IrDeepBlue) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Enter Station Master Acknowledgement Private Number to cancel block authority:", color = MaterialTheme.colorScheme.onSurface)
                    OutlinedTextField(
                        value = enteredReturnPtw,
                        onValueChange = { enteredReturnPtw = it },
                        placeholder = { Text("e.g. PN-9941") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showReturnModal = false
                        onCompleteBlock()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDark) IrDarkPrimary else IrDeepBlue,
                        contentColor = if (isDark) Color(0xFF001F3F) else Color.White
                    ),
                    enabled = enteredReturnPtw.isNotBlank()
                ) {
                    Text("Submit Block Return")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReturnModal = false }) {
                    Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        )
    }
}
