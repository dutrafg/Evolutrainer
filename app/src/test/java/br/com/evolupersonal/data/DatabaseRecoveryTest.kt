package br.com.evolupersonal.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.google.gson.Gson
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DatabaseRecoveryTest {
    private lateinit var db: TrainerDatabase
    @Before fun setup() { db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build() }
    @After fun close() { db.close() }
    private suspend fun seed() {
        val dao = db.trainerDao()
        dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true, weightUnit = "lb", lengthUnit = "in"))
        val student = dao.insertStudent(StudentEntity(name = "José", goal = "Força", equipment = "Halteres", notes = "Histórico", availability = "Segundas às 18h"))
        val exercise = dao.insertExercise(ExerciseEntity(name = "Agachamento", muscleGroup = "Pernas"))
        val routine = dao.insertRoutine(RoutineEntity(title = "Treino A", studentId = student))
        dao.insertRoutineExercise(RoutineExerciseEntity(routineId = routine, exerciseId = exercise))
        repeat(35) { i ->
            val session = dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1000L + i, finishedAt = if (i == 34) null else 2000L + i, studentId = student))
            dao.insertSet(WorkoutSetEntity(sessionId = session, exerciseId = exercise, setNumber = 1, repetitions = 10, loadKg = 25.0, rir = 2, performedAt = 1100L + i))
        }
    }
    @Test fun backupRestoresEveryTableBeyondThirtySessionsAndOpenWorkout() = runBlocking {
        seed()
        val backup = TrainerBackup(db)
        val snapshot = backup.snapshot()
        val original = Gson().fromJson(String(snapshot), BackupData::class.java)
        db.trainerDao().insertStudent(StudentEntity(name = "Temporário", goal = "Força", equipment = "", notes = ""))
        backup.restore(snapshot)
        assertEquals(35, db.trainerDao().exportSessions().size)
        assertNotNull(db.trainerDao().getActiveSession())
        assertEquals(original, Gson().fromJson(String(backup.snapshot()), BackupData::class.java))
    }
    @Test fun invalidBackupPreservesCurrentData() = runBlocking {
        seed()
        val backup = TrainerBackup(db)
        val before = backup.snapshot()
        val data = Gson().fromJson(String(before), BackupData::class.java)
        try {
            backup.restore(com.google.gson.GsonBuilder().serializeNulls().create().toJson(data.copy(routines = data.routines.map { it.copy(studentId = 999) })).toByteArray())
            fail("Dangling student must be rejected")
        } catch (_: IllegalArgumentException) { }
        assertArrayEquals(before, backup.snapshot())
        try { backup.restore("{}".toByteArray()); fail("Missing fields must be rejected") } catch (_: Exception) { }
        assertArrayEquals(before, backup.snapshot())
    }
    @Test fun sqlFailureDuringRestoreRollsBackAllTables() = runBlocking {
        seed()
        val backup = TrainerBackup(db)
        val before = backup.snapshot()
        val json = com.google.gson.JsonParser.parseString(String(before)).asJsonObject
        json.getAsJsonArray("students")[0].asJsonObject.addProperty("name", "Bloqueado")
        db.openHelper.writableDatabase.execSQL("CREATE TRIGGER reject_restore BEFORE INSERT ON students WHEN NEW.name = 'Bloqueado' BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END")
        try { backup.restore(json.toString().toByteArray()); fail("Simulated SQL failure must abort") } catch (_: android.database.SQLException) { }
        assertArrayEquals(before, backup.snapshot())
        assertEquals(35, db.trainerDao().exportSessions().size)
    }

    @Test fun editAndInactivatePreserveLinksAndHistory() = runBlocking {
        seed()
        val dao = db.trainerDao(); val old = dao.exportStudents().single()
        val sessions = dao.exportSessions(); val sets = dao.exportSets()
        assertEquals(1, dao.updateStudent(old.copy(name = "João", active = false)))
        assertEquals(sessions, dao.exportSessions()); assertEquals(sets, dao.exportSets())
        assertEquals(old.id, dao.exportRoutines().single().studentId)
        assertFalse(requireNotNull(dao.getStudent(old.id)).active)
        dao.updateStudent(requireNotNull(dao.getStudent(old.id)).copy(active = true))
        assertTrue(requireNotNull(dao.getStudent(old.id)).active)
    }
}
