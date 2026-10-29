package br.com.evolupersonal.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.google.gson.JsonParser
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
class RoutineBuilderTest {
    private lateinit var db: TrainerDatabase
    private lateinit var builder: RoutineBuilder
    @Before fun setup() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build()
        builder = RoutineBuilder(db)
    }
    @After fun close() { db.close() }
    private suspend fun exercise(name: String) = db.trainerDao().insertExercise(ExerciseEntity(name = name, muscleGroup = "Pernas"))
    private suspend fun reject(block: suspend () -> Unit) { try { block(); fail("Must reject") } catch (_: IllegalArgumentException) { } }

    @Test fun savesEditsAndCopiesIndependentModelsWithoutStudentOrHistory() = runBlocking {
        val dao = db.trainerDao()
        val source = builder.save(null, "Treino A", 1, "A", "Inicial")
        val e = exercise("Agachamento")
        builder.add(source, e)
        builder.targets(dao.getRoutineExerciseList(source).single().id, 4, 12)
        val student = dao.insertStudent(StudentEntity(name = "Maria", goal = "Força", equipment = "", notes = ""))
        builder.assign(source, student)
        builder.save(source, "Treino revisado", 3, "Inferior", "Atualizado")
        assertEquals(student, dao.getRoutine(source)!!.studentId)
        val session = dao.insertSession(WorkoutSessionEntity(routineId = source, startedAt = 1, finishedAt = 2, studentId = student))
        val template = builder.copy(source, true)
        assertTrue(dao.getRoutine(template)!!.isTemplate)
        assertNull(dao.getRoutine(template)!!.studentId)
        assertEquals("Inferior", dao.getRoutine(template)!!.divisionLabel)
        assertEquals("Atualizado", dao.getRoutine(template)!!.notes)
        val copy = builder.copy(template, false)
        val copiedItem = dao.getRoutineExerciseList(copy).single()
        assertFalse(dao.getRoutine(copy)!!.isTemplate)
        assertEquals(4, copiedItem.targetSets); assertEquals(12, copiedItem.targetReps)
        builder.targets(copiedItem.id, 2, 8)
        assertEquals(4, dao.getRoutineExerciseList(template).single().targetSets)
        assertEquals(4, dao.getRoutineExerciseList(source).single().targetSets)
        assertEquals(session, dao.exportSessions().single().id)
        reject { builder.assign(template, student) }
        reject { builder.save(source, "Modelo", 0, "", "", true) }
    }

    @Test fun removeAddAndMoveNormalizeLegacyGapsAndKeepHistoricalSets() = runBlocking {
        val dao = db.trainerDao()
        val routine = builder.save(null, "Treino A", 0, "", "")
        val a = exercise("Exercício A"); val b = exercise("Exercício B"); val c = exercise("Exercício C")
        dao.insertRoutineExercise(RoutineExerciseEntity(routineId = routine, exerciseId = a, sortOrder = 0))
        val bItem = dao.insertRoutineExercise(RoutineExerciseEntity(routineId = routine, exerciseId = b, sortOrder = 0))
        val session = dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1, finishedAt = 3))
        dao.insertSet(WorkoutSetEntity(sessionId = session, exerciseId = a, setNumber = 1, repetitions = 10, loadKg = 20.0, rir = 2, performedAt = 2))
        val history = dao.exportSets()
        builder.move(routine, bItem, -1)
        assertEquals(listOf(b, a), dao.getRoutineExerciseList(routine).map { it.exerciseId })
        builder.remove(dao.getRoutineExerciseList(routine).last().id)
        builder.add(routine, c)
        assertEquals(listOf(0, 1), dao.getRoutineExerciseList(routine).map { it.sortOrder })
        assertEquals(listOf(b, c), dao.getRoutineExerciseList(routine).map { it.exerciseId })
        assertEquals(history, dao.exportSets())
        reject { builder.add(routine, c) }
        reject { builder.move(routine, bItem, -1) }
        assertEquals(listOf(b, c), dao.getRoutineExerciseList(routine).map { it.exerciseId })
    }

    @Test fun activeRoutineBlocksEveryMutationButAnotherRoutineRemainsEditable() = runBlocking {
        val dao = db.trainerDao()
        val active = builder.save(null, "Ativo", 1, "A", "")
        val other = builder.save(null, "Outro", 2, "B", "")
        val a = exercise("Agachamento"); val b = exercise("Avanço")
        builder.add(active, a); builder.add(active, b)
        val item = dao.getRoutineExerciseList(active).first()
        dao.insertSession(WorkoutSessionEntity(routineId = active, startedAt = 1))
        reject { builder.save(active, "Mudança", 0, "", "") }
        reject { builder.targets(item.id, 5, 20) }
        reject { builder.remove(item.id) }
        reject { builder.move(active, item.id, 1) }
        reject { builder.add(active, exercise("Outro exercício")) }
        reject { builder.assign(active, null) }
        reject { builder.archive(active, true) }
        builder.save(other, "Editado", 0, "B", "")
        assertEquals("Editado", dao.getRoutine(other)!!.title)
        assertEquals(3, dao.getRoutineItem(item.id)!!.targetSets)
        assertEquals(2, dao.getRoutineExerciseList(active).size)
    }

    @Test fun archiveRestoreAndBackupKeepRoutineStudentAndHistory() = runBlocking {
        val dao = db.trainerDao()
        dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
        val routine = builder.save(null, "Treino", 4, "Superior", "Orientações")
        val student = dao.insertStudent(StudentEntity(name = "Maria", goal = "Força", equipment = "", notes = ""))
        builder.assign(routine, student)
        builder.add(routine, exercise("Remada"))
        dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1, finishedAt = 2, studentId = student))
        builder.archive(routine, true)
        reject { builder.add(routine, exercise("Supino")) }
        assertEquals(student, dao.getRoutine(routine)!!.studentId)
        val backup = TrainerBackup(db); val snapshot = backup.snapshot()
        builder.archive(routine, false)
        backup.restore(snapshot)
        assertTrue(dao.getRoutine(routine)!!.archived)
        assertEquals("Superior", dao.getRoutine(routine)!!.divisionLabel)
        assertEquals("Orientações", dao.getRoutine(routine)!!.notes)
        assertEquals(1, dao.exportSessions().size)
        builder.archive(routine, false)
        assertFalse(dao.getRoutine(routine)!!.archived)
    }

    @Test fun divisionsValidateAndRollBackAsAUnit() = runBlocking {
        val dao = db.trainerDao()
        reject { builder.createDivision("Plano", listOf("A", " a "), listOf(1, 2)) }
        assertTrue(dao.exportRoutines().isEmpty())
        db.openHelper.writableDatabase.execSQL("CREATE TRIGGER reject_division BEFORE INSERT ON routines WHEN NEW.divisionLabel = 'B' BEGIN SELECT RAISE(ABORT, 'simulated'); END")
        try { builder.createDivision("Plano", listOf("A", "B"), listOf(1, 3)); fail("Rollback") } catch (_: android.database.SQLException) { }
        assertTrue(dao.exportRoutines().isEmpty())
        db.openHelper.writableDatabase.execSQL("DROP TRIGGER reject_division")
        val ids = builder.createDivision("Plano", listOf("Superior", "Inferior"), listOf(1, 4))
        assertEquals(listOf("Superior", "Inferior"), ids.map { dao.getRoutine(it)!!.divisionLabel })
        assertEquals(listOf(1, 4), ids.map { dao.getRoutine(it)!!.dayOfWeek })
        assertTrue(dao.exportItems().isEmpty())
    }

    @Test fun v3AndV4BackupsUpgradeRoutineFieldsAndMalformedV5IsRejected() = runBlocking {
        val dao = db.trainerDao()
        dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
        val id = builder.save(null, "Treino", 1, "A", "Notas")
        builder.add(id, exercise("Remada"))
        val backup = TrainerBackup(db); val original = backup.snapshot()
        for (version in listOf(3, 4)) {
            val old = JsonParser.parseString(String(original)).asJsonObject
            old.addProperty("databaseVersion", version)
            old.getAsJsonArray("sessions").forEach { it.asJsonObject.remove("snapshotJson"); it.asJsonObject.remove("observations") }
            old.getAsJsonArray("items").forEach { it.asJsonObject.remove("prescriptionJson") }
            old.getAsJsonArray("sessions").forEach { it.asJsonObject.remove("runtimeJson") }
            old.getAsJsonArray("routines").forEach { e -> listOf("divisionLabel", "notes", "isTemplate", "archived").forEach { e.asJsonObject.remove(it) } }
            if (version == 3) old.getAsJsonArray("exercises").forEach { e -> listOf("equipment", "instructions", "favorite").forEach { e.asJsonObject.remove(it) } }
            backup.restore(old.toString().toByteArray())
            assertEquals("", dao.getRoutine(id)!!.divisionLabel)
            assertFalse(dao.getRoutine(id)!!.isTemplate)
            assertEquals(1, dao.getRoutineExerciseList(id).size)
        }
        backup.restore(original)
        val invalid = JsonParser.parseString(String(original)).asJsonObject
        invalid.getAsJsonArray("routines")[0].asJsonObject.remove("archived")
        reject { backup.restore(invalid.toString().toByteArray()) }
        assertArrayEquals(original, backup.snapshot())
    }
}
