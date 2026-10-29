package br.com.evolupersonal.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.data.ExerciseEntity
import br.com.evolupersonal.data.ExerciseSearch

@Composable
fun LibraryScreen(
    exercises: List<ExerciseEntity>,
    busy: Boolean,
    onSave: (Long?, String, String, String, String, () -> Unit) -> Unit,
    onFavorite: (Long, Boolean) -> Unit
) {
    // -1: list, 0: new exercise, positive: existing ID. Saved across rotation.
    var editorId by rememberSaveable { mutableLongStateOf(-1L) }
    var query by rememberSaveable { mutableStateOf("") }
    var muscle by rememberSaveable { mutableStateOf("") }
    var equipment by rememberSaveable { mutableStateOf("") }
    var favorites by rememberSaveable { mutableStateOf(false) }
    val selected = exercises.firstOrNull { it.id == editorId }
    BackHandler(editorId >= 0) { if (!busy) editorId = -1 }
    if (editorId >= 0) {
        if (editorId > 0 && selected == null) {
            Column(Modifier.padding(18.dp)) {
                Text("Carregando exercício…")
                TextButton(onClick = { editorId = -1 }, enabled = !busy) { Text("Voltar à biblioteca") }
            }
        } else key(editorId) {
            ExerciseEditor(selected, busy, onBack = { editorId = -1 }, onSave = { name, group, gear, instructions ->
                onSave(selected?.id, name, group, gear, instructions) { editorId = -1 }
            })
        }
        return
    }
    val visible = remember(exercises, query, muscle, equipment, favorites) {
        ExerciseSearch.filter(exercises, query, muscle, equipment, favorites)
    }
    val muscles = exercises.map { it.muscleGroup }.distinctBy(ExerciseSearch::normalize).sortedBy(ExerciseSearch::normalize)
    val equipmentOptions = exercises.map { it.equipment }.filter { it.isNotBlank() }.distinctBy(ExerciseSearch::normalize).sortedBy(ExerciseSearch::normalize)
    LazyVerticalGrid(
        columns = GridCells.Adaptive(300.dp),
        modifier = Modifier.fillMaxSize().testTag("exercise-grid"),
        contentPadding = PaddingValues(18.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionHeader("Meus exercícios", "Organize seus exercícios próprios e favoritos.")
                OutlinedTextField(query, { query = it.take(160) }, label = { Text("Buscar nome, músculo ou equipamento") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CatalogFilter("Músculo", muscle, muscles) { muscle = it }
                    CatalogFilter("Equipamento", equipment, equipmentOptions) { equipment = it }
                    FilterChip(selected = favorites, onClick = { favorites = !favorites }, label = { Text("Favoritos") })
                }
                if (query.isNotEmpty() || muscle.isNotEmpty() || equipment.isNotEmpty() || favorites) {
                    TextButton(onClick = { query = ""; muscle = ""; equipment = ""; favorites = false }) { Text("Limpar filtros") }
                }
                Button(onClick = { editorId = 0 }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Cadastrar exercício") }
                Text("${visible.size} exercício(s) encontrado(s)", style = MaterialTheme.typography.bodySmall)
            }
        }
        if (visible.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
            EmptyState("Nenhum exercício encontrado", if (exercises.isEmpty()) "Cadastre seu primeiro exercício. A biblioteca 3D será integrada em uma fase posterior." else "Revise a busca ou limpe os filtros.")
        }
        items(visible, key = { it.id }) { exercise ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(exercise.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        IconButton(onClick = { onFavorite(exercise.id, !exercise.favorite) }, enabled = !busy) {
                            Icon(if (exercise.favorite) Icons.Outlined.Star else Icons.Outlined.StarBorder,
                                contentDescription = if (exercise.favorite) "Remover ${exercise.name} dos favoritos" else "Favoritar ${exercise.name}")
                        }
                    }
                    Text(exercise.muscleGroup)
                    Text(exercise.equipment.ifBlank { "Equipamento não informado" }, style = MaterialTheme.typography.bodySmall)
                    if (exercise.instructions.isNotBlank()) Text(exercise.instructions, style = MaterialTheme.typography.bodyMedium)
                    Text(if (exercise.origin == "MANUAL") "Exercício próprio" else "Biblioteca importada", style = MaterialTheme.typography.labelSmall)
                    if (exercise.origin == "MANUAL") TextButton(onClick = { editorId = exercise.id }, enabled = !busy) { Text("Editar exercício") }
                }
            }
        }
    }
}

@Composable
private fun CatalogFilter(label: String, value: String, options: List<String>, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }) { Text(if (value.isBlank()) "$label: todos" else "$label: $value") }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }, modifier = Modifier.heightIn(max = 320.dp)) {
            DropdownMenuItem(text = { Text("Todos") }, onClick = { onSelect(""); open = false })
            options.forEach { option -> DropdownMenuItem(text = { Text(option) }, onClick = { onSelect(option); open = false }) }
        }
    }
}

@Composable
private fun ExerciseEditor(exercise: ExerciseEntity?, busy: Boolean, onBack: () -> Unit, onSave: (String, String, String, String) -> Unit) {
    var name by rememberSaveable { mutableStateOf(exercise?.name.orEmpty()) }
    var muscle by rememberSaveable { mutableStateOf(exercise?.muscleGroup.orEmpty()) }
    var equipment by rememberSaveable { mutableStateOf(exercise?.equipment.orEmpty()) }
    var instructions by rememberSaveable { mutableStateOf(exercise?.instructions.orEmpty()) }
    val keyboard = LocalSoftwareKeyboardController.current
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 680.dp).fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            TextButton(onClick = onBack, enabled = !busy) { Text("Voltar à biblioteca") }
            SectionHeader(if (exercise == null) "Novo exercício" else "Editar exercício")
            Text("Nome e grupo muscular são obrigatórios. Equipamento e instruções são opcionais.")
            OutlinedTextField(name, { name = it.take(80) }, enabled = !busy, label = { Text("Nome do exercício") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(muscle, { muscle = it.take(50) }, enabled = !busy, label = { Text("Grupo muscular") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(equipment, { equipment = it.take(100) }, enabled = !busy, label = { Text("Equipamento") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(instructions, { instructions = it.take(2000) }, enabled = !busy, label = { Text("Instruções de execução") }, minLines = 3, supportingText = { Text("${instructions.length}/2000") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { keyboard?.hide(); onSave(name, muscle, equipment, instructions) }, enabled = !busy && name.trim().length >= 2 && muscle.trim().length >= 2, modifier = Modifier.fillMaxWidth()) { Text("Salvar exercício") }
        }
    }
}
