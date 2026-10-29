package br.com.evolupersonal.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

private val darkPalette = darkColorScheme(
    primary = Color(0xFF67A2FF),
    onPrimary = Color(0xFF061C38),
    secondary = Color(0xFF65E2C6),
    onSecondary = Color(0xFF06382B),
    background = Color(0xFF0C111B),
    onBackground = Color(0xFFF2F5FA),
    surface = Color(0xFF171E2B),
    onSurface = Color(0xFFF2F5FA),
    surfaceVariant = Color(0xFF252E3D),
    onSurfaceVariant = Color(0xFFB4C0D0),
    outline = Color(0xFF465368)
)

private val lightPalette = lightColorScheme(
    primary = Color(0xFF245BC3),
    onPrimary = Color.White,
    secondary = Color(0xFF067D69),
    onSecondary = Color.White,
    background = Color(0xFFF4F6FA),
    onBackground = Color(0xFF132036),
    surface = Color.White,
    onSurface = Color(0xFF15233A),
    surfaceVariant = Color(0xFFE6ECF5),
    onSurfaceVariant = Color(0xFF506078),
    outline = Color(0xFFB3BDCB)
)

@Composable
fun EvoluPersonalTheme(
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (dark) darkPalette else lightPalette,
        typography = Typography(),
        shapes = Shapes(
            small = RoundedCornerShape(12.dp),
            medium = RoundedCornerShape(20.dp),
            large = RoundedCornerShape(28.dp)
        ),
        content = content
    )
}
