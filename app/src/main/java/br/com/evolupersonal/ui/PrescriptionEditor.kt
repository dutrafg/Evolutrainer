package br.com.evolupersonal.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.core.Prescription
import br.com.evolupersonal.core.WeightUnits
import br.com.evolupersonal.data.RoutineExerciseEntity
import br.com.evolupersonal.data.prescription

@Composable
fun PrescriptionEditor(item: RoutineExerciseEntity, vm: TrainerViewModel, onBack: () -> Unit) {
    val initial = remember(item.id) { item.prescription() }
    val unit = LocalWeightUnit.current
    var sets by rememberSaveable { mutableStateOf(initial.sets.toString()) }
    var min by rememberSaveable { mutableStateOf(initial.repsMin.toString()) }
    var max by rememberSaveable { mutableStateOf(initial.repsMax.toString()) }
    var load by rememberSaveable { mutableStateOf(initial.loadKg?.let { WeightUnits.fromKg(it, unit).toString() }.orEmpty()) }
    var rir by rememberSaveable { mutableStateOf(initial.rir?.toString().orEmpty()) }
    var rpe by rememberSaveable { mutableStateOf(initial.rpe?.toString().orEmpty()) }
    var rest by rememberSaveable { mutableStateOf(initial.restSeconds.toString()) }
    var cadence by rememberSaveable { mutableStateOf(initial.cadence) }
    var duration by rememberSaveable { mutableStateOf(initial.durationSeconds.toString()) }
    var notes by rememberSaveable { mutableStateOf(initial.notes) }
    var method by rememberSaveable { mutableStateOf(initial.method) }
    var block by rememberSaveable { mutableStateOf(initial.block) }
    var rounds by rememberSaveable { mutableStateOf(initial.rounds.toString()) }
    var work by rememberSaveable { mutableStateOf(initial.workSeconds.toString()) }
    var interval by rememberSaveable { mutableStateOf(initial.intervalSeconds.toString()) }
    val value = runCatching {
        fun optional(text: String): Int? = if (text.isBlank()) null else text.toInt()
        Prescription(sets.toInt(), min.toInt(), max.toInt(), if (load.isBlank()) null else WeightUnits.toKg(load.replace(',', '.').toDouble(), unit), optional(rir), optional(rpe), rest.toInt(), cadence, duration.toInt(), notes, method, block, rounds.toInt(), work.toInt(), interval.toInt()).also { it.validate() }
    }.getOrNull()
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        TextButton(onClick = onBack, enabled = !vm.busy) { Text("Voltar à ficha") }
        SectionHeader("Prescrição do exercício")
        @Composable fun field(label: String, text: String, change: (String) -> Unit) { OutlinedTextField(text, { change(it.take(if (label == "Observações técnicas") 1000 else 30)) }, label = { Text(label) }, enabled = !vm.busy, modifier = Modifier.widthIn(max = 680.dp).fillMaxWidth()) }
        field("Séries (1–15)", sets) { sets = it }; field("Repetições mínimas", min) { min = it }; field("Repetições máximas", max) { max = it }
        field("Carga-alvo ($unit, opcional)", load) { load = it }; field("RIR-alvo (opcional)", rir) { rir = it }; field("RPE-alvo (opcional)", rpe) { rpe = it }
        field("Descanso (segundos)", rest) { rest = it }; field("Cadência (ex.: 3-1-1-0)", cadence) { cadence = it }; field("Duração-alvo (segundos, 0 = livre)", duration) { duration = it }
        field("Observações técnicas", notes) { notes = it }
        CatalogFilter("Método", Prescription.methods[method].orEmpty(), Prescription.methods.values.toList()) { label -> method = Prescription.methods.entries.firstOrNull { it.value == label }?.key ?: "NORMAL" }
        field("Bloco compartilhado (ex.: A1)", block) { block = it }
        Text("Superséries, bi-sets, tri-sets e circuitos usam o mesmo bloco nos exercícios participantes. Configure a ordem na ficha.")
        field("Rodadas / etapas", rounds) { rounds = it }; field("Execução por etapa (segundos)", work) { work = it }; field("Intervalo entre etapas (segundos)", interval) { interval = it }
        Text("EMOM: configure o tempo de execução e o intervalo para somarem 60 segundos. AMRAP: uma rodada com a duração total. Dropset: reduza a carga manualmente em cada etapa registrada.")
        Button(onClick = { value?.let { vm.prescribe(item.id, it, onBack) } }, enabled = !vm.busy && value != null) { Text("Salvar prescrição") }
        if (value == null) Text("Confira os limites e os campos numéricos antes de salvar.")
    }
}
