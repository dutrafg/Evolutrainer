package br.com.evolupersonal.data

import androidx.room.withTransaction
import br.com.evolupersonal.core.Prescription
import com.google.gson.Gson

data class SessionRuntime(
    val pausedAt: Long = 0, val pausedMillis: Long = 0,
    val timerStart: Long = 0, val timerWork: Int = 30, val timerRest: Int = 15, val timerRounds: Int = 1,
    val substitutions: Map<Long, Long> = emptyMap()
)
fun RoutineExerciseEntity.prescription(): Prescription = if (prescriptionJson.isBlank()) Prescription(sets = targetSets, repsMin = targetReps, repsMax = targetReps) else Gson().fromJson(prescriptionJson, Prescription::class.java).also { it.validate() }
fun WorkoutSessionEntity.runtime(): SessionRuntime = if (runtimeJson.isBlank()) SessionRuntime() else Gson().fromJson(runtimeJson, SessionRuntime::class.java)

class SessionController(private val db: TrainerDatabase) {
    private val dao = db.trainerDao()
    suspend fun prescribe(id: Long, prescription: Prescription) = db.withTransaction {
        prescription.validate()
        val item = requireNotNull(dao.getRoutineItem(id))
        require(dao.getActiveSession()?.routineId != item.routineId) { "Conclua o treino antes de alterar a prescrição." }
        require(dao.getRoutine(item.routineId)?.archived == false)
        dao.updateRoutineItem(item.copy(targetSets = prescription.sets, targetReps = prescription.repsMin, prescriptionJson = Gson().toJson(prescription)))
    }
    suspend fun pause(paused: Boolean, now: Long = System.currentTimeMillis()) = db.withTransaction {
        val session = requireNotNull(dao.getActiveSession())
        val state = session.runtime()
        val updated = if (paused && state.pausedAt == 0L) state.copy(pausedAt = now) else if (!paused && state.pausedAt > 0) {
            val duration = (now - state.pausedAt).coerceAtLeast(0)
            state.copy(pausedAt = 0, pausedMillis = state.pausedMillis + duration, timerStart = if (state.timerStart > 0) state.timerStart + duration else 0)
        } else state
        dao.updateSession(session.copy(runtimeJson = Gson().toJson(updated)))
    }
    suspend fun timer(work: Int, rest: Int, rounds: Int, now: Long = System.currentTimeMillis()) = db.withTransaction {
        require(work in 1..7200 && rest in 0..3600 && rounds in 1..100)
        val session = requireNotNull(dao.getActiveSession()); val state = session.runtime()
        require(state.pausedAt == 0L) { "Retome o treino primeiro." }
        dao.updateSession(session.copy(runtimeJson = Gson().toJson(state.copy(timerStart = now, timerWork = work, timerRest = rest, timerRounds = rounds))))
    }
    suspend fun substitute(itemId: Long, exerciseId: Long) = db.withTransaction {
        val session = requireNotNull(dao.getActiveSession()); val state = session.runtime()
        require(state.pausedAt == 0L) { "Retome o treino primeiro." }
        val item = requireNotNull(dao.getRoutineItem(itemId)); require(item.routineId == session.routineId)
        require(dao.getExercise(exerciseId) != null)
        val items = dao.getRoutineExerciseList(session.routineId)
        require(items.none { it.id != itemId && (state.substitutions[it.id] ?: it.exerciseId) == exerciseId }) { "Exercício já está na sessão." }
        val changed = state.substitutions.toMutableMap().also { if (exerciseId == item.exerciseId) it.remove(itemId) else it[itemId] = exerciseId }
        dao.updateSession(session.copy(runtimeJson = Gson().toJson(state.copy(substitutions = changed))))
    }
}
