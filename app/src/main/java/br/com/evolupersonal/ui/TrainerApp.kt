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
            viewModel.clearStatus()
            snackbar.showSnackbar(message)
        }
    }

    BackHandler(enabled = showStudents) { showStudents = false }

    BackHandler(enabled = !showStudents && tabIndex == 1 && selectedRoutineId > 0L && activeSession == null) {
        selectedRoutineId = -1L
    }

    EvoluPersonalTheme(dark = viewModel.isDarkTheme) {
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
                        routines = routines,
                        activeSession = activeSession != null,
                        completedSessions = history.size,
                        onOpenRoutine = {
                            selectedRoutineId = it
                            tabIndex = 1
                        },
                        onResume = { tabIndex = 1 },
                        onCreate = { tabIndex = 1 }
                    )
                    1 -> {
                        val active = activeSession
                        if (active != null) {
                            ActiveSessionScreen(
                                routine = routines.firstOrNull { it.id == active.routineId },
                                items = routineExercises.filter { it.routineId == active.routineId },
                                exercises = exercises,
                                sets = activeSets.filter { it.sessionId == active.id },
                                previousSets = allSets.filter { previous ->
                                    history.any { it.id == previous.sessionId && it.studentId == active.studentId }
                                },
                                onRecord = viewModel::recordSet,
                                onFinish = viewModel::finishSession,
                                defaultRestSeconds = viewModel.settings.restSeconds
                            )
                        } else if (selectedRoutineId > 0L) {
                            RoutineDetailScreen(
                                routine = routines.firstOrNull { it.id == selectedRoutineId },
                                items = routineExercises.filter { it.routineId == selectedRoutineId },
                                exercises = exercises,
                                onBack = { selectedRoutineId = -1L },
                                onAddExercise = { viewModel.addExerciseToRoutine(selectedRoutineId, it) },
                                onDuplicate = { viewModel.duplicateRoutine(selectedRoutineId) },
                                onChangeTargets = viewModel::changeTargets,
                                onRemove = viewModel::removeFromRoutine,
                                onMove = { itemId, direction ->
                                    viewModel.reorderRoutineExercise(selectedRoutineId, itemId, direction)
                                },
                                onStart = { energy, sleep, fatigue -> viewModel.startRoutine(selectedRoutineId, energy, sleep, fatigue) },
                                onOpenLibrary = { tabIndex = 2 }
                            )
                        } else {
                            RoutinesScreen(
                                routines = routines,
                                routineExercises = routineExercises,
                                onOpen = { selectedRoutineId = it },
                                onCreate = viewModel::addRoutine,
                                onDuplicate = viewModel::duplicateRoutine
                            )
                        }
                    }
                    2 -> LibraryScreen(exercises, viewModel::addExercise)
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
        Column {
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
                modifier = Modifier.padding(horizontal = 13.dp, vertical = 10.dp),
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

@Composable
private fun RoutinesScreen(
    routines: List<RoutineEntity>,
    routineExercises: List<RoutineExerciseEntity>,
    onOpen: (Long) -> Unit,
    onCreate: (String, Int) -> Unit,
    onDuplicate: (Long) -> Unit
) {
    var creating by remember { mutableStateOf(false) }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        SectionHeader("Meus treinos", "Crie e personalize sua divisão semanal.")
        Button(onClick = { creating = true }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Add, null)
            Spacer(Modifier.width(8.dp))
            Text("Novo treino")
        }
        if (routines.isEmpty()) {
            EmptyState("Você ainda não tem treinos", "Comece criando uma rotina. Depois escolha os exercícios.")
        } else {
            routines.forEach { routine ->
                Column {
                    RoutineCard(routine) { onOpen(routine.id) }
                    val count = routineExercises.count { it.routineId == routine.id }
                    Row(
                        Modifier.fillMaxWidth().padding(start = 17.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "$count exercício(s) associado(s)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        TextButton(onClick = { onDuplicate(routine.id) }) { Text("Duplicar") }
                    }
                }
            }
        }
    }
    if (creating) CreateRoutineDialog(onDismiss = { creating = false }, onCreate = { name, day ->
        onCreate(name, day)
        creating = false
    })
}

