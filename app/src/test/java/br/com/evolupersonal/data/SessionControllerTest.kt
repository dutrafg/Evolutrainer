package br.com.evolupersonal.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.core.Prescription
import br.com.evolupersonal.core.IntervalClock
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SessionControllerTest {
    @Test fun prescriptionPauseSubstitutionAndBackupSurviveReload() = runBlocking {
        val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build()
        try {
            val dao = db.trainerDao(); val controller = SessionController(db)
            dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
            val routine = dao.insertRoutine(RoutineEntity(title = "Treino"))
            val a = dao.insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas"))
            val b = dao.insertExercise(ExerciseEntity(name = "Puxada", muscleGroup = "Costas"))
            val item = dao.insertRoutineExercise(RoutineExerciseEntity(routineId = routine, exerciseId = a))
            val prescription = Prescription(repsMin = 8, repsMax = 12, loadKg = 20.0, rir = 2, restSeconds = 60, notes = "Controle", method = "EMOM", workSeconds = 40, intervalSeconds = 20, rounds = 5)
            controller.prescribe(item, prescription)
            assertEquals(prescription, dao.getRoutineItem(item)!!.prescription())
            dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1000))
            controller.timer(40, 20, 5, 2000)
            controller.pause(true, 12000)
            assertEquals(12000L, dao.getActiveSession()!!.runtime().pausedAt)
            controller.pause(false, 22000)
            assertEquals(12000L, dao.getActiveSession()!!.runtime().timerStart)
            assertEquals(10000L, dao.getActiveSession()!!.runtime().pausedMillis)
            controller.substitute(item, b)
            assertEquals(b, dao.getActiveSession()!!.runtime().substitutions[item])
            assertEquals(a, dao.getRoutineItem(item)!!.exerciseId)
            val backup = TrainerBackup(db); val bytes = backup.snapshot()
            controller.substitute(item, a)
            backup.restore(bytes)
            assertEquals(b, dao.getActiveSession()!!.runtime().substitutions[item])
            assertEquals(prescription, dao.getRoutineItem(item)!!.prescription())
            try { controller.prescribe(item, prescription.copy(loadKg = 30.0)); fail("Active prescription must stay frozen") } catch (_: IllegalArgumentException) { }
        } finally { db.close() }
    }
    @Test fun timerBoundariesAndMethodsAreValidated() {
        assertEquals("Execução", IntervalClock.phase(1000, 1000, 40, 20, 2).label)
        assertEquals("Intervalo", IntervalClock.phase(1000, 41000, 40, 20, 2).label)
        assertEquals(2, IntervalClock.phase(1000, 61000, 40, 20, 2).round)
        assertTrue(IntervalClock.phase(1000, 101000, 40, 20, 2).finished)
        Prescription.methods.keys.forEach { method -> Prescription(method = method, block = "A", durationSeconds = 120, workSeconds = 40, intervalSeconds = 20).validate() }
        try { Prescription(repsMin = 12, repsMax = 8).validate(); fail("Range") } catch (_: IllegalArgumentException) { }
        try { Prescription(method = "EMOM").validate(); fail("EMOM") } catch (_: IllegalArgumentException) { }
        try { Prescription(method = "AMRAP").validate(); fail("AMRAP") } catch (_: IllegalArgumentException) { }
    }
}
