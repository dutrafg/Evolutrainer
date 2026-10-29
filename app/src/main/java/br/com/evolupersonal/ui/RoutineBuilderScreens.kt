package br.com.evolupersonal.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.data.ExerciseSearch
import br.com.evolupersonal.data.RoutineEntity
import br.com.evolupersonal.data.RoutineExerciseEntity

@Composable
fun RoutineListScreen(vm: TrainerViewModel, onOpen: (Long) -> Unit) {
    val routines by vm.routines.collectAsState()
    val items by vm.routineExercises.collectAsState()
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("Treinos") }
    var creating by rememberSaveable { mutableStateOf("") }
    BackHandler(creating.isNotEmpty()) { if (!vm.busy) creating = "" }
    if (creating == "Divisão") {
        DivisionEditor(vm, onBack = { creating = "" })
        return
    }
    if (creating.isNotEmpty()) {
        RoutineEditor(null, creating == "Modelo", vm, onBack = { creating = "" }, onSaved = { creating = ""; onOpen(it) })
        return
    }
    val visible = routines.filter {
        (when (filter) { "Modelos" -> it.isTemplate && !it.archived; "Arquivados" -> it.archived; else -> !it.isTemplate && !it.archived }) &&
            ExerciseSearch.normalize("${it.title} ${it.divisionLabel}").contains(ExerciseSearch.normalize(query))
    }
    LazyVerticalGrid(columns = GridCells.Adaptive(300.dp), modifier = Modifier.fillMaxSize().testTag("routines-grid"), contentPadding = PaddingValues(18.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionHeader("Meus treinos", "Monte fichas e reutilize seus modelos.")
                OutlinedTextField(query, { query = it.take(100) }, label = { Text("Buscar treino ou divisão") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Treinos", "Modelos", "Arquivados").forEach { option -> FilterChip(filter == option, onClick = { filter = option }, label = { Text(option) }) }
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { creating = "Treino" }, enabled = !vm.busy) { Text("Novo treino") }
                    OutlinedButton(onClick = { creating = "Modelo" }, enabled = !vm.busy) { Text("Novo modelo") }
                    OutlinedButton(onClick = { creating = "Divisão" }, enabled = !vm.busy) { Text("Criar divisão") }
                }
            }
        }
        if (visible.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) { EmptyState("Nenhuma ficha encontrada", "Crie uma ficha ou ajuste a busca e os filtros.") }
        items(visible, key = { it.id }) { routine ->
            Card(onClick = { onOpen(routine.id) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(routine.title, style = MaterialTheme.typography.titleMedium)
                    Text(if (routine.isTemplate) "Modelo reutilizável" else dayName(routine.dayOfWeek))
                    if (routine.divisionLabel.isNotBlank()) Text("Divisão: ${routine.divisionLabel}")
                    Text("${items.count { it.routineId == routine.id }} exercício(s)")
                    if (routine.archived) Text("Arquivado · histórico preservado")
                    Text("Abrir ficha", color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
fun RoutineDetailScreen(vm: TrainerViewModel, routineId: Long, onBack: () -> Unit, onOpen: (Long) -> Unit, onOpenLibrary: () -> Unit) {
    val routines by vm.routines.collectAsState()
    val allItems by vm.routineExercises.collectAsState()
    val exercises by vm.exercises.collectAsState()
    val routine = routines.firstOrNull { it.id == routineId }
    val items = allItems.filter { it.routineId == routineId }.sortedWith(compareBy({ it.sortOrder }, { it.id }))
    var editing by rememberSaveable(routineId) { mutableStateOf(false) }
    var choosing by rememberSaveable(routineId) { mutableStateOf(false) }
    var targetId by rememberSaveable(routineId) { mutableLongStateOf(-1) }
    var removeId by rememberSaveable(routineId) { mutableLongStateOf(-1) }
    var confirmArchive by rememberSaveable(routineId) { mutableStateOf(false) }
    var checkIn by rememberSaveable(routineId) { mutableStateOf(false) }
    BackHandler(editing || choosing || targetId > 0) { if (!vm.busy) { editing = false; choosing = false; targetId = -1 } }
    if (routine == null) {
        Column(Modifier.padding(18.dp)) { Text("Carregando ficha…"); TextButton(onClick = onBack) { Text("Todos os treinos") } }
        return
    }
    if (editing) {
        RoutineEditor(routine, routine.isTemplate, vm, onBack = { editing = false }, onSaved = { editing = false })
        return
    }
    if (choosing) {
        RoutineExercisePicker(vm, routineId, onBack = { choosing = false }, onOpenLibrary = onOpenLibrary)
        return
    }
    if (targetId > 0) {
        val item = items.firstOrNull { it.id == targetId }
        if (item != null) PrescriptionEditor(item, vm, onBack = { targetId = -1 })
        else Column(Modifier.padding(18.dp)) { Text("Item indisponível."); TextButton(onClick = { targetId = -1 }) { Text("Voltar à ficha") } }
        return
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(Modifier.widthIn(max = 960.dp).fillMaxSize().testTag("routine-detail"), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextButton(onClick = onBack, enabled = !vm.busy) { Text("Todos os treinos") }
                    SectionHeader(routine.title, if (routine.isTemplate) "Modelo reutilizável" else dayName(routine.dayOfWeek))
                    if (routine.divisionLabel.isNotBlank()) Text("Divisão: ${routine.divisionLabel}")
                    if (routine.notes.isNotBlank()) Text(routine.notes)
                    if (routine.archived) Text("Ficha arquivada. Restaure para editar ou iniciar.")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (!routine.archived) OutlinedButton(onClick = { editing = true }, enabled = !vm.busy) { Text("Editar ficha") }
                        OutlinedButton(onClick = { vm.copyRoutine(routineId, false, onOpen) }, enabled = !vm.busy) { Text(if (routine.isTemplate) "Criar treino deste modelo" else "Duplicar ficha") }
                        if (!routine.isTemplate) OutlinedButton(onClick = { vm.copyRoutine(routineId, true, onOpen) }, enabled = !vm.busy) { Text("Salvar como modelo") }
                        OutlinedButton(onClick = { if (routine.archived) vm.archiveRoutine(routineId, false) {} else confirmArchive = true }, enabled = !vm.busy) { Text(if (routine.archived) "Restaurar ficha" else "Arquivar ficha") }
                    }
                    if (!routine.archived) {
                        OutlinedButton(onClick = { choosing = true }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) { Text("Adicionar exercício") }
                        if (!routine.isTemplate) Button(onClick = { checkIn = true }, enabled = !vm.busy && items.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("Iniciar treino") }
                    }
                    Text("${items.size} exercício(s) · ordem de execução", style = MaterialTheme.typography.titleMedium)
                }
            }
            if (items.isEmpty()) item { EmptyState("Ficha sem exercícios", "Adicione exercícios da biblioteca. Modelos podem ser montados e reutilizados depois.") }
            items(items, key = { it.id }) { item ->
                val index = items.indexOf(item)
                val name = exercises.firstOrNull { it.id == item.exerciseId }?.name ?: "Exercício"
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("${index + 1}. $name", style = MaterialTheme.typography.titleMedium)
                        Text("${item.targetSets} séries × ${item.targetReps} repetições")
                        if (!routine.archived) FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            TextButton(onClick = { targetId = item.id }, enabled = !vm.busy) { Text("Editar séries") }
                            TextButton(onClick = { removeId = item.id }, enabled = !vm.busy) { Text("Remover") }
                            IconButton(onClick = { vm.reorderRoutineExercise(routineId, item.id, -1) }, enabled = !vm.busy && index > 0) { Icon(Icons.Outlined.ArrowUpward, "Mover $name para cima") }
                            IconButton(onClick = { vm.reorderRoutineExercise(routineId, item.id, 1) }, enabled = !vm.busy && index < items.lastIndex) { Icon(Icons.Outlined.ArrowDownward, "Mover $name para baixo") }
                        }
                    }
                }
            }
        }
    }
    if (removeId > 0) AlertDialog(onDismissRequest = { if (!vm.busy) removeId = -1 }, title = { Text("Remover exercício da ficha?") }, text = { Text("Os registros das sessões anteriores serão preservados.") }, confirmButton = { TextButton(enabled = !vm.busy, onClick = { vm.removeFromRoutine(removeId) { removeId = -1 } }) { Text("Confirmar remoção") } }, dismissButton = { TextButton(onClick = { removeId = -1 }, enabled = !vm.busy) { Text("Cancelar") } })
    if (confirmArchive) AlertDialog(onDismissRequest = { if (!vm.busy) confirmArchive = false }, title = { Text("Arquivar esta ficha?") }, text = { Text("A ficha sai da programação e pode ser restaurada. Histórico e vínculo com o aluno permanecem salvos.") }, confirmButton = { TextButton(enabled = !vm.busy, onClick = { vm.archiveRoutine(routineId, true) { confirmArchive = false; onBack() } }) { Text("Confirmar arquivamento") } }, dismissButton = { TextButton(onClick = { confirmArchive = false }, enabled = !vm.busy) { Text("Cancelar") } })
    if (checkIn) CheckInDialog(vm, routineId) { checkIn = false }
}

