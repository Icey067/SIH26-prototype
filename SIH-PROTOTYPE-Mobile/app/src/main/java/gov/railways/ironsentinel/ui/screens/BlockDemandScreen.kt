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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gov.railways.ironsentinel.data.model.BlockDemand
import gov.railways.ironsentinel.data.model.Department
import gov.railways.ironsentinel.data.model.Machinery
import gov.railways.ironsentinel.data.model.Severity
import gov.railways.ironsentinel.ui.theme.*
import java.util.UUID

private val CardShape = RoundedCornerShape(10.dp)
private val FieldShape = RoundedCornerShape(12.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BlockDemandScreen(
    onBack: () -> Unit,
    onSubmitDemand: (BlockDemand) -> Unit
) {
    var title by remember { mutableStateOf("Deep Screening & Tamping") }
    var selectedDept by remember { mutableStateOf(Department.ENGINEERING) }
    var startKm by remember { mutableStateOf("145.5") }
    var endKm by remember { mutableStateOf("152.2") }
    var duration by remember { mutableDoubleStateOf(2.5) }
    var selectedMachinery by remember { mutableStateOf(setOf(Machinery.BCM, Machinery.CSM)) }
    var urgency by remember { mutableStateOf(Severity.MAJOR) }

    val isDark = MaterialTheme.colorScheme.background == IrDarkBackground
    val cardBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    val primaryBorder = BorderStroke(1.dp, if (isDark) IrDarkPrimary else IrDeepBlue)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Block Requisition (COA / TMS)",
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
            // Department Selection
            Text("Requesting Department", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Department.values().forEach { dept ->
                    val isSelected = dept == selectedDept
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedDept = dept },
                        shape = CardShape,
                        color = if (isSelected) (if (isDark) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.surface,
                        border = if (isSelected) primaryBorder else cardBorder
                    ) {
                        Text(
                            text = dept.code,
                            modifier = Modifier.padding(vertical = 10.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (isSelected) (if (isDark) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Kilometric Bounds
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = startKm,
                    onValueChange = { startKm = it },
                    label = { Text("Start Km") },
                    modifier = Modifier.weight(1f),
                    shape = FieldShape
                )
                OutlinedTextField(
                    value = endKm,
                    onValueChange = { endKm = it },
                    label = { Text("End Km") },
                    modifier = Modifier.weight(1f),
                    shape = FieldShape
                )
            }

            // Requested Duration
            Text("Requested Window: ${duration} Hours", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
            Slider(
                value = duration.toFloat(),
                onValueChange = { duration = (it * 2).toInt() / 2.0 },
                valueRange = 1f..6f,
                steps = 9,
                colors = SliderDefaults.colors(
                    thumbColor = if (isDark) IrDarkPrimary else IrDeepBlue,
                    activeTrackColor = if (isDark) IrDarkPrimary else IrDeepBlue
                )
            )

            // Heavy Machinery Allocation
            Text("Heavy Track Machinery Required", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
            Machinery.values().forEach { mach ->
                val isChecked = selectedMachinery.contains(mach)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            selectedMachinery = if (isChecked) {
                                selectedMachinery - mach
                            } else {
                                selectedMachinery + mach
                            }
                        },
                    shape = CardShape,
                    colors = CardDefaults.cardColors(
                        containerColor = if (isChecked) (if (isDark) IrDarkPrimaryContainer else IrPrimaryContainer) else MaterialTheme.colorScheme.surface
                    ),
                    border = cardBorder
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                    ) {
                        Text(
                            text = mach.label,
                            fontSize = 13.sp,
                            fontWeight = if (isChecked) FontWeight.Bold else FontWeight.Normal,
                            color = if (isChecked) (if (isDark) IrDarkOnPrimaryContainer else IrDeepBlue) else MaterialTheme.colorScheme.onSurface
                        )
                        Checkbox(
                            checked = isChecked,
                            onCheckedChange = { checked ->
                                selectedMachinery = if (checked) selectedMachinery + mach else selectedMachinery - mach
                            },
                            colors = CheckboxDefaults.colors(
                                checkedColor = if (isDark) IrDarkPrimary else IrDeepBlue,
                                checkmarkColor = if (isDark) Color(0xFF001F3F) else Color.White
                            )
                        )
                    }
                }
            }

            // Submit Button
            Button(
                onClick = {
                    val req = BlockDemand(
                        id = "REQ-${UUID.randomUUID().toString().take(6).uppercase()}",
                        title = title,
                        department = selectedDept,
                        startKm = startKm,
                        endKm = endKm,
                        durationHours = duration,
                        machineryListJson = selectedMachinery.joinToString { it.name },
                        urgency = urgency
                    )
                    onSubmitDemand(req)
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
                Icon(Icons.Default.Send, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Queue Requisition Demand", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
    }
}
