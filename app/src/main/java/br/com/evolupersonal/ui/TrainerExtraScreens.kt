package br.com.evolupersonal.ui

import androidx.compose.foundation.background
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
import br.com.evolupersonal.data.ExerciseEntity
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
fun LibraryScreen(
    exercises: List<ExerciseEntity>,
    onCreate: (String, String) -> Unit
) {
    var creating by remember { mutableStateOf(false) }
    var filter by rememberSaveable { mutableStateOf("") }
    val visible = exercises.filter {
        filter.isBlank() ||
            it.name.contains(filter, ignoreCase = true) ||
            it.muscleGroup.contains(filter, ignoreCase = true)
    }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        SectionHeader("Biblioteca", "Exercícios próprios. Biblioteca 3D será integrada em outra etapa.")
        OutlinedTextField(
            value = filter,
            onValueChange = { filter = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Buscar exercício ou grupo muscular") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Outlined.Search, null) }
        )
        Button(onClick = { creating = true }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Add, null)
            Spacer(Modifier.width(8.dp))
            Text("Cadastrar exercício")
        }
        Text(
            "${visible.size} exercício(s) encontrado(s)",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
        if (visible.isEmpty()) {
            EmptyState(
                "Nenhum exercício encontrado",
                if (exercises.isEmpty()) "Cadastre um exercício manual. Os arquivos 3D serão integrados sem duplicação."
                else "Tente outra busca."
            )
        } else {
            visible.forEach { exercise ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            shape = MaterialTheme.shapes.medium,
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Icon(
                                Icons.Outlined.FitnessCenter, null,
                                modifier = Modifier.padding(13.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        Column {
                            Text(exercise.name, fontWeight = FontWeight.SemiBold)
                            Text(
                                exercise.muscleGroup,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
    if (creating) {
        var name by remember { mutableStateOf("") }
        var group by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { creating = false },
            title = { Text("Cadastrar exercício") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        name, onValueChange = { name = it.take(80) },
                        label = { Text("Nome do exercício") }, singleLine = true
                    )
                    OutlinedTextField(
                        group, onValueChange = { group = it.take(50) },
                        label = { Text("Grupo muscular") }, singleLine = true
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = name.trim().length >= 2 && group.trim().length >= 2,
                    onClick = { onCreate(name, group); creating = false }
                ) { Text("Salvar") }
            },
            dismissButton = { TextButton(onClick = { creating = false }) { Text("Cancelar") } }
        )
    }
}

@Composable
fun ActiveSessionScreen(
    routine: RoutineEntity?,
    items: List<RoutineExerciseEntity>,
    exercises: List<ExerciseEntity>,
    sets: List<WorkoutSetEntity>,
    onRecord: (Long, String, String, String) -> Unit,
    onFinish: () -> Unit
) {
    var showConfirmation by remember { mutableStateOf(false) }
    var restSeconds by rememberSaveable { mutableIntStateOf(0) }
    var timerSequence by rememberSaveable { mutableIntStateOf(0) }

    LaunchedEffect(timerSequence) {
        while (restSeconds > 0) {
            delay(1000)
            restSeconds -= 1
        }
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
                FilledTonalButton(onClick = { restSeconds = 90; timerSequence += 1 }) {
                    Icon(Icons.Outlined.Timer, null)
                    Spacer(Modifier.width(6.dp))
                    Text("90 segundos")
                }
            }
        }
        items.forEach { item ->
            val exercise = exercises.firstOrNull { it.id == item.exerciseId }
            val exerciseSets = sets.filter { it.exerciseId == item.exerciseId }
            ExerciseEntryCard(
                name = exercise?.name ?: "Exercício",
                muscleGroup = exercise?.muscleGroup ?: "",
                target = "${item.targetSets} séries × ${item.targetReps} repetições",
                sets = exerciseSets,
                onRecord = { reps, weight, rir -> onRecord(item.exerciseId, reps, weight, rir) }
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
    name: String,
    muscleGroup: String,
    target: String,
    sets: List<WorkoutSetEntity>,
    onRecord: (String, String, String) -> Unit
) {
    var reps by rememberSaveable(name) { mutableStateOf("10") }
    var load by rememberSaveable(name) { mutableStateOf("0") }
    var rir by rememberSaveable(name) { mutableStateOf("") }

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
            if (sets.isNotEmpty()) {
                sets.forEach { recorded ->
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Série ${recorded.setNumber}", color = MaterialTheme.colorScheme.secondary)
                        Text("${recorded.repetitions} rep. · ${formatKg(recorded.loadKg)}")
                        Text("RIR ${recorded.rir?.toString() ?: "—"}")
                    }
                }
                HorizontalDivider()
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    reps, onValueChange = { reps = it.take(4) },
                    label = { Text("Reps") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    load, onValueChange = { load = it.take(8) },
                    label = { Text("Kg") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    rir, onValueChange = { rir = it.take(2) },
                    label = { Text("RIR") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }
            FilledTonalButton(
                onClick = { onRecord(reps, load, rir) },
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
    allSets: List<WorkoutSetEntity>
) {
    val completedIds = history.map { it.id }.toSet()
    val completedSets = allSets.filter { it.sessionId in completedIds }
    val volume = completedSets.sumOf { WorkoutMath.volumeKg(it.repetitions, it.loadKg) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(15.dp)
    ) {
        SectionHeader("Sua evolução", "Histórico de treinos registrados no dispositivo.")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryCard("Concluídos", history.size.toString(), Modifier.weight(1f))
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
        SectionHeader("Histórico", "Sessões concluídas recentemente")
        if (history.isEmpty()) {
            EmptyState(
                "Nenhuma sessão concluída",
                "Quando concluir um treino com séries registradas, os dados aparecerão aqui."
            )
        } else {
            history.forEach { session ->
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

@Composable
fun ProfileScreen(
    name: String,
    dark: Boolean,
    onNameChanged: (String) -> Unit,
    onThemeChanged: (Boolean) -> Unit
) {
    var draftName by remember(name) { mutableStateOf(name) }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        SectionHeader("Seu perfil", "Preferências salvas neste dispositivo.")
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = draftName,
                    onValueChange = { draftName = it.take(60) },
                    label = { Text("Como prefere ser chamado?") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Button(onClick = { onNameChanged(draftName.trim()) }, modifier = Modifier.fillMaxWidth()) {
                    Text("Salvar nome")
                }
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Row(
                Modifier.fillMaxWidth().padding(18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Modo escuro", fontWeight = FontWeight.SemiBold)
                    Text("Alterar a aparência do EvoluPersonal", style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = dark, onCheckedChange = onThemeChanged)
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(18.dp)) {
                Text("EvoluPersonal 0.1.0-dev", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(5.dp))
                Text("Android nativo · Dados offline · Biblioteca 3D em integração futura",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

private val ptBr = Locale.forLanguageTag("pt-BR")

private fun formatKg(value: Double): String =
    NumberFormat.getNumberInstance(ptBr).apply { maximumFractionDigits = 2 }.format(value) + " kg"

private fun formatDate(timestamp: Long): String =
    SimpleDateFormat("dd/MM/yyyy 'às' HH:mm", ptBr).format(Date(timestamp))
