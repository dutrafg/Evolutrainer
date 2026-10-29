package br.com.evolupersonal.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.com.evolupersonal.data.ExerciseEntity
import br.com.evolupersonal.data.RoutineEntity
import br.com.evolupersonal.data.RoutineExerciseEntity
import br.com.evolupersonal.data.WorkoutSetEntity
import java.util.Calendar

private data class TrainerTab(val title: String, val icon: ImageVector)
private val tabs = listOf(
    TrainerTab("Início", Icons.Outlined.Home),
    TrainerTab("Treinos", Icons.Outlined.FitnessCenter),
    TrainerTab("Biblioteca", Icons.Outlined.ViewList),
    TrainerTab("Evolução", Icons.Outlined.Insights),
    TrainerTab("Perfil", Icons.Outlined.Person)
)

@Composable
fun TrainerApp(viewModel: TrainerViewModel) {
    val students by viewModel.students.collectAsStateWithLifecycle()
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val routines by viewModel.routines.collectAsStateWithLifecycle()
    val routineExercises by viewModel.routineExercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val activeSets by viewModel.activeSets.collectAsStateWithLifecycle()
    val history by viewModel.history.collectAsStateWithLifecycle()
    val allSets by viewModel.allSets.collectAsStateWithLifecycle()
    var tabIndex by rememberSaveable { mutableIntStateOf(0) }
    var showStudents by rememberSaveable { mutableStateOf(false) }
    var selectedRoutineId by rememberSaveable { mutableLongStateOf(-1L) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(viewModel.statusMessage) {
        val message = viewModel.statusMessage
        if (message != null) {
            snackbar.showSnackbar(message)
            if (viewModel.statusMessage == message) viewModel.clearStatus()
        }
    }

    BackHandler(enabled = showStudents) { showStudents = false }

    BackHandler(enabled = !showStudents && tabIndex == 1 && selectedRoutineId > 0L && activeSession == null) {
        selectedRoutineId = -1L
    }

    EvoluPersonalTheme(dark = viewModel.isDarkTheme, weightUnit = viewModel.settings.weightUnit) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 600.dp
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                if (!wide && viewModel.ready && viewModel.settings.initialized) NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    tabs.forEachIndexed { index, tab ->
                        NavigationBarItem(
                            selected = tabIndex == index,
                            enabled = !viewModel.busy,
                            onClick = { tabIndex = index; showStudents = false },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(tab.title, fontSize = 10.sp, maxLines = 1) },
                            alwaysShowLabel = true
                        )
                    }
                }
            }
        ) { inner ->
            if (!viewModel.ready) {
                Column(Modifier.fillMaxSize().padding(inner).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("EvoluPersonal", style = MaterialTheme.typography.headlineMedium)
                    if (viewModel.startupError) {
                        Text("Não foi possível abrir os dados. Tente novamente.")
                        Button(onClick = viewModel::loadSettings, enabled = !viewModel.busy) { Text("Tentar novamente") }
                    } else CircularProgressIndicator()
                }
            } else if (!viewModel.settings.initialized) {
                Box(Modifier.padding(inner)) { ProfileSetupScreen(viewModel) }
            } else Row(Modifier.fillMaxSize().padding(inner)) {
                if (wide) NavigationRail {
                    tabs.forEachIndexed { index, tab ->
                        NavigationRailItem(
                            selected = tabIndex == index,
                            enabled = !viewModel.busy,
                            onClick = { tabIndex = index; showStudents = false },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(tab.title) }
                        )
                    }
                }
                Column(Modifier.weight(1f).fillMaxHeight()) {
                if (viewModel.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                Header(tabIndex, viewModel.profileName)
                when (tabIndex) {
                    0 -> if (showStudents) {
                        StudentsScreen(viewModel, onBack = { showStudents = false })
                    } else HomeScreen(
                        profileName = viewModel.profileName,
                        studentCount = students.size,
                        onStudents = { showStudents = true },
                        routines = routines.filter { !it.isTemplate && !it.archived },
                        activeSession = activeSession != null,
                        completedSessions = history.size,
                        onOpenRoutine = {
                            selectedRoutineId = it
                            tabIndex = 1
                        },
                        onResume = { tabIndex = 1 },
                        onCreate = { selectedRoutineId = -1L; tabIndex = 1 }
                    )
                    1 -> {
                        val active = activeSession
                        if (active != null) {
                            SessionScreen(viewModel, active)
                        } else if (selectedRoutineId > 0L) {
                            RoutineDetailScreen(
                                vm = viewModel, routineId = selectedRoutineId,
                                onBack = { selectedRoutineId = -1L },
                                onOpen = { selectedRoutineId = it },
                                onOpenLibrary = { tabIndex = 2 }
                            )
                        } else {
                            RoutineListScreen(viewModel, onOpen = { selectedRoutineId = it })
                        }
                    }
                    2 -> LibraryScreen(exercises, viewModel.busy, viewModel::saveExercise, viewModel::setExerciseFavorite)
                    3 -> ProgressScreen(routines, history, allSets, students)
                    4 -> ProfileSetupScreen(viewModel)
                }
            }
            }
        }
        }
    }
}

