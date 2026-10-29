package br.com.evolupersonal.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.data.StudentEntity
import br.com.evolupersonal.data.RoutineEntity

@Composable
fun StudentsScreen(
    students: List<StudentEntity>,
    routines: List<RoutineEntity>,
    onCreate: (String, String, String, String) -> Unit,
    onAssign: (Long, Long?) -> Unit,
    onBack: () -> Unit
) {
    var creating by remember { mutableStateOf(false) }
    var selected by rememberSaveable { mutableLongStateOf(-1L) }
    val target = students.firstOrNull { it.id == selected }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        TextButton(onClick = { if (target == null) onBack() else selected = -1L }) {
            Text(if (target == null) "Voltar ao início" else "Todos os alunos")
        }
        SectionHeader(
            target?.name ?: "Alunos",
            if (target != null) "Perfil do aluno · dados locais" else "Acompanhamento profissional offline."
        )
        if (target == null) {
            Button(onClick = { creating = true }, modifier = Modifier.fillMaxWidth()) {
                Text("Cadastrar aluno")
            }
            if (students.isEmpty()) EmptyState(
                "Nenhum aluno cadastrado",
                "Cadastre o primeiro aluno para organizar objetivos e fichas de treinamento."
            )
            students.forEach { student ->
                Card(
                    onClick = { selected = student.id },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(student.name, fontWeight = FontWeight.Bold)
                        Text(student.goal, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            "${routines.count { it.studentId == student.id }} treino(s) atribuído(s)",
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }
        } else {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Objetivo", fontWeight = FontWeight.Bold)
                    Text(target.goal)
                    Text("Equipamentos disponíveis", fontWeight = FontWeight.Bold)
                    Text(target.equipment.ifBlank { "Não informado" })
                    if (target.notes.isNotBlank()) {
                        Text("Observações", fontWeight = FontWeight.Bold)
                        Text(target.notes)
                    }
                }
            }
            SectionHeader("Fichas do aluno", "Associe treinos já criados, sem duplicar os exercícios.")
            if (routines.isEmpty()) EmptyState("Sem treinos", "Crie uma ficha no módulo Treinos.")
            routines.forEach { routine ->
                val assigned = routine.studentId == target.id
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(routine.title, fontWeight = FontWeight.SemiBold)
                            Text(dayName(routine.dayOfWeek), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (assigned) {
                            TextButton(onClick = { onAssign(routine.id, null) }) { Text("Desvincular") }
                        } else {
                            TextButton(onClick = { onAssign(routine.id, target.id) }) { Text("Atribuir") }
                        }
                    }
                }
            }
        }
    }
    if (creating) {
        var name by remember { mutableStateOf("") }
        var goal by remember { mutableStateOf("") }
        var equipment by remember { mutableStateOf("") }
        var notes by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { creating = false },
            title = { Text("Novo aluno") },
            text = {
                Column(
                    Modifier.heightIn(max = 390.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(name, { name = it.take(80) }, label = { Text("Nome") }, singleLine = true)
                    OutlinedTextField(goal, { goal = it.take(100) }, label = { Text("Objetivo") }, singleLine = true)
                    OutlinedTextField(equipment, { equipment = it.take(200) }, label = { Text("Equipamentos disponíveis") })
                    OutlinedTextField(notes, { notes = it.take(500) }, label = { Text("Observações (opcional)") })
                }
            },
            confirmButton = {
                TextButton(
                    enabled = name.trim().length >= 2 && goal.trim().isNotEmpty(),
                    onClick = {
                        onCreate(name, goal, equipment, notes)
                        creating = false
                    }
                ) { Text("Cadastrar") }
            },
            dismissButton = { TextButton(onClick = { creating = false }) { Text("Cancelar") } }
        )
    }
}
