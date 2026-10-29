package br.com.evolupersonal.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.google.gson.Gson
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SessionSnapshotTest {
    @Test fun restoresV6AndOldV7WithoutInventingOrigin() = runBlocking {
        val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build()
        try {
            val dao = db.trainerDao(); dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
            val exercise = dao.insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas"))
            val routine = dao.insertRoutine(RoutineEntity(title = "Treino"))
            val snapshot = SessionSnapshot("Treino", "", listOf(SnapshotExercise(exercise, "Remada", "Costas", br.com.evolupersonal.core.Prescription())))
            dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1000, snapshotJson = Gson().toJson(snapshot)))
            val backup = TrainerBackup(db); val bytes = backup.snapshot()
            val oldV7 = com.google.gson.JsonParser.parseString(String(bytes)).asJsonObject
            val session = oldV7.getAsJsonArray("sessions")[0].asJsonObject
            val oldSnapshot = com.google.gson.JsonParser.parseString(session["snapshotJson"].asString).asJsonObject
            oldSnapshot.getAsJsonArray("exercises").forEach { it.asJsonObject.remove("source"); it.asJsonObject.remove("itemId") }
            session.addProperty("snapshotJson", oldSnapshot.toString())
            backup.restore(oldV7.toString().toByteArray())
            assertNull(dao.getActiveSession()!!.snapshot()!!.exercises.single().source)
            val v6 = com.google.gson.JsonParser.parseString(String(bytes)).asJsonObject
            v6.addProperty("databaseVersion", 6)
            v6.getAsJsonArray("sessions").forEach { it.asJsonObject.remove("snapshotJson"); it.asJsonObject.remove("observations") }
            backup.restore(v6.toString().toByteArray())
            assertNull(dao.getActiveSession()!!.snapshot())
            assertEquals(1, dao.exportSessions().size)
            backup.restore(bytes)
            assertEquals("PLANNED", dao.getActiveSession()!!.snapshot()!!.exercises.single().source)
        } finally { db.close() }
    }
    @Test fun snapshotAndSubstitutionAuditSurviveEditsAndBackup() = runBlocking {
        val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build()
        try {
            val dao = db.trainerDao(); dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
            val a = dao.insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas"))
            val b = dao.insertExercise(ExerciseEntity(name = "Puxada", muscleGroup = "Costas"))
            val routine = dao.insertRoutine(RoutineEntity(title = "Original"))
            val item = dao.insertRoutineExercise(RoutineExerciseEntity(routineId = routine, exerciseId = a))
            val snapshot = SessionSnapshot("Original", "Pessoal", listOf(SnapshotExercise(a, "Remada", "Costas", dao.getRoutineItem(item)!!.prescription())))
            dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1000, snapshotJson = Gson().toJson(snapshot)))
            SessionController(db).substitute(item, b)
            dao.updateExercise(dao.getExercise(b)!!.copy(name = "Nome atualizado"))
            assertEquals("Puxada", dao.getActiveSession()!!.snapshot()!!.exercises.last().name)
            assertEquals("PLANNED", dao.getActiveSession()!!.snapshot()!!.exercises.first().source)
            assertEquals("SUBSTITUTE", dao.getActiveSession()!!.snapshot()!!.exercises.last().source)
            assertTrue(dao.getActiveSession()!!.runtime().events.single().contains("Substituição"))
            val backup = TrainerBackup(db); val bytes = backup.snapshot(); backup.restore(bytes)
            assertEquals("Original", dao.getActiveSession()!!.snapshot()!!.title)
            assertEquals("Puxada", dao.getActiveSession()!!.snapshot()!!.exercises.last().name)
            assertEquals("PLANNED", dao.getActiveSession()!!.snapshot()!!.exercises.first().source)
            assertEquals("SUBSTITUTE", dao.getActiveSession()!!.snapshot()!!.exercises.last().source)
            assertArrayEquals(bytes, backup.snapshot())
        } finally { db.close() }
    }
}
