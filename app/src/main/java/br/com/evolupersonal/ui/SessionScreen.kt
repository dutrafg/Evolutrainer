package br.com.evolupersonal.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.core.IntervalClock
import br.com.evolupersonal.core.Prescription
import br.com.evolupersonal.core.WeightUnits
import br.com.evolupersonal.data.*
import kotlinx.coroutines.delay

@Composable
fun SessionScreen(vm: TrainerViewModel, session: WorkoutSessionEntity) {
    val routines by vm.routines.collectAsState(); val allItems by vm.routineExercises.collectAsState()
    val exercises by vm.exercises.collectAsState(); val sets by vm.activeSets.collectAsState()
    val allSets by vm.allSets.collectAsState(); val history by vm.history.collectAsState()
    val state = session.runtime()
    val items = allItems.filter { it.routineId == session.routineId }.sortedBy { it.sortOrder }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var finish by rememberSaveable { mutableStateOf(false) }
    var replacing by rememberSaveable { mutableLongStateOf(0) }
    var search by rememberSaveable { mutableStateOf("") }
    DisposableEffect(session.id) {
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        val ticker = object : Runnable {
            override fun run() { now = System.currentTimeMillis(); handler.postDelayed(this, 1000) }
        }
        handler.postDelayed(ticker, 1000)
        onDispose { handler.removeCallbacks(ticker) }
    }
    val clockNow = if (state.pausedAt > 0) state.pausedAt else now
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader(routines.firstOrNull { it.id == session.routineId }?.title ?: "Sessão")
        Text(if (state.pausedAt > 0) "Treino pausado" else "Treino em andamento")
        Text("Tempo ativo: ${((clockNow - session.startedAt - state.pausedMillis).coerceAtLeast(0) / 60000)} min")
        Button(onClick = { vm.pauseWorkout(state.pausedAt == 0L) }, enabled = !vm.busy) { Text(if (state.pausedAt > 0) "Retomar treino" else "Pausar treino") }
        if (state.timerStart > 0) {
            val phase = IntervalClock.phase(state.timerStart, clockNow, state.timerWork, state.timerRest, state.timerRounds)
            Text("${phase.label} · rodada ${phase.round}/${state.timerRounds} · ${phase.remaining}s", style = MaterialTheme.typography.titleLarge)
        }
        items.forEach { item ->
            val p = item.prescription(); val actualId = state.substitutions[item.id] ?: item.exerciseId
            val exercise = exercises.firstOrNull { it.id == actualId }
            val previous = allSets.filter { it.exerciseId == actualId && history.any { h -> h.id == it.sessionId && h.studentId == session.studentId } }.maxByOrNull { it.performedAt }
            Text("${Prescription.methods[p.method]} ${p.block} · ${p.sets} × ${p.repsMin}–${p.repsMax}")
            Text("Carga-alvo: ${p.loadKg?.let { WeightUnits.fromKg(it, LocalWeightUnit.current) } ?: "Livre"} ${LocalWeightUnit.current} · RIR ${p.rir ?: "—"} · RPE ${p.rpe ?: "—"} · descanso ${p.restSeconds}s")
            if (p.cadence.isNotBlank() || p.notes.isNotBlank()) Text("Cadência: ${p.cadence}\n${p.notes}")
            val recorded = sets.count { it.exerciseId == actualId }
            Text("Etapa ${recorded + 1} · rodadas planejadas ${p.rounds} · duração-alvo ${p.durationSeconds}s")
            Text(when (p.method) {
                "SUPER", "BI", "TRI", "CIRCUIT" -> "Alterne os exercícios do bloco ${p.block} na ordem da ficha; descanse ao terminar a rodada."
                "DROP" -> "Complete uma etapa, reduza a carga e registre a próxima etapa como Drop."
                "REST_PAUSE" -> "Registre a série, use o intervalo curto e registre as minisséries seguintes."
                "CLUSTER" -> "Distribua as repetições em ${p.rounds} blocos com ${p.intervalSeconds}s entre blocos."
                "EMOM" -> "Inicie a cada minuto: ${p.workSeconds}s de execução e ${p.intervalSeconds}s para completar o minuto."
                "AMRAP" -> "Complete tantas rodadas quanto possível em ${p.durationSeconds}s, registrando as séries."
                "HIIT" -> "Alterne ${p.workSeconds}s de execução e ${p.intervalSeconds}s de recuperação por ${p.rounds} rodadas."
                else -> "Registre cada série e respeite o descanso prescrito."
            })
            if (actualId != item.exerciseId) Text("Substituição nesta sessão; ficha original preservada.")
            if (state.pausedAt == 0L) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { vm.startTimer(p.restSeconds.coerceAtLeast(1), 0, 1) }, enabled = !vm.busy) { Text("Descanso ${p.restSeconds}s") }
                    OutlinedButton(onClick = { vm.startTimer(if (p.method == "AMRAP" || p.method == "NORMAL" && p.durationSeconds > 0) p.durationSeconds.coerceAtLeast(1) else p.workSeconds, if (p.method == "AMRAP") 0 else p.intervalSeconds, if (p.method == "AMRAP") 1 else p.rounds) }, enabled = !vm.busy) { Text("Iniciar método") }
                    OutlinedButton(onClick = { replacing = item.id }, enabled = !vm.busy) { Text("Substituir ${exercise?.name}") }
                }

            }
            ExerciseEntryCard(actualId, exercise?.name ?: "Exercício", exercise?.muscleGroup.orEmpty(), "${p.sets} séries", p.repsMin, sets.filter { it.exerciseId == actualId }, previous, enabled = state.pausedAt == 0L && !vm.busy) { reps, load, rir, type, rpe, note -> vm.recordSet(actualId, reps, load, rir, type, rpe, note) }
        }
        Text("${sets.size} série(s) salva(s). Substituições e séries anteriores permanecem no registro.")
        Button(onClick = { finish = true }, enabled = !vm.busy && sets.isNotEmpty()) { Text("Concluir treino") }
    }
    if (finish) AlertDialog(onDismissRequest = { finish = false }, title = { Text("Concluir treino?") }, text = { Text("${sets.size} séries salvas. Pendências: ${items.mapNotNull { item -> val id = state.substitutions[item.id] ?: item.exerciseId; val missing = (item.prescription().sets - sets.count { it.exerciseId == id && it.setType != "AQUECIMENTO" }).coerceAtLeast(0); if (missing > 0) "${exercises.firstOrNull { it.id == id }?.name}: $missing série(s)" else null }.joinToString().ifBlank { "Nenhuma" }}. A sessão ficará no histórico.") }, confirmButton = { TextButton(onClick = { vm.finishSession(); finish = false }, enabled = !vm.busy) { Text("Confirmar conclusão") } }, dismissButton = { TextButton(onClick = { finish = false }) { Text("Continuar treinando") } })
    if (replacing > 0) AlertDialog(onDismissRequest = { replacing = 0 }, title = { Text("Substituir exercício") }, text = {
        Column(Modifier.heightIn(max = 400.dp).verticalScroll(rememberScrollState())) {
            OutlinedTextField(search, { search = it }, label = { Text("Buscar substituto") })
            ExerciseSearch.filter(exercises, search).forEach { e -> TextButton(onClick = { vm.substitute(replacing, e.id); replacing = 0 }, enabled = !vm.busy) { Text(e.name) } }
        }
    }, confirmButton = { TextButton(onClick = { replacing = 0 }) { Text("Cancelar") } })
}
