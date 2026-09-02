package gov.railways.ironsentinel.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gov.railways.ironsentinel.data.model.Department
import gov.railways.ironsentinel.ui.theme.*

private val CardShape = RoundedCornerShape(18.dp)
private val RoleCardShape = RoundedCornerShape(14.dp)
private val RoleButtonShape = RoundedCornerShape(8.dp)
private val FieldShape = RoundedCornerShape(12.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    isHindi: Boolean = false,
    isDarkTheme: Boolean = false,
    onToggleLanguage: () -> Unit = {},
    onToggleTheme: () -> Unit = {},
    onLoginSuccess: () -> Unit
) {
    var employeeId by remember { mutableStateOf("CR-ENG-84920") }
    var pin by remember { mutableStateOf("7742") }
    var selectedDept by remember { mutableStateOf(Department.ENGINEERING) }
    var division by remember { mutableStateOf("Central Railway • Solapur / Pune") }

    val cardBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Shield,
                                contentDescription = null,
                                tint = if (isDarkTheme) IrDarkSafetyYellow else IrDeepBlue,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Text(
                            text = if (isHindi) "रेलवे सुरक्षा लॉगिन" else "Iron Sentinel Auth",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
                },
                actions = {
                    // Theme Switcher Button
                    IconButton(
                        onClick = onToggleTheme,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(
                            if (isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Toggle Theme",
                            tint = if (isDarkTheme) IrDarkSafetyYellow else Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(2.dp))

                    // Language Pill Chip
                    Surface(
                        onClick = onToggleLanguage,
                        shape = RoundedCornerShape(16.dp),
                        color = if (isDarkTheme) IrDarkSafetyYellow else IrSafetyYellow,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.Translate,
                                contentDescription = null,
                                tint = if (isDarkTheme) Color(0xFF221B00) else IrYellowContainer,
                                modifier = Modifier.size(13.dp)
                            )
                            Text(
                                text = if (isHindi) "EN" else "हिंदी",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp,
                                color = if (isDarkTheme) Color(0xFF221B00) else IrYellowContainer
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDarkTheme) IrDarkSurface else IrDeepBlue
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header Shield Emblem
            Box(
                modifier = Modifier
                    .size(68.dp)
                    .clip(CircleShape)
                    .background(if (isDarkTheme) IrDarkPrimaryContainer else IrPrimaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Shield,
                    contentDescription = null,
                    tint = if (isDarkTheme) IrDarkSafetyYellow else IrDeepBlue,
                    modifier = Modifier.size(38.dp)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "IRON SENTINEL",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isDarkTheme) IrDarkPrimary else IrDeepBlue,
                    letterSpacing = 1.5.sp
                )
                Text(
                    text = if (isHindi) "भारतीय रेल • ब्लॉक एवं सुरक्षा नियंत्रण प्रणाली" else "Ministry of Railways • Track Block Safety & Defect Portal",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
            }

            // Quick Role Presets (Below Header Buttons)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoleCardShape,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = cardBorder
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = if (isHindi) "त्वरित भूमिका चयन (डेमो):" else "Quick Demo Profiles:",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                selectedDept = Department.ENGINEERING
                                employeeId = "CR-ENG-84920"
                                pin = "7742"
                                division = "Central Railway • Pune Section"
                            },
                            modifier = Modifier.weight(1f).height(36.dp),
                            shape = RoleButtonShape,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selectedDept == Department.ENGINEERING) (if (isDarkTheme) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selectedDept == Department.ENGINEERING) (if (isDarkTheme) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurface
                            ),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("SSE (P-Way)", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                selectedDept = Department.SIGNAL_TELECOM
                                employeeId = "CR-S&T-55102"
                                pin = "3319"
                                division = "Central Railway • Solapur Section"
                            },
                            modifier = Modifier.weight(1f).height(36.dp),
                            shape = RoleButtonShape,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selectedDept == Department.SIGNAL_TELECOM) (if (isDarkTheme) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selectedDept == Department.SIGNAL_TELECOM) (if (isDarkTheme) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurface
                            ),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("JE (Signal)", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                selectedDept = Department.TRACTION_DISTRIBUTION
                                employeeId = "CR-TRD-90144"
                                pin = "9901"
                                division = "Central Railway • Lonavala Ghat"
                            },
                            modifier = Modifier.weight(1f).height(36.dp),
                            shape = RoleButtonShape,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selectedDept == Department.TRACTION_DISTRIBUTION) (if (isDarkTheme) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selectedDept == Department.TRACTION_DISTRIBUTION) (if (isDarkTheme) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurface
                            ),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("TRD Incharge", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Main Authentication Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = CardShape,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = cardBorder
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = if (isHindi) "अधिकारी प्रमाणीकरण" else "Field Officer Authentication",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    // Department Picker
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = if (isHindi) "विभाग" else "Department",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Department.values().forEach { dept ->
                                val isSelected = dept == selectedDept
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { selectedDept = dept },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) (if (isDarkTheme) IrDarkPrimary else IrDeepBlue) else MaterialTheme.colorScheme.surfaceVariant,
                                    border = if (isSelected) BorderStroke(1.dp, if (isDarkTheme) IrDarkPrimary else IrDeepBlue) else cardBorder
                                ) {
                                    Text(
                                        text = dept.code,
                                        modifier = Modifier.padding(vertical = 8.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                        color = if (isSelected) (if (isDarkTheme) Color(0xFF001F3F) else Color.White) else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }

                    // Employee ID / PF Number
                    OutlinedTextField(
                        value = employeeId,
                        onValueChange = { employeeId = it },
                        label = { Text(if (isHindi) "कर्मचारी आईडी / पीएफ नं." else "Employee ID / PF No.") },
                        leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null, tint = if (isDarkTheme) IrDarkPrimary else IrDeepBlue) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = FieldShape
                    )

                    // Security PIN
                    OutlinedTextField(
                        value = pin,
                        onValueChange = { pin = it },
                        label = { Text(if (isHindi) "सुरक्षा पिन / टोकन" else "Security PIN / Token") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = if (isDarkTheme) IrDarkPrimary else IrDeepBlue) },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = FieldShape
                    )

                    // Division Assignment
                    OutlinedTextField(
                        value = division,
                        onValueChange = { division = it },
                        label = { Text(if (isHindi) "आवंटित मंडल / अनुभाग" else "Assigned Division / Section") },
                        leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = if (isDarkTheme) IrDarkPrimary else IrDeepBlue) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = FieldShape
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    // Login Action Button
                    Button(
                        onClick = onLoginSuccess,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue,
                            contentColor = if (isDarkTheme) Color(0xFF001F3F) else Color.White
                        ),
                        shape = FieldShape,
                        enabled = employeeId.isNotBlank() && pin.isNotBlank()
                    ) {
                        Icon(Icons.Default.Login, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isHindi) "प्रवेश करें एवं फ़ील्ड मोड चालू करें" else "Authenticate & Enter Field Mode",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    // Biometric / Smart Card Login Button
                    OutlinedButton(
                        onClick = onLoginSuccess,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
                        shape = FieldShape,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (isDarkTheme) IrDarkPrimary else IrDeepBlue
                        ),
                        border = BorderStroke(1.5.dp, if (isDarkTheme) IrDarkPrimary else IrDeepBlue)
                    ) {
                        Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(20.dp), tint = if (isDarkTheme) IrDarkPrimary else IrDeepBlue)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isHindi) "बायोमेट्रिक / स्मार्ट कार्ड से लॉगिन" else "Biometric Fingerprint Quick Login",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Bottom Offline & Emergency Access Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = onLoginSuccess,
                    modifier = Modifier.weight(1f).height(42.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = if (isDarkTheme) IrDarkGreen else IrGreen
                    ),
                    border = BorderStroke(1.dp, if (isDarkTheme) IrDarkGreen else IrGreen)
                ) {
                    Icon(Icons.Default.WifiOff, contentDescription = null, tint = if (isDarkTheme) IrDarkGreen else IrGreen, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isHindi) "ऑफलाइन मोड" else "Offline Mode", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = onLoginSuccess,
                    modifier = Modifier.weight(1f).height(42.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDarkTheme) IrDarkSignalRedContainer else MaterialTheme.colorScheme.error,
                        contentColor = if (isDarkTheme) IrDarkSignalRed else Color.White
                    )
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = if (isDarkTheme) IrDarkSignalRed else Color.White, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isHindi) "आपातकालीन SOS" else "SOS Line Access", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Security Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = if (isDarkTheme) IrDarkGreen else IrGreen, modifier = Modifier.size(14.dp))
                Text(
                    text = "Indian Railways CRIS • End-to-End Encrypted Token Security",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
