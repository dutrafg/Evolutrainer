package br.com.evolupersonal.data

import androidx.room.withTransaction
import java.text.Normalizer
import java.util.Locale

/** Shared search rules for the library and future routine picker. */
object ExerciseSearch {
    fun normalize(text: String): String = Normalizer.normalize(text, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT).trim().replace(Regex("\\s+"), " ")

    fun filter(exercises: List<ExerciseEntity>, query: String = "", muscle: String = "", equipment: String = "", favoritesOnly: Boolean = false): List<ExerciseEntity> {
        val words = normalize(query).split(' ').filter { it.isNotEmpty() }
        return exercises.filter { exercise ->
            val searchable = normalize("${exercise.name} ${exercise.muscleGroup} ${exercise.equipment}")
            words.all { it in searchable } &&
                (muscle.isEmpty() || normalize(exercise.muscleGroup) == normalize(muscle)) &&
                (equipment.isEmpty() || normalize(exercise.equipment) == normalize(equipment)) &&
                (!favoritesOnly || exercise.favorite)
        }.sortedWith(compareBy({ normalize(it.name) }, { it.id }))
    }
}

class ExerciseCatalog(private val db: TrainerDatabase) {
    suspend fun save(id: Long?, name: String, muscle: String, equipment: String, instructions: String): Long = db.withTransaction {
        val dao = db.trainerDao()
        require(name.trim().length in 2..80 && muscle.trim().length in 2..50 && equipment.trim().length <= 100 && instructions.trim().length <= 2000) {
            "Confira nome (2–80), grupo muscular (2–50), equipamento (até 100) e instruções (até 2000 caracteres)."
        }
        val existing = if (id == null) null else requireNotNull(dao.getExercise(id)) { "Exercício não encontrado." }
        require(existing == null || existing.origin == "MANUAL") { "Somente exercícios próprios podem ser editados." }
        val updated = (existing ?: ExerciseEntity(name = "", muscleGroup = "")).copy(
            name = name.trim(), muscleGroup = muscle.trim(), equipment = equipment.trim(), instructions = instructions.trim()
        )
        require(dao.exportExercises().none {
            it.id != id && ExerciseSearch.normalize(it.name) == ExerciseSearch.normalize(updated.name) &&
                ExerciseSearch.normalize(it.muscleGroup) == ExerciseSearch.normalize(updated.muscleGroup) &&
                ExerciseSearch.normalize(it.equipment) == ExerciseSearch.normalize(updated.equipment)
        }) { "Já existe um exercício com esse nome, grupo muscular e equipamento." }
        if (existing == null) dao.insertExercise(updated) else {
            require(dao.updateExercise(updated) == 1)
            existing.id
        }
    }
}
