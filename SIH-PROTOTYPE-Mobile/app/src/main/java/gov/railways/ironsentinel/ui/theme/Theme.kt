package gov.railways.ironsentinel.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = IrDeepBlue,
    onPrimary = Color.White,
    primaryContainer = IrPrimaryContainer,
    onPrimaryContainer = IrOnPrimaryContainer,
    secondary = IrSafetyYellow,
    onSecondary = Color(0xFF221B00),
    secondaryContainer = Color(0xFFFFF099),
    onSecondaryContainer = Color(0xFF221B00),
    error = IrSignalRed,
    onError = Color.White,
    errorContainer = IrSignalRedContainer,
    onErrorContainer = Color(0xFF410002),
    background = IrSurface,
    onBackground = IrTextPrimary,
    surface = Color.White,
    onSurface = IrTextPrimary,
    surfaceVariant = IrSurfaceVariant,
    onSurfaceVariant = IrTextSecondary,
    outline = IrOutline
)

private val DarkColorScheme = darkColorScheme(
    primary = IrDarkPrimary,
    onPrimary = Color(0xFF001F3F),
    primaryContainer = IrDarkPrimaryContainer,
    onPrimaryContainer = IrDarkOnPrimaryContainer,
    secondary = IrDarkSafetyYellow,
    onSecondary = Color(0xFF241A00),
    secondaryContainer = IrDarkYellowContainer,
    onSecondaryContainer = IrDarkSafetyYellow,
    error = IrDarkSignalRed,
    onError = Color(0xFF600005),
    errorContainer = IrDarkSignalRedContainer,
    onErrorContainer = Color(0xFFFFDAD6),
    background = IrDarkBackground,
    onBackground = IrDarkTextPrimary,
    surface = IrDarkSurface,
    onSurface = IrDarkTextPrimary,
    surfaceVariant = IrDarkSurfaceVariant,
    onSurfaceVariant = IrDarkTextSecondary,
    outline = IrDarkOutline
)

@Composable
fun IronSentinelTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = if (darkTheme) IrDarkBackground.toArgb() else IrDeepBlue.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