@Composable
private fun CreateRoutineDialog(onDismiss: () -> Unit, onCreate: (String, Int) -> Unit) {
    var title by remember { mutableStateOf("") }
    var day by remember { mutableIntStateOf(0) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Criar treino") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = title, onValueChange = { title = it.take(60) },
                    label = { Text("Nome do treino") }, singleLine = true
                )
                Text("Dia programado", style = MaterialTheme.typography.labelMedium)
                Row(Modifier.horizontalScroll(rememberScrollState())) {
                    (0..7).forEach { option ->
                        FilterChip(
                            selected = day == option, onClick = { day = option },
                            label = { Text(dayName(option)) },
                            modifier = Modifier.padding(end = 7.dp)
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onCreate(title, day) }, enabled = title.trim().length >= 2) {
                Text("Criar")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } }
    )
}

@Composable
private fun RoutineDetailScreen(
    routine: RoutineEntity?,
    items: List<RoutineExerciseEntity>,
    exercises: List<ExerciseEntity>,
    onBack: () -> Unit,
    onAddExercise: (Long) -> Unit,
    onDuplicate: () -> Unit,
    onChangeTargets: (Long, Int, Int) -> Unit,
    onRemove: (Long) -> Unit,
    onMove: (Long, Int) -> Unit,
    onStart: (Int?, Int?, Int?) -> Unit,
    onOpenLibrary: () -> Unit
) {
    var choosing by remember { mutableStateOf(false) }
    var showCheckIn by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<RoutineExerciseEntity?>(null) }
    var removing by remember { mutableStateOf<RoutineExerciseEntity?>(null) }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        TextButton(onClick = onBack) {
            Icon(Icons.Outlined.ArrowBack, null)
            Spacer(Modifier.width(6.dp))
            Text("Todos os treinos")
        }
        SectionHeader(routine?.title ?: "Treino", dayName(routine?.dayOfWeek ?: 0))
        OutlinedButton(onClick = onDuplicate, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.ContentCopy, null)
            Spacer(Modifier.width(7.dp))
            Text("Duplicar esta ficha")
        }
        if (items.isEmpty()) {
            EmptyState(
                "Treino sem exercícios",
                "Adicione exercícios da sua biblioteca para começar a registrar séries."
            )
        } else {
            items.forEachIndexed { index, item ->
                val exercise = exercises.firstOrNull { it.id == item.exerciseId }
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.fillMaxWidth().padding(17.dp)) {
                        Text(exercise?.name ?: "Exercício", fontWeight = FontWeight.SemiBold)
                        Text(
                            "${exercise?.muscleGroup ?: "Grupo muscular"} · ${item.targetSets} × ${item.targetReps}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = { editing = item }) { Text("Editar séries") }
                            TextButton(onClick = { removing = item }) { Text("Remover") }
                            Spacer(Modifier.weight(1f))
                            IconButton(
                                onClick = { onMove(item.id, -1) },
                                enabled = index > 0
                            ) { Icon(Icons.Outlined.ArrowUpward, contentDescription = "Mover para cima") }
                            IconButton(
                                onClick = { onMove(item.id, 1) },
                                enabled = index < items.lastIndex
                            ) { Icon(Icons.Outlined.ArrowDownward, contentDescription = "Mover para baixo") }
                        }
                    }
                }
            }
        }
        OutlinedButton(onClick = { choosing = true }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Add, null)
            Spacer(Modifier.width(8.dp))
            Text("Adicionar exercício")
        }
        Button(onClick = { showCheckIn = true }, enabled = items.isNotEmpty(), modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.PlayArrow, null)
            Spacer(Modifier.width(8.dp))
            Text("Iniciar treino")
        }
    }
    val editItem = editing
    if (editItem != null) {
        var setsDraft by remember(editItem.id) { mutableStateOf(editItem.targetSets.toString()) }
        var repsDraft by remember(editItem.id) { mutableStateOf(editItem.targetReps.toString()) }
        val validSets = setsDraft.toIntOrNull()
        val validReps = repsDraft.toIntOrNull()
        AlertDialog(
            onDismissRequest = { editing = null },
            title = { Text("Editar prescrição") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        setsDraft, { setsDraft = it.take(2) },
                        label = { Text("Número de séries (1–15)") }, singleLine = true
                    )
                    OutlinedTextField(
                        repsDraft, { repsDraft = it.take(4) },
                        label = { Text("Repetições-alvo") }, singleLine = true
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = validSets != null && validSets in 1..15 &&
                        validReps != null && validReps in 1..1000,
                    onClick = {
                        if (validSets != null && validReps != null) {
                            onChangeTargets(editItem.id, validSets, validReps)
                            editing = null
                        }
                    }
                ) { Text("Salvar") }
            },
            dismissButton = { TextButton(onClick = { editing = null }) { Text("Cancelar") } }
        )
    }
    val removeItem = removing
    if (removeItem != null) {
        AlertDialog(
            onDismissRequest = { removing = null },
            title = { Text("Remover exercício da ficha?") },
            text = { Text("O exercício sai desta ficha, mas os treinos já realizados permanecem no histórico.") },
            confirmButton = {
                TextButton(onClick = { onRemove(removeItem.id); removing = null }) { Text("Remover") }
            },
            dismissButton = { TextButton(onClick = { removing = null }) { Text("Cancelar") } }
        )
    }

    if (showCheckIn) {
        var energy by remember { mutableFloatStateOf(3f) }
        var sleep by remember { mutableFloatStateOf(3f) }
        var fatigue by remember { mutableFloatStateOf(3f) }
        AlertDialog(
            onDismissRequest = { showCheckIn = false },
            title = { Text("Check-in antes do treino") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Opcional: registre como você está se sentindo. Não é uma avaliação clínica.")
                    Text("Energia: ${energy.toInt()}/5")
                    Slider(value = energy, onValueChange = { energy = it }, valueRange = 1f..5f, steps = 3)
                    Text("Qualidade do sono: ${sleep.toInt()}/5")
                    Slider(value = sleep, onValueChange = { sleep = it }, valueRange = 1f..5f, steps = 3)
                    Text("Fadiga percebida: ${fatigue.toInt()}/5 (5 = maior fadiga)")
                    Slider(value = fatigue, onValueChange = { fatigue = it }, valueRange = 1f..5f, steps = 3)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    onStart(energy.toInt(), sleep.toInt(), fatigue.toInt())
                    showCheckIn = false
                }) { Text("Registrar e iniciar") }
            },
            dismissButton = {
                TextButton(onClick = { onStart(null, null, null); showCheckIn = false }) { Text("Pular") }
            }
        )
    }
    if (choosing) {
        AlertDialog(
            onDismissRequest = { choosing = false },
            title = { Text("Adicionar exercício") },
            text = {
                Column(Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
                    if (exercises.isEmpty()) {
                        Text("Biblioteca vazia. Cadastre um exercício primeiro.")
                        TextButton(onClick = { choosing = false; onOpenLibrary() }) { Text("Ir à biblioteca") }
                    } else {
                        exercises.filter { exercise -> items.none { it.exerciseId == exercise.id } }
                            .forEach { exercise ->
                                TextButton(
                                    onClick = { onAddExercise(exercise.id); choosing = false },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("${exercise.name} — ${exercise.muscleGroup}", maxLines = 2)
                                }
                            }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { choosing = false }) { Text("Fechar") } }
        )
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

