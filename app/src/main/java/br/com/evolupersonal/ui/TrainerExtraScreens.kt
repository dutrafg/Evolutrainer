package br.com.evolupersonal.ui

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.core.WorkoutMath
import br.com.evolupersonal.core.TrainingInsights
import br.com.evolupersonal.data.ExerciseEntity
import br.com.evolupersonal.data.StudentEntity
import br.com.evolupersonal.data.RoutineEntity
import br.com.evolupersonal.data.RoutineExerciseEntity
import br.com.evolupersonal.data.WorkoutSessionEntity
import br.com.evolupersonal.data.WorkoutSetEntity
import kotlinx.coroutines.delay
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ActiveSessionScreen(
    routine: RoutineEntity?,
    items: List<RoutineExerciseEntity>,
    exercises: List<ExerciseEntity>,
    sets: List<WorkoutSetEntity>,
    previousSets: List<WorkoutSetEntity>,
    onRecord: (Long, String, String, String, String, String, String) -> Unit,
    onFinish: () -> Unit,
    defaultRestSeconds: Int = 90
) {
    var showConfirmation by remember { mutableStateOf(false) }
    var restUntil by rememberSaveable { mutableLongStateOf(0L) }
    var restSeconds by remember { mutableIntStateOf(0) }

    LaunchedEffect(restUntil) {
        while (restUntil > System.currentTimeMillis()) {
            restSeconds = ((restUntil - System.currentTimeMillis() + 999) / 1000).toInt()
            delay(250)
        }
        restSeconds = 0
    }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            "TREINO EM ANDAMENTO",
            color = MaterialTheme.colorScheme.secondary,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold
        )
        SectionHeader(routine?.title ?: "Treino em andamento", "Registre suas séries abaixo.")
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Descanso", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "%02d:%02d".format(Locale.US, restSeconds / 60, restSeconds % 60),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Row(Modifier.horizontalScroll(rememberScrollState())) {
                    listOf(defaultRestSeconds, 60, 90, 120).distinct().forEach { seconds ->
                        TextButton(onClick = { restUntil = System.currentTimeMillis() + seconds * 1000L }) {
                            Text("${seconds}s")
                        }
                    }
                    TextButton(onClick = { restUntil = 0L }) { Text("Parar") }
                }
            }
        }
        items.forEach { item ->
            val exercise = exercises.firstOrNull { it.id == item.exerciseId }
            val exerciseSets = sets.filter { it.exerciseId == item.exerciseId }
            ExerciseEntryCard(
                exerciseId = item.exerciseId,
                name = exercise?.name ?: "Exercício",
                muscleGroup = exercise?.muscleGroup ?: "",
                target = "${item.targetSets} séries × ${item.targetReps} repetições",
                sets = exerciseSets,
                previous = previousSets.filter { it.exerciseId == item.exerciseId }
                    .maxByOrNull { it.performedAt },
                targetReps = item.targetReps,
                onRecord = { reps, weight, rir, setType, rpe, note ->
                    onRecord(item.exerciseId, reps, weight, rir, setType, rpe, note)
                }
            )
        }
        Button(onClick = { showConfirmation = true }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.CheckCircle, null)
            Spacer(Modifier.width(8.dp))
            Text("Concluir treino")
        }
        Text(
            "Os dados são salvos localmente após cada série. Você pode sair e retornar.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(12.dp))
    }
    if (showConfirmation) {
        AlertDialog(
            onDismissRequest = { showConfirmation = false },
            title = { Text("Concluir treino?") },
            text = { Text("As séries registradas serão mantidas no histórico. Esta sessão será encerrada.") },
            confirmButton = {
                TextButton(onClick = { onFinish(); showConfirmation = false }) { Text("Concluir") }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmation = false }) { Text("Continuar treinando") }
            }
        )
    }
}

