package br.com.evolupersonal.data

import androidx.room.withTransaction

/** All edits are atomic. A running session freezes only its own routine. */
class RoutineBuilder(private val db: TrainerDatabase) {
    private val dao = db.trainerDao()
    private suspend fun editable(id: Long): RoutineEntity {
        val routine = requireNotNull(dao.getRoutine(id)) { "Treino não encontrado." }
        require(dao.getActiveSession()?.routineId != id) { "Conclua a sessão deste treino antes de alterar a ficha." }
        require(!routine.archived) { "Restaure a ficha antes de editar." }
        return routine
    }
    private fun validate(title: String, day: Int, division: String, notes: String) {
        require(title.trim().length in 2..60 && day in 0..7 && division.trim().length <= 30 && notes.trim().length <= 1000) { "Confira nome (2–60), dia, divisão (até 30) e observações (até 1000 caracteres)." }
    }
    suspend fun save(id: Long?, title: String, day: Int, division: String, notes: String, template: Boolean = false): Long = db.withTransaction {
        validate(title, day, division, notes)
        val current = if (id == null) RoutineEntity(title = "", isTemplate = template) else editable(id)
        require(current.isTemplate == template) { "Use uma cópia para transformar treino em modelo." }
        val updated = current.copy(title = title.trim(), dayOfWeek = day, divisionLabel = division.trim(), notes = notes.trim())
        if (id == null) dao.insertRoutine(updated) else { require(dao.updateRoutine(updated) == 1); id }
    }
    suspend fun createDivision(title: String, labels: List<String>, days: List<Int>): List<Long> = db.withTransaction {
        require(title.trim().length in 2..25 && labels.size in 2..7 && days.size == labels.size) { "Informe um nome (2–25) e de 2 a 7 divisões." }
        val clean = labels.map { it.trim() }
        require(clean.all { it.length in 1..30 } && clean.map(ExerciseSearch::normalize).distinct().size == clean.size) { "As divisões precisam ter nomes diferentes, de 1 a 30 caracteres." }
        require(days.all { it in 0..7 }) { "Dia inválido." }
        clean.mapIndexed { index, label ->
            dao.insertRoutine(RoutineEntity(title = "${title.trim()} · $label", divisionLabel = label, dayOfWeek = days[index]))
        }
    }
    suspend fun copy(id: Long, asTemplate: Boolean): Long = db.withTransaction {
        val source = requireNotNull(dao.getRoutine(id)) { "Treino não encontrado." }
        val suffix = if (asTemplate) " (modelo)" else if (source.isTemplate) " (treino)" else " (cópia)"
        val newId = dao.insertRoutine(source.copy(id = 0, title = source.title.take(60 - suffix.length) + suffix, studentId = null, isTemplate = asTemplate, archived = false))
        dao.getRoutineExerciseList(id).forEachIndexed { index, item -> dao.insertRoutineExercise(item.copy(id = 0, routineId = newId, sortOrder = index)) }
        newId
    }
    suspend fun archive(id: Long, archived: Boolean) = db.withTransaction {
        val routine = requireNotNull(dao.getRoutine(id)) { "Treino não encontrado." }
        require(dao.getActiveSession()?.routineId != id) { "Conclua a sessão antes de arquivar." }
        require(dao.updateRoutine(routine.copy(archived = archived)) == 1)
    }
    suspend fun assign(id: Long, studentId: Long?) = db.withTransaction {
        val routine = editable(id)
        require(!routine.isTemplate) { "Crie um treino a partir do modelo antes de atribuir." }
        require(studentId == null || dao.getStudent(studentId)?.active == true) { "Selecione um aluno ativo." }
        require(routine.studentId == null || routine.studentId == studentId || studentId == null) { "Este treino pertence a outro aluno. Faça uma cópia antes de atribuir." }
        require(dao.assignRoutine(id, studentId) == 1)
    }
    suspend fun add(id: Long, exerciseId: Long) = db.withTransaction {
        editable(id)
        require(dao.getExercise(exerciseId) != null) { "Exercício não encontrado." }
        val items = dao.getRoutineExerciseList(id)
        require(items.none { it.exerciseId == exerciseId }) { "Esse exercício já está no treino." }
        items.forEachIndexed { index, item -> dao.updateSortOrder(item.id, index) }
        dao.insertRoutineExercise(RoutineExerciseEntity(routineId = id, exerciseId = exerciseId, sortOrder = items.size, prescriptionJson = com.google.gson.Gson().toJson(br.com.evolupersonal.core.Prescription(restSeconds = dao.getSettings()?.restSeconds ?: 90))))
    }
    suspend fun targets(itemId: Long, sets: Int, reps: Int) = db.withTransaction {
        require(sets in 1..15 && reps in 1..1000) { "Informe 1–15 séries e 1–1000 repetições." }
        val item = requireNotNull(dao.getRoutineItem(itemId)) { "Item não encontrado." }
        editable(item.routineId)
        require(dao.updateRoutineItem(item.copy(targetSets = sets, targetReps = reps, prescriptionJson = com.google.gson.Gson().toJson(item.prescription().copy(sets = sets, repsMin = reps, repsMax = reps)))) == 1)
    }
    suspend fun remove(itemId: Long) = db.withTransaction {
        val item = requireNotNull(dao.getRoutineItem(itemId)) { "Item não encontrado." }
        editable(item.routineId)
        require(dao.removeRoutineExercise(itemId) == 1)
        dao.getRoutineExerciseList(item.routineId).forEachIndexed { index, other -> dao.updateSortOrder(other.id, index) }
    }
    suspend fun move(id: Long, itemId: Long, direction: Int) = db.withTransaction {
        editable(id)
        require(direction == -1 || direction == 1)
        val items = dao.getRoutineExerciseList(id).toMutableList()
        val index = items.indexOfFirst { it.id == itemId }
        require(index >= 0 && index + direction in items.indices) { "Posição inválida." }
        java.util.Collections.swap(items, index, index + direction)
        items.forEachIndexed { order, item -> dao.updateSortOrder(item.id, order) }
    }
}
