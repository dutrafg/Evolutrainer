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
            assertTrue(dao.getActiveSession()!!.runtime().events.single().contains("Substituição"))
            val backup = TrainerBackup(db); val bytes = backup.snapshot(); backup.restore(bytes)
            assertEquals("Original", dao.getActiveSession()!!.snapshot()!!.title)
            assertEquals("Puxada", dao.getActiveSession()!!.snapshot()!!.exercises.last().name)
            assertArrayEquals(bytes, backup.snapshot())
        } finally { db.close() }
    }
}