@Composable
private fun Header(tabIndex: Int, profileName: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                "EVOLU",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp
            )
            Text(
                "PERSONAL",
                style = MaterialTheme.typography.labelSmall,
                letterSpacing = 5.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = MaterialTheme.shapes.large
        ) {
            Text(
                if (tabIndex == 0) "OLÁ, " + (profileName.ifBlank { "ATLETA" }).take(14).uppercase()
                else tabs[tabIndex].title.uppercase(),
                modifier = Modifier.widthIn(max = 160.dp).padding(horizontal = 13.dp, vertical = 10.dp),
                maxLines = 1, overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun HomeScreen(
    profileName: String,
    studentCount: Int,
    onStudents: () -> Unit,
    routines: List<RoutineEntity>,
    activeSession: Boolean,
    completedSessions: Int,
    onOpenRoutine: (Long) -> Unit,
    onResume: () -> Unit,
    onCreate: () -> Unit
) {
    val today = (Calendar.getInstance().get(Calendar.DAY_OF_WEEK) + 5) % 7 + 1
    val planned = routines.filter { it.dayOfWeek == today }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(17.dp)
    ) {
        Text(
            "Sua evolução começa aqui.",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            if (profileName.isBlank()) "Monte seus treinos e acompanhe cada conquista."
            else "Organize sua rotina, registre cada série e evolua com consistência.",
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        GradientHero(
            title = if (activeSession) "Seu treino está em andamento"
                    else if (planned.isNotEmpty()) "Hoje é dia de treinar"
                    else "Planeje seu próximo treino",
            subtitle = if (activeSession) "Retome de onde parou. Seus registros estão salvos."
                       else if (planned.isNotEmpty()) "${planned.size} treino(s) programado(s) para hoje"
                       else "Construa seu plano e acompanhe sua evolução",
            action = if (activeSession) "Retomar treino" else if (planned.isNotEmpty()) "Ver treino" else "Criar treino",
            onClick = {
                if (activeSession) onResume()
                else if (planned.isNotEmpty()) onOpenRoutine(planned.first().id)
                else onCreate()
            }
        )
        OutlinedButton(onClick = onStudents, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.People, null)
            Spacer(Modifier.width(8.dp))
            Text("Alunos ($studentCount) · gerenciar")
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Treinos salvos", routines.size.toString(), Modifier.weight(1f))
            MetricCard("Concluídos", completedSessions.toString(), Modifier.weight(1f))
        }
        SectionHeader("Minha programação", "Rotinas cadastradas")
        if (routines.isEmpty()) {
            EmptyState(
                "Nenhuma rotina criada",
                "Crie seu primeiro treino e adicione exercícios pela biblioteca.",
                onCreate,
                "Criar treino"
            )
        } else {
            routines.take(5).forEach {
                RoutineCard(it, onClick = { onOpenRoutine(it.id) })
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun GradientHero(title: String, subtitle: String, action: String, onClick: () -> Unit) {
    val brush = Brush.linearGradient(
        listOf(Color(0xFF173A76), Color(0xFF1B5299), Color(0xFF157B84))
    )
    Column(
        modifier = Modifier.fillMaxWidth().background(brush, MaterialTheme.shapes.large)
            .padding(22.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("SEU PRÓXIMO PASSO", color = Color(0xFFBFE9FF), fontSize = 11.sp, letterSpacing = 2.sp)
        Text(title, color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Color(0xFFDCEEFF))
        Button(
            onClick = onClick,
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF163D72))
        ) { Text(action) }
    }
}

@Composable
private fun MetricCard(title: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp)) {
            Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun SectionHeader(title: String, subtitle: String? = null) {
    Column {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        if (subtitle != null) Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun EmptyState(title: String, description: String, onClick: (() -> Unit)? = null, action: String = "") {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(description, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (onClick != null) Button(onClick = onClick) { Text(action) }
        }
    }
}

@Composable
fun RoutineCard(routine: RoutineEntity, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(17.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(Modifier.weight(1f)) {
                Text(routine.title, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Text(dayName(routine.dayOfWeek), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Outlined.ChevronRight, contentDescription = "Abrir treino", tint = MaterialTheme.colorScheme.primary)
        }
    }
}

fun dayName(day: Int): String = when (day) {
    1 -> "Segunda"
    2 -> "Terça"
    3 -> "Quarta"
    4 -> "Quinta"
    5 -> "Sexta"
    6 -> "Sábado"
    7 -> "Domingo"
    else -> "Sem dia fixo"
}

