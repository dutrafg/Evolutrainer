package br.com.evolupersonal.core

import br.com.evolupersonal.data.*
import com.google.gson.Gson
import org.junit.Assert.*
import org.junit.Test

class PerformanceAnalysisTest {
    private val snapshot = Gson().toJson(SessionSnapshot("Treino", "Maria", listOf(SnapshotExercise(1, "Remada", "Costas", Prescription(sets = 1, repsMin = 8, repsMax = 12)))))
    private val sessions = (1L..3).map { WorkoutSessionEntity(id = it, routineId = 1, studentId = 7, startedAt = it * 1000, finishedAt = it * 1000 + 500, snapshotJson = snapshot) }
    private fun sets(reps: Int = 12, rir: Int = 3) = sessions.map { WorkoutSetEntity(id = it.id, sessionId = it.id, exerciseId = 1, setNumber = 1, repetitions = reps, loadKg = 20.0, rir = rir, performedAt = it.startedAt + 100) }
    @Test fun progressionExplainsIncreaseMaintenanceAndReductionWithoutMutation() {
        assertEquals(20.4, PerformanceAnalysis.progression(sessions, sets(), 1).loadKg!!, 0.00001)
        assertEquals("Manter e observar", PerformanceAnalysis.progression(sessions, sets(10, 2), 1).action)
        assertEquals(19.0, PerformanceAnalysis.progression(sessions, sets(7, 0), 1).loadKg!!, 0.0)
        assertEquals(20.0, sets().first().loadKg, 0.0)
    }
    @Test fun insufficientLegacyMixedStudentOrDifferentLoadCannotIncrease() {
        assertEquals("Dados insuficientes", PerformanceAnalysis.progression(sessions.take(2), sets(), 1).action)
        assertEquals("Revisar manualmente", PerformanceAnalysis.progression(sessions.map { it.copy(snapshotJson = "") }, sets(), 1).action)
        assertEquals("Revisar manualmente", PerformanceAnalysis.progression(sessions.mapIndexed { i, s -> s.copy(studentId = i.toLong()) }, sets(), 1).action)
        assertEquals("Revisar manualmente", PerformanceAnalysis.progression(sessions, sets().mapIndexed { i, s -> s.copy(loadKg = 20.0 + i) }, 1).action)
    }
    @Test fun newestSpecialWarmupOrUnperformedSessionCannotBeSkipped() {
        val newest = sessions.last().copy(id = 4, startedAt = 4000, finishedAt = 4500)
        val special = sets().last().copy(id = 4, sessionId = 4, setType = "DROP")
        assertEquals("Revisar manualmente", PerformanceAnalysis.progression(sessions + newest, sets() + special, 1).action)
        assertEquals("Dados insuficientes", PerformanceAnalysis.progression(sessions + newest, sets() + special.copy(setType = "AQUECIMENTO"), 1).action)
        assertEquals("Dados insuficientes", PerformanceAnalysis.progression(sessions + newest, sets(), 1).action)
    }
    @Test fun unrelatedSessionDoesNotHideComparableHistory() {
        val unrelatedSnapshot = Gson().toJson(SessionSnapshot("Outro", "Maria", listOf(SnapshotExercise(2, "Supino", "Peito", Prescription(sets = 1)))))
        val newest = sessions.last().copy(id = 4, startedAt = 4000, finishedAt = 4500, snapshotJson = unrelatedSnapshot)
        assertEquals("Considerar aumento", PerformanceAnalysis.progression(sessions + newest, sets(), 1).action)
    }
    @Test fun weeklySummaryExcludesOpenFutureAndOldSessions() {
        val summary = PerformanceAnalysis.weeklySummary(sessions + sessions[0].copy(id = 10, finishedAt = null) + sessions[0].copy(id = 11, finishedAt = 999999), sets(), 10000)
        assertEquals(3, summary.sessions)
        assertEquals(3, summary.sets)
        assertEquals(720.0, summary.volumeKg, 0.0)
        assertEquals(0, PerformanceAnalysis.weeklySummary(sessions, sets(), 10L * 24 * 60 * 60 * 1000).sessions)
    }
    @Test fun analysisExcludesOpenSessionsWarmupAndOtherExercises() {
        val input = sets() + sets().map { it.copy(exerciseId = 2, loadKg = 100.0) } + sets().map { it.copy(setType = "AQUECIMENTO", loadKg = 100.0) }
        val points = PerformanceAnalysis.points(sessions + sessions.first().copy(id = 99, finishedAt = null), input, 1)
        assertEquals(3, points.size)
        assertEquals(240.0, points.first().volume, 0.0)
        assertEquals(12, points.first().reps)
        assertNull(points.first().estimated1Rm)
    }
}