@Composable
private fun BuilderForm(content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 680.dp).fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

@Composable
private fun DayPicker(day: Int, onChange: (Int) -> Unit, label: String = "Dia programado") {
    Text(label)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        (0..7).forEach { option -> FilterChip(selected = day == option, onClick = { onChange(option) }, label = { Text(dayName(option)) }) }
    }
}

@Composable
private fun RoutineEditor(routine: RoutineEntity?, template: Boolean, vm: TrainerViewModel, onBack: () -> Unit, onSaved: (Long) -> Unit) {
    var title by rememberSaveable(routine?.id) { mutableStateOf(routine?.title.orEmpty()) }
    var day by rememberSaveable(routine?.id) { mutableIntStateOf(routine?.dayOfWeek ?: 0) }
    var division by rememberSaveable(routine?.id) { mutableStateOf(routine?.divisionLabel.orEmpty()) }
    var notes by rememberSaveable(routine?.id) { mutableStateOf(routine?.notes.orEmpty()) }
    val keyboard = LocalSoftwareKeyboardController.current
    BuilderForm {
        TextButton(onClick = onBack, enabled = !vm.busy) { Text("Voltar") }
        SectionHeader(if (routine != null) "Editar ficha" else if (template) "Novo modelo" else "Novo treino")
        OutlinedTextField(title, { title = it.take(60) }, enabled = !vm.busy, label = { Text("Nome da ficha") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(division, { division = it.take(30) }, enabled = !vm.busy, label = { Text("Divisão (A, B, superior…)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        DayPicker(day, { if (!vm.busy) day = it })
        OutlinedTextField(notes, { notes = it.take(1000) }, enabled = !vm.busy, label = { Text("Observações da ficha") }, minLines = 2, modifier = Modifier.fillMaxWidth())
        Button(enabled = !vm.busy && title.trim().length >= 2, onClick = { keyboard?.hide(); vm.saveRoutine(routine?.id, title, day, division, notes, template, onSaved) }, modifier = Modifier.fillMaxWidth()) { Text("Salvar ficha") }
    }
}

@Composable
private fun DivisionEditor(vm: TrainerViewModel, onBack: () -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var pattern by rememberSaveable { mutableStateOf("A/B/C") }
    var custom by rememberSaveable { mutableStateOf("Superior, Inferior") }
    var days by rememberSaveable { mutableStateOf("0,0,0,0,0,0,0") }
    val labels = if (pattern == "Personalizada") custom.split(',').map { it.trim() } else pattern.split('/')
    val dayValues = days.split(',').map { it.toInt() }
    val valid = title.trim().length >= 2 && labels.size in 2..7 && labels.all { it.length in 1..30 } && labels.map(ExerciseSearch::normalize).distinct().size == labels.size
    val keyboard = LocalSoftwareKeyboardController.current
    BuilderForm {
        TextButton(onClick = onBack, enabled = !vm.busy) { Text("Voltar") }
        SectionHeader("Criar divisão", "Cria fichas independentes e vazias para você montar. Escolha os dias de cada ficha.")
        OutlinedTextField(title, { title = it.take(25) }, enabled = !vm.busy, label = { Text("Nome da divisão") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("A/B", "A/B/C", "A/B/C/D", "Personalizada").forEach { option -> FilterChip(pattern == option, onClick = { pattern = option }, enabled = !vm.busy, label = { Text(option) }) } }
        if (pattern == "Personalizada") OutlinedTextField(custom, { custom = it.take(216) }, enabled = !vm.busy, label = { Text("Divisões separadas por vírgula (2–7)") }, modifier = Modifier.fillMaxWidth())
        labels.take(7).forEachIndexed { index, label ->
            key(index) { DayPicker(dayValues[index], { value -> days = dayValues.toMutableList().also { it[index] = value }.joinToString(",") }, "Dia de ${label.ifBlank { "divisão ${index + 1}" }}") }
        }
        if (!valid && title.isNotBlank()) Text("Use 2–7 divisões com nomes diferentes, de até 30 caracteres.")
        Button(onClick = { keyboard?.hide(); vm.createDivision(title, labels, dayValues.take(labels.size), onBack) }, enabled = !vm.busy && valid, modifier = Modifier.fillMaxWidth()) { Text("Salvar divisão") }
    }
}

@Composable
private fun TargetsEditor(item: RoutineExerciseEntity, vm: TrainerViewModel, onBack: () -> Unit) {
    var sets by rememberSaveable(item.id) { mutableStateOf(item.targetSets.toString()) }
    var reps by rememberSaveable(item.id) { mutableStateOf(item.targetReps.toString()) }
    val valid = (sets.toIntOrNull() ?: 0) in 1..15 && (reps.toIntOrNull() ?: 0) in 1..1000
    BuilderForm {
        TextButton(onClick = onBack, enabled = !vm.busy) { Text("Voltar à ficha") }
        SectionHeader("Editar séries")
        OutlinedTextField(sets, { sets = it.take(2) }, enabled = !vm.busy, label = { Text("Séries (1–15)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        OutlinedTextField(reps, { reps = it.take(4) }, enabled = !vm.busy, label = { Text("Repetições (1–1000)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Button(onClick = { vm.changeTargets(item.id, sets.toInt(), reps.toInt(), onBack) }, enabled = !vm.busy && valid, modifier = Modifier.fillMaxWidth()) { Text("Salvar séries") }
    }
}

@Composable
private fun RoutineExercisePicker(vm: TrainerViewModel, routineId: Long, onBack: () -> Unit, onOpenLibrary: () -> Unit) {
    val exercises by vm.exercises.collectAsState()
    val allItems by vm.routineExercises.collectAsState()
    var query by rememberSaveable { mutableStateOf("") }
    var muscle by rememberSaveable { mutableStateOf("") }
    var equipment by rememberSaveable { mutableStateOf("") }
    var favorites by rememberSaveable { mutableStateOf(false) }
    val used = allItems.filter { it.routineId == routineId }.map { it.exerciseId }.toSet()
    val options = ExerciseSearch.filter(exercises.filter { it.id !in used }, query, muscle, equipment, favorites)
    LazyVerticalGrid(columns = GridCells.Adaptive(300.dp), modifier = Modifier.fillMaxSize().testTag("routine-picker"), contentPadding = PaddingValues(18.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                TextButton(onClick = onBack, enabled = !vm.busy) { Text("Voltar à ficha") }
                SectionHeader("Escolher exercício", "Exercícios já incluídos são ocultados.")
                OutlinedTextField(query, { query = it.take(160) }, label = { Text("Buscar exercício") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CatalogFilter("Músculo", muscle, exercises.map { it.muscleGroup }.distinctBy(ExerciseSearch::normalize).sortedBy(ExerciseSearch::normalize)) { muscle = it }
                    CatalogFilter("Equipamento", equipment, exercises.map { it.equipment }.filter { it.isNotBlank() }.distinctBy(ExerciseSearch::normalize).sortedBy(ExerciseSearch::normalize)) { equipment = it }
                    FilterChip(favorites, onClick = { favorites = !favorites }, label = { Text("Favoritos") })
                }
                TextButton(onClick = { query = ""; muscle = ""; equipment = ""; favorites = false }) { Text("Limpar filtros") }
                TextButton(onClick = onOpenLibrary, enabled = !vm.busy) { Text("Abrir biblioteca") }
            }
        }
        if (options.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) { EmptyState("Nenhum exercício disponível", "Revise os filtros ou cadastre outro exercício na biblioteca.") }
        items(options, key = { it.id }) { exercise ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(exercise.name, style = MaterialTheme.typography.titleMedium)
                    Text(exercise.muscleGroup)
                    Text(exercise.equipment.ifBlank { "Equipamento não informado" })
                    Button(onClick = { vm.addExerciseToRoutine(routineId, exercise.id, onBack) }, enabled = !vm.busy) { Text("Adicionar ${exercise.name}") }
                }
            }
        }
    }
}

@Composable
private fun CheckInDialog(vm: TrainerViewModel, routineId: Long, onDismiss: () -> Unit) {
    var energy by rememberSaveable { mutableFloatStateOf(3f) }
    var sleep by rememberSaveable { mutableFloatStateOf(3f) }
    var fatigue by rememberSaveable { mutableFloatStateOf(3f) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Check-in antes do treino") }, text = {
        Column(Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Opcional. Não é uma avaliação clínica.")
            Text("Energia: ${energy.toInt()}/5"); Slider(energy, { energy = it }, valueRange = 1f..5f, steps = 3)
            Text("Qualidade do sono: ${sleep.toInt()}/5"); Slider(sleep, { sleep = it }, valueRange = 1f..5f, steps = 3)
            Text("Fadiga: ${fatigue.toInt()}/5 (5 = maior fadiga)"); Slider(fatigue, { fatigue = it }, valueRange = 1f..5f, steps = 3)
        }
    }, confirmButton = { TextButton(enabled = !vm.busy, onClick = { vm.startRoutine(routineId, energy.toInt(), sleep.toInt(), fatigue.toInt()); onDismiss() }) { Text("Registrar e iniciar") } }, dismissButton = { TextButton(enabled = !vm.busy, onClick = { vm.startRoutine(routineId, null, null, null); onDismiss() }) { Text("Pular") } })
}
