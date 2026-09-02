package gov.railways.ironsentinel.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gov.railways.ironsentinel.data.model.DefectLog
import gov.railways.ironsentinel.data.model.LegacySystem
import gov.railways.ironsentinel.data.model.Severity
import gov.railways.ironsentinel.ui.theme.*
import java.util.UUID

private val ChipShape = RoundedCornerShape(10.dp)
private val FieldShape = RoundedCornerShape(12.dp)
private val ViewfinderShape = RoundedCornerShape(16.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DefectLoggingScreen(
    onBack: () -> Unit,
    onSubmitDefect: (DefectLog) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedSystem by remember { mutableStateOf(LegacySystem.TMS) }
    var selectedSeverity by remember { mutableStateOf(Severity.MAJOR) }
    var hasPhoto by remember { mutableStateOf(true) }
    var isRecordingAudio by remember { mutableStateOf(false) }

    // Mock live GPS lock
    val lat = 18.5204
    val lng = 73.8567

    val isDark = MaterialTheme.colorScheme.background == IrDarkBackground
    val cardBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    val primaryBorder = BorderStroke(1.dp, if (isDark) IrDarkPrimary else IrDeepBlue)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Log Track Defect (TMS / SMMS)",
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Camera Viewfinder Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(Color(0xFF141720), ViewfinderShape)
                    .clickable { hasPhoto = !hasPhoto },
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        if (hasPhoto) Icons.Default.CheckCircle else Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = if (hasPhoto) (if (isDark) IrDarkSafetyYellow else IrSafetyYellow) else Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                    Text(
                        if (hasPhoto) "Geo-Tagged Photo Captured ✓" else "Tap to Capture Track Asset Photo",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFF262A36)
                    ) {
                        Text(
                            text = "GPS: 18.5204° N, 73.8567° E (±2.5m)",
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = if (isDark) IrDarkSafetyYellow else IrSafetyYellow,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Defect Title
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Defect Title (e.g. Broken Fishplate, OHE Dropper Slack)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = FieldShape
            )

            // Legacy System Routing Selector
            Text("Target Maintenance System", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LegacySystem.values().forEach { sys ->
                    val isSelected = sys == selectedSystem
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedSystem = sys },
                        shape = ChipShape,
                        color = if (isSelected) (if (isDark) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.surface,
                        border = if (isSelected) primaryBorder else cardBorder
                    ) {
                        Text(
                            text = sys.name,
                            modifier = Modifier.padding(vertical = 10.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (isSelected) (if (isDark) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Severity Level Tagging
            Text("Severity Level", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Severity.values().forEach { sev ->
                    val isSelected = sev == selectedSeverity
                    val bg = if (sev == Severity.CRITICAL) (if (isDark) IrDarkSignalRedContainer else MaterialTheme.colorScheme.error)
                             else if (sev == Severity.MAJOR) (if (isDark) IrDarkYellowContainer else IrYellowContainer)
                             else (if (isDark) IrDarkGreenContainer else IrGreen)
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedSeverity = sev },
                        shape = ChipShape,
                        color = if (isSelected) bg else MaterialTheme.colorScheme.surface,
                        border = if (isSelected) BorderStroke(1.dp, if (sev == Severity.CRITICAL) IrDarkSignalRed else if (sev == Severity.MAJOR) IrDarkSafetyYellow else IrDarkGreen) else cardBorder
                    ) {
                        Text(
                            text = sev.name,
                            modifier = Modifier.padding(vertical = 10.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (isSelected) (if (sev == Severity.MAJOR) (if (isDark) IrDarkSafetyYellow else Color(0xFF221B00)) else if (sev == Severity.CRITICAL) (if (isDark) IrDarkSignalRed else Color.White) else (if (isDark) IrDarkGreen else Color.White)) else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Description & Voice Note
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Detailed Observation / Location notes") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                shape = FieldShape
            )

            // Voice Dictation Button
            OutlinedButton(
                onClick = { isRecordingAudio = !isRecordingAudio },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = if (isRecordingAudio) (if (isDark) IrDarkSignalRedContainer else MaterialTheme.colorScheme.errorContainer) else Color.Transparent
                ),
                border = if (isRecordingAudio) BorderStroke(1.dp, if (isDark) IrDarkSignalRed else MaterialTheme.colorScheme.error) else cardBorder
            ) {
                Icon(
                    if (isRecordingAudio) Icons.Default.MicOff else Icons.Default.Mic,
                    contentDescription = null,
                    tint = if (isRecordingAudio) (if (isDark) IrDarkSignalRed else MaterialTheme.colorScheme.error) else (if (isDark) IrDarkPrimary else IrDeepBlue)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    if (isRecordingAudio) "Recording Field Audio Note (0:04)..." else "Attach Voice Observation",
                    fontWeight = FontWeight.Bold,
                    color = if (isRecordingAudio) (if (isDark) IrDarkSignalRed else MaterialTheme.colorScheme.error) else (if (isDark) IrDarkPrimary else IrDeepBlue)
                )
            }

            // Submit Button
            Button(
                onClick = {
                    val log = DefectLog(
                        id = "DEF-${UUID.randomUUID().toString().take(6).uppercase()}",
                        title = title.ifBlank { "Point Switch Gap Check" },
                        system = selectedSystem,
                        severity = selectedSeverity,
                        latitude = lat,
                        longitude = lng,
                        description = description.ifBlank { "Track fastener bolt loosened at crossing #28." },
                        hasPhoto = hasPhoto
                    )
                    onSubmitDefect(log)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isDark) IrDarkPrimary else IrDeepBlue,
                    contentColor = if (isDark) Color(0xFF001F3F) else Color.White
                ),
                shape = FieldShape
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Queue Offline Defect Report", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
    }
}