@Composable
private fun ExerciseEntryCard(
    exerciseId: Long,
    name: String,
    muscleGroup: String,
    target: String,
    targetReps: Int,
    sets: List<WorkoutSetEntity>,
    previous: WorkoutSetEntity?,
    onRecord: (String, String, String, String, String, String) -> Unit
) {
    var reps by rememberSaveable(exerciseId) { mutableStateOf(targetReps.toString()) }
    val weightUnit = LocalWeightUnit.current
    var load by rememberSaveable(exerciseId, weightUnit) { mutableStateOf("0") }
    var rir by rememberSaveable(exerciseId) { mutableStateOf("") }
    var rpe by rememberSaveable(exerciseId) { mutableStateOf("") }
    var notes by rememberSaveable(exerciseId) { mutableStateOf("") }
    var selectedType by rememberSaveable(exerciseId) { mutableStateOf("NORMAL") }
    val typeNames = listOf(
        "AQUECIMENTO" to "Aquec.", "NORMAL" to "Trabalho",
        "BACKOFF" to "Back-off", "DROP" to "Drop", "FALHA" to "Falha"
    )
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            Modifier.fillMaxWidth().padding(17.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                "$muscleGroup · $target",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            if (previous != null) {
                Text(
                    "Última sessão: ${previous.repetitions} rep. × ${formatKg(previous.loadKg)}" +
                        " · RIR ${previous.rir ?: "—"}",
                    color = MaterialTheme.colorScheme.secondary,
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    TrainingInsights.progressionSuggestion(
                        previous.loadKg, previous.repetitions, targetReps, previous.rir
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (sets.isNotEmpty()) {
                sets.forEach { recorded ->
                    Column {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("#${recorded.setNumber} · ${recorded.setType}", color = MaterialTheme.colorScheme.secondary)
                            Text("${recorded.repetitions} × ${formatKg(recorded.loadKg)}")
                        }
                        if (recorded.rpe != null || recorded.rir != null) {
                            Text(
                                "RIR ${recorded.rir ?: "—"} · RPE ${recorded.rpe ?: "—"}",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                }
                HorizontalDivider()
            }
            Text("Tipo de série", style = MaterialTheme.typography.labelMedium)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                typeNames.forEach { (id, label) ->
                    FilterChip(selected = selectedType == id, onClick = { selectedType = id }, label = { Text(label) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    reps, onValueChange = { reps = it.take(4) },
                    label = { Text("Reps") },
                    modifier = Modifier.weight(1f), singleLine = true
                )
                OutlinedTextField(
                    load, onValueChange = { load = it.take(8) },
                    label = { Text(weightUnit) },
                    modifier = Modifier.weight(1f), singleLine = true
                )
                OutlinedTextField(
                    rir, onValueChange = { rir = it.take(2) },
                    label = { Text("RIR") },
                    modifier = Modifier.weight(1f), singleLine = true
                )
                OutlinedTextField(
                    rpe, onValueChange = { rpe = it.take(2) },
                    label = { Text("RPE") },
                    modifier = Modifier.weight(1f), singleLine = true
                )
            }
            OutlinedTextField(
                notes, onValueChange = { notes = it.take(180) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Observação da série (opcional)") },
                maxLines = 2
            )
            FilledTonalButton(
                onClick = { onRecord(reps, load, rir, selectedType, rpe, notes) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Outlined.Add, null)
                Spacer(Modifier.width(6.dp))
                Text("Registrar série ${sets.size + 1}")
            }
        }
    }
}

@Composable
fun ProgressScreen(
    routines: List<RoutineEntity>,
    history: List<WorkoutSessionEntity>,
    allSets: List<WorkoutSetEntity>,
    students: List<StudentEntity>
) {
    var studentFilter by rememberSaveable { mutableLongStateOf(-2L) }
    val visibleHistory = when (studentFilter) {
        -2L -> history
        -1L -> history.filter { it.studentId == null }
        else -> history.filter { it.studentId == studentFilter }
    }
    val completedIds = visibleHistory.map { it.id }.toSet()
    val completedSets = allSets.filter { it.sessionId in completedIds }
    val volume = completedSets.sumOf { WorkoutMath.volumeKg(it.repetitions, it.loadKg) }
    val workingSets = TrainingInsights.workSetCount(completedSets.map { it.setType })
    val topEstimated1Rm = completedSets.mapNotNull {
        TrainingInsights.estimatedOneRepMax(it.loadKg, it.repetitions)
    }.maxOrNull()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(15.dp)
    ) {
        SectionHeader("Sua evolução", "Histórico de treinos registrados no dispositivo.")
        if (students.isNotEmpty()) {
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(-2L to "Todos", -1L to "Pessoal").plus(students.map { it.id to it.name })
                    .forEach { (id, label) ->
                        FilterChip(
                            selected = studentFilter == id,
                            onClick = { studentFilter = id },
                            label = { Text(label) }
                        )
                    }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryCard("Concluídos", visibleHistory.size.toString(), Modifier.weight(1f))
            SummaryCard("Séries", completedSets.size.toString(), Modifier.weight(1f))
        }
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(19.dp)) {
                Text("Volume acumulado (até 30 sessões)", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    formatKg(volume),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    "Soma de carga × repetições de séries registradas; não é gasto calórico.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(19.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Séries de trabalho registradas: $workingSets")
                Text(
                    "Maior 1RM estimada (até 10 repetições): " +
                        (topEstimated1Rm?.let { formatKg(it) } ?: "Ainda sem estimativa"),
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    "Estimativa indireta (Epley), não teste máximo. Séries por grupo muscular serão detalhadas depois.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        SectionHeader("Histórico", "Sessões concluídas recentemente")
        if (visibleHistory.isEmpty()) {
            EmptyState(
                "Nenhuma sessão concluída",
                "Quando concluir um treino com séries registradas, os dados aparecerão aqui."
            )
        } else {
            visibleHistory.forEach { session ->
                val sessionSets = completedSets.filter { it.sessionId == session.id }
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(
                            routines.firstOrNull { it.id == session.routineId }?.title ?: "Treino",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            formatDate(session.finishedAt ?: session.startedAt),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            students.firstOrNull { it.id == session.studentId }?.name ?: "Treino pessoal",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (session.energy != null || session.sleep != null || session.fatigue != null) {
                            Text(
                                "Check-in · energia ${session.energy ?: "—"}/5 · sono ${session.sleep ?: "—"}/5 · fadiga ${session.fatigue ?: "—"}/5",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                        Text(
                            "${sessionSets.size} séries · ${formatKg(sessionSets.sumOf { WorkoutMath.volumeKg(it.repetitions, it.loadKg) })}",
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(label: String, value: String, modifier: Modifier) {
    Card(
        modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        }
    }
}

private val ptBr = Locale.forLanguageTag("pt-BR")

@Composable
private fun formatKg(value: Double): String {
    val unit = LocalWeightUnit.current
    val converted = br.com.evolupersonal.core.WeightUnits.fromKg(value, unit)
    return NumberFormat.getNumberInstance(ptBr).apply { maximumFractionDigits = 2 }.format(converted) + " " + unit
}

private fun formatDate(timestamp: Long): String =
    SimpleDateFormat("dd/MM/yyyy 'às' HH:mm", ptBr).format(Date(timestamp))

