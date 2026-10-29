package br.com.evolupersonal.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.data.StudentEntity
import java.text.Normalizer
import java.util.Locale

private fun searchKey(text: String) = Normalizer.normalize(text, Normalizer.Form.NFD).replace("\\p{M}+".toRegex(), "").lowercase(Locale.ROOT)

@Composable
fun StudentsScreen(vm: TrainerViewModel, onBack: () -> Unit) {
    val students by vm.students.collectAsState()
    val routines by vm.routines.collectAsState()
    val history by vm.history.collectAsState()
    val sets by vm.allSets.collectAsState()
    var editing by rememberSaveable { mutableLongStateOf(-1L) }
    var selected by rememberSaveable { mutableLongStateOf(-1L) }
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("Todos") }
    var confirmInactive by remember { mutableStateOf(false) }
    val target = students.firstOrNull { it.id == selected }
    androidx.activity.compose.BackHandler(enabled = target != null) { selected = -1L }
    if (editing >= 0) {
        val student = students.firstOrNull { it.id == editing }
        androidx.activity.compose.BackHandler(enabled = !vm.busy) { editing = -1L }
        if (editing == 0L || student != null) StudentEditor(student, vm.busy, onDismiss = { editing = -1L }, onSave = { name, goal, equipment, notes, availability ->
            vm.saveStudent(student?.id, name, goal, equipment, notes, availability) { editing = -1L }
        })
        return
    }
    LazyVerticalGrid(columns = GridCells.Adaptive(300.dp), modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(span = { GridItemSpan(maxLineSpan) }) { TextButton(onClick = { if (target == null) onBack() else selected = -1L }) { Text(if (target == null) "Voltar ao início" else "Todos os alunos") } }
        item(span = { GridItemSpan(maxLineSpan) }) { SectionHeader(target?.name ?: "Alunos", "Cadastro e acompanhamento individual") }
        if (target == null) {
            item(span = { GridItemSpan(maxLineSpan) }) { OutlinedTextField(query, { query = it }, label = { Text("Pesquisar aluno por nome") }, modifier = Modifier.fillMaxWidth(), singleLine = true) }
            item(span = { GridItemSpan(maxLineSpan) }) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("Todos", "Ativos", "Inativos").forEach { value -> FilterChip(selected = filter == value, onClick = { filter = value }, label = { Text(value) }) } }
                    Button(onClick = { editing = 0 }, enabled = !vm.busy) { Text("Cadastrar aluno") }
                }
            }
            val filtered = students.filter { searchKey(it.name).contains(searchKey(query)) && (filter == "Todos" || it.active == (filter == "Ativos")) }
            if (filtered.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) { EmptyState("Nenhum aluno encontrado", "Cadastre um aluno ou ajuste a pesquisa e o filtro.") }
            items(filtered, key = { it.id }) { student ->
                Card(onClick = { selected = student.id }, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(student.name, fontWeight = FontWeight.Bold)
                        Text(student.goal)
                        Text(if (student.active) "Ativo" else "Inativo · histórico preservado", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${routines.count { it.studentId == student.id }} treino(s)")
                    }
                }
            }
        } else {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(if (target.active) "Aluno ativo" else "Aluno inativo · histórico preservado")
                    Text("Objetivo: ${target.goal}")
                    Text("Disponibilidade: ${target.availability.ifBlank { "Não informada" }}")
                    Text("Equipamentos: ${target.equipment.ifBlank { "Não informado" }}")
                    if (target.notes.isNotBlank()) Text("Observações: ${target.notes}")
                    OutlinedButton(onClick = { editing = target.id }, enabled = !vm.busy) { Text("Editar aluno") }
                    OutlinedButton(onClick = { if (target.active) confirmInactive = true else vm.setStudentActive(target.id, true) }, enabled = !vm.busy) { Text(if (target.active) "Inativar aluno" else "Reativar aluno") }
                    SectionHeader("Histórico individual")
                    val sessions = history.filter { it.studentId == target.id }
                    if (sessions.isEmpty()) Text("Nenhuma sessão concluída.")
                    sessions.forEach { session ->
                        val count = sets.count { it.sessionId == session.id }
                        Text("${java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.SHORT, java.text.DateFormat.SHORT).format(java.util.Date(session.finishedAt ?: session.startedAt))} · $count série(s)")
                    }
                    SectionHeader("Fichas do aluno", "A inativação preserva fichas e sessões anteriores.")
                }
            }
            items(routines, key = { it.id }) { routine ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(routine.title, fontWeight = FontWeight.Bold)
                        Text(dayName(routine.dayOfWeek))
                        if (routine.studentId == target.id) TextButton(onClick = { vm.assignRoutine(routine.id, null) }, enabled = !vm.busy) { Text("Desvincular") }
                        else if (routine.studentId != null) Text("Atribuído a outro aluno")
                        else TextButton(onClick = { vm.assignRoutine(routine.id, target.id) }, enabled = target.active && !vm.busy) { Text("Atribuir") }
                    }
                }
            }
        }
    }
    if (confirmInactive && target != null) AlertDialog(onDismissRequest = { confirmInactive = false }, title = { Text("Inativar ${target.name}?") }, text = { Text("O histórico será preservado. Novos treinos ficam bloqueados até a reativação; um treino já aberto pode ser concluído.") }, confirmButton = { TextButton(onClick = { vm.setStudentActive(target.id, false); confirmInactive = false }) { Text("Inativar") } }, dismissButton = { TextButton(onClick = { confirmInactive = false }) { Text("Cancelar") } })

}

@Composable
private fun StudentEditor(student: StudentEntity?, busy: Boolean, onDismiss: () -> Unit, onSave: (String, String, String, String, String) -> Unit) {
    var name by rememberSaveable(student?.id) { mutableStateOf(student?.name.orEmpty()) }
    var goal by rememberSaveable(student?.id) { mutableStateOf(student?.goal.orEmpty()) }
    var equipment by rememberSaveable(student?.id) { mutableStateOf(student?.equipment.orEmpty()) }
    var notes by rememberSaveable(student?.id) { mutableStateOf(student?.notes.orEmpty()) }
    var availability by rememberSaveable(student?.id) { mutableStateOf(student?.availability.orEmpty()) }
    Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 680.dp).fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            TextButton(onClick = onDismiss, enabled = !busy) { Text("Voltar aos alunos") }
            SectionHeader(if (student == null) "Novo aluno" else "Editar aluno", "Os dados só são confirmados após salvar.")
            OutlinedTextField(name, { name = it.take(80) }, label = { Text("Nome") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(goal, { goal = it.take(100) }, label = { Text("Objetivo") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(equipment, { equipment = it.take(200) }, label = { Text("Equipamentos") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(availability, { availability = it.take(200) }, label = { Text("Disponibilidade (dias e horários)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(notes, { notes = it.take(500) }, label = { Text("Observações") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { onSave(name, goal, equipment, notes, availability) }, enabled = !busy && name.trim().length >= 2 && goal.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text(if (busy) "Salvando…" else "Salvar") }
            OutlinedButton(onClick = onDismiss, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Cancelar") }
        }
    }
}
