package br.com.evolupersonal.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.data.*
import br.com.evolupersonal.core.PerformanceAnalysis
import br.com.evolupersonal.core.WeightUnits
import java.text.DateFormat
import java.util.Date

@Composable
fun HistoryAnalysisScreen(vm: TrainerViewModel) {
    val students by vm.students.collectAsState(); val history by vm.history.collectAsState()
    val sets by vm.allSets.collectAsState(); val exercises by vm.exercises.collectAsState()
    var student by rememberSaveable { mutableLongStateOf(-1) }
    var exerciseId by rememberSaveable { mutableLongStateOf(0) }
    var selected by rememberSaveable { mutableLongStateOf(0) }
    var note by rememberSaveable(selected) { mutableStateOf("") }
    val sessions = history.filter { if (student == -1L) it.studentId == null else it.studentId == student }
    val selectedSession = sessions.firstOrNull { it.id == selected }
    val unit = LocalWeightUnit.current
    fun weight(value: Double) = "%.2f %s".format(WeightUnits.fromKg(value, unit), unit)
    androidx.activity.compose.BackHandler(selected > 0) { selected = 0 }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader("Histórico e desempenho")
        CatalogFilter("Aluno", students.firstOrNull { it.id == student }?.name ?: "Treino pessoal", listOf("Treino pessoal") + students.map { "${it.name} (#${it.id})" }) { value -> student = students.firstOrNull { "${it.name} (#${it.id})" == value }?.id ?: -1; selected = 0; exerciseId = 0 }
        if (selectedSession != null) {
            val snapshot = selectedSession.snapshot()
            TextButton(onClick = { selected = 0 }) { Text("Voltar ao histórico") }
            SectionHeader(snapshot?.title ?: "Sessão legada", DateFormat.getDateTimeInstance().format(Date(selectedSession.finishedAt!!)))
            val runtime = selectedSession.runtime()
            val end = if (runtime.pausedAt > 0) minOf(runtime.pausedAt, selectedSession.finishedAt!!) else selectedSession.finishedAt!!
            Text("Duração ativa: ${((end - selectedSession.startedAt - runtime.pausedMillis).coerceAtLeast(0) / 60000)} min")
            Text(if (snapshot == null) "Sessão anterior à auditoria: a ficha original não pode ser reconstruída com certeza." else "Ficha preservada no início da sessão · ${snapshot.studentName.ifBlank { "Treino pessoal" }}")
            snapshot?.exercises?.forEach { e -> Text("Planejado: ${e.name} · ${e.prescription.sets} × ${e.prescription.repsMin}–${e.prescription.repsMax} · ${e.prescription.method} · ${e.prescription.restSeconds}s") }
            sets.filter { it.sessionId == selected }.forEach { s ->
                Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
                    Text(snapshot?.exercises?.firstOrNull { it.exerciseId == s.exerciseId }?.name ?: exercises.firstOrNull { it.id == s.exerciseId }?.name ?: "Exercício #${s.exerciseId}")
                    Text("Série ${s.setNumber} · ${s.repetitions} × ${weight(s.loadKg)} · ${s.setType}")
                    Text("RIR ${s.rir ?: "—"} · RPE ${s.rpe ?: "—"}")
                    if (s.notes.isNotBlank()) Text(s.notes)
                } }
            }
            selectedSession.runtime().events.forEach { Text(it) }
            if (selectedSession.observations.isNotBlank()) Text(selectedSession.observations)
            OutlinedTextField(note, { note = it.take(1000) }, label = { Text("Adicionar observação ao histórico") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { vm.saveSessionObservations(selected, note) { note = "" } }, enabled = !vm.busy && note.isNotBlank()) { Text("Salvar observação") }
        } else {
            val week = PerformanceAnalysis.weeklySummary(sessions, sets, System.currentTimeMillis())
            Text("Últimos 7 dias: ${week.sessions} sessões · ${week.sets} séries de trabalho · volume ${weight(week.volumeKg)}")
            Text("${sessions.size} sessões concluídas · ${sets.count { s -> sessions.any { it.id == s.sessionId } }} séries")
            CatalogFilter("Exercício", exercises.firstOrNull { it.id == exerciseId }?.name.orEmpty(), exercises.filter { e -> sets.any { it.exerciseId == e.id && sessions.any { h -> h.id == it.sessionId } } }.map { "${it.name} (#${it.id})" }) { value -> exerciseId = exercises.firstOrNull { "${it.name} (#${it.id})" == value }?.id ?: 0 }
            if (exerciseId > 0) {
                val points = PerformanceAnalysis.points(sessions, sets, exerciseId)
                val suggestion = PerformanceAnalysis.progression(sessions, sets, exerciseId)
                SectionHeader("Desempenho por exercício")
                Text("${points.size} sessões · melhor carga ${weight(points.maxOfOrNull { it.bestLoad } ?: 0.0)}")
                Text("Melhor 1RM estimada: ${points.mapNotNull { it.estimated1Rm }.maxOrNull()?.let { weight(it) } ?: "Sem séries de 1–10 repetições com carga positiva"}")
                val color = MaterialTheme.colorScheme.primary
                Canvas(Modifier.fillMaxWidth().height(140.dp)) {
                    val shown = points.takeLast(12); val max = shown.maxOfOrNull { it.volume }?.coerceAtLeast(1.0) ?: 1.0
                    shown.forEachIndexed { i, point -> val width = size.width / shown.size; val height = (size.height * point.volume / max).toFloat(); drawRect(color, Offset(i * width, size.height - height), Size(width * .75f, height)) }
                }
                Text("Volume por sessão (últimas 12, em ordem cronológica). Carga externa × repetições, sem aquecimento.")
                points.takeLast(12).forEach { p -> Text("${DateFormat.getDateInstance().format(Date(p.at))} · volume ${weight(p.volume)} · ${p.reps} rep. · 1RM estimada ${p.estimated1Rm?.let { weight(it) } ?: "—"}") }
                SectionHeader("Progressão explicável", suggestion.action)
                Text(suggestion.reason)
                suggestion.loadKg?.let { Text("Referência sugerida: ${weight(it)}. A ficha só muda se você editá-la.") }
            }
            SectionHeader("Sessões")
            if (sessions.isEmpty()) Text("Nenhuma sessão concluída para este aluno.")
            sessions.forEach { session -> Card(onClick = { selected = session.id }, modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(session.snapshot()?.title ?: "Sessão legada #${session.id}"); Text(DateFormat.getDateTimeInstance().format(Date(session.finishedAt!!))); Text("Abrir séries e prescrição") } } }
        }
    }
}
