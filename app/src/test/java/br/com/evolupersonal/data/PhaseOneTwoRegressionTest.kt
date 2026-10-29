package br.com.evolupersonal.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.core.Prescription
import br.com.evolupersonal.core.IntervalClock
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PhaseOneTwoRegressionTest {
    private fun memory() = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build()
    private suspend fun seed(db: TrainerDatabase): Pair<Long, Long> {
        val dao = db.trainerDao()
        dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true, restSeconds = 120, weightUnit = "lb"))
        val student = dao.insertStudent(StudentEntity(name = "José", goal = "Força", equipment = "Cabo", notes = "", availability = "Segunda"))
        val routine = RoutineBuilder(db).save(null, "Treino", 1, "A", "Notas")
        RoutineBuilder(db).assign(routine, student)
        val exercise = dao.insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas"))
        RoutineBuilder(db).add(routine, exercise)
        dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1000, studentId = student))
        return routine to dao.getRoutineExerciseList(routine).single().id
    }
    @Test fun encryptedBackupRoundtripRestoresProfileStudentPrescriptionAndPausedTimer() = runBlocking {
        val db = memory()
        try {
            val (routine, item) = seed(db); val dao = db.trainerDao()
            assertEquals(120, dao.getRoutineItem(item)!!.prescription().restSeconds)
            val controller = SessionController(db)
            controller.timer(40, 20, 4, 2000); controller.pause(true, 10000)
            val backup = TrainerBackup(db); val before = backup.snapshot()
            val cipher = BackupCrypto.encrypt(before, "senha-teste".toCharArray())
            dao.saveSettings(dao.getSettings()!!.copy(name = "Alterado"))
            backup.restore(BackupCrypto.decrypt(cipher, "senha-teste".toCharArray()))
            assertArrayEquals(before, backup.snapshot())
            assertEquals("lb", dao.getSettings()!!.weightUnit)
            assertEquals("José", dao.getStudent(dao.getRoutine(routine)!!.studentId!!)!!.name)
            assertEquals(10000L, dao.getActiveSession()!!.runtime().pausedAt)
        } finally { db.close() }
    }
    @Test fun malformedRuntimeAndPrescriptionDoNotReplaceExistingData() = runBlocking {
        val db = memory()
        try {
            seed(db); val backup = TrainerBackup(db); val before = backup.snapshot()
            for ((table, field, value) in listOf(Triple("items", "prescriptionJson", "{\"sets\":999}"), Triple("sessions", "runtimeJson", "{\"timerWork\":-1}"))) {
                val json = JsonParser.parseString(String(before)).asJsonObject
                json.getAsJsonArray(table)[0].asJsonObject.addProperty(field, value)
                try { backup.restore(json.toString().toByteArray()); fail("Invalid embedded data") } catch (_: Exception) { }
                assertArrayEquals(before, backup.snapshot())
            }
        } finally { db.close() }
    }
    @Test fun databaseCloseAndReopenPreserveSessionAndPausedTimer() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>(); val name = "phase12-reopen.db"
        context.deleteDatabase(name)
        fun open() = Room.databaseBuilder(context, TrainerDatabase::class.java, name).allowMainThreadQueries().build()
        try {
            val first = open()
            try { seed(first); SessionController(first).timer(30, 15, 3, 2000); SessionController(first).pause(true, 7000) } finally { first.close() }
            val second = open()
            try {
                val active = second.trainerDao().getActiveSession()!!
                assertEquals(7000L, active.runtime().pausedAt)
                assertEquals(2000L, active.runtime().timerStart)
                SessionController(second).pause(false, 17000)
                assertEquals(12000L, second.trainerDao().getActiveSession()!!.runtime().timerStart)
                assertEquals(120, second.trainerDao().exportItems().single().prescription().restSeconds)
            } finally { second.close() }
        } finally { context.deleteDatabase(name) }
    }
    @Test fun intervalClockAndPrescriptionRejectInvalidBoundaries() {
        assertFalse(IntervalClock.phase(1000, 0, 30, 0, 1).finished)
        assertTrue(IntervalClock.phase(1000, 31000, 30, 0, 1).finished)
        assertEquals(100, IntervalClock.phase(1000, Long.MAX_VALUE, 3600, 3600, 100).round)
        for (p in listOf(Prescription(loadKg = Double.NaN), Prescription(loadKg = Double.POSITIVE_INFINITY), Prescription(rir = 11), Prescription(rpe = 0), Prescription(method = "TRI", block = ""), Prescription(rounds = 101))) {
            try { p.validate(); fail("Invalid prescription") } catch (_: IllegalArgumentException) { }
        }
    }
}
