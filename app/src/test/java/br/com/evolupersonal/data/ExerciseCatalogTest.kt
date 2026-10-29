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
class ExerciseCatalogTest {
    private lateinit var db: TrainerDatabase
    @Before fun setup() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), TrainerDatabase::class.java).allowMainThreadQueries().build()
    }
    @After fun close() { db.close() }

    @Test fun editingAndFavoritingPreserveIdentityRoutineAndHistoricalSets() = runBlocking {
        val dao = db.trainerDao()
        val catalog = ExerciseCatalog(db)
        val id = catalog.save(null, "Elevação lateral", "Ombros", "Halteres", "Execução controlada")
        val routine = dao.insertRoutine(RoutineEntity(title = "Treino A"))
        dao.insertRoutineExercise(RoutineExerciseEntity(routineId = routine, exerciseId = id))
        val session = dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = 1000, finishedAt = 2000))
        dao.insertSet(WorkoutSetEntity(sessionId = session, exerciseId = id, setNumber = 1, repetitions = 10, loadKg = 4.0, rir = 2, performedAt = 1500))
        val sets = dao.exportSets()
        dao.setExerciseFavorite(id, true)
        assertEquals(id, catalog.save(id, "Elevação lateral sentada", "Ombros", "Halteres", "Sentado"))
        assertTrue(dao.getExercise(id)!!.favorite)
        assertEquals("Sentado", dao.getExercise(id)!!.instructions)
        assertEquals(id, dao.exportItems().single().exerciseId)
        assertEquals(sets, dao.exportSets())
    }

    @Test fun duplicatesAreAccentInsensitiveButDifferentEquipmentIsAllowed() = runBlocking {
        val catalog = ExerciseCatalog(db)
        catalog.save(null, "Elevação lateral", "Ombros", "Halteres", "")
        try { catalog.save(null, " ELEVACAO  LATERAL ", "ombros", "halteres", ""); fail("Duplicate") } catch (_: IllegalArgumentException) { }
        catalog.save(null, "Elevação lateral", "Ombros", "Cabo", "")
        assertEquals(2, db.trainerDao().exportExercises().size)
        try { catalog.save(null, "A", "Ombros", "", ""); fail("Invalid name") } catch (_: IllegalArgumentException) { }
        try { catalog.save(999, "Nome válido", "Ombros", "", ""); fail("Missing ID") } catch (_: IllegalArgumentException) { }
        val imported = db.trainerDao().insertExercise(ExerciseEntity(name = "Importado", muscleGroup = "Pernas", origin = "LIBRARY", externalId = "lib:1"))
        try { catalog.save(imported, "Alterado", "Pernas", "", ""); fail("Imported metadata") } catch (_: IllegalArgumentException) { }
        assertEquals("lib:1", db.trainerDao().getExercise(imported)!!.externalId)
    }

    @Test fun backupRoundtripIncludesCatalogAndLegacyBackupGetsDefaults() = runBlocking {
        val dao = db.trainerDao()
        dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
        val id = ExerciseCatalog(db).save(null, "Elevação", "Ombros", "Halteres", "Controle")
        dao.setExerciseFavorite(id, true)
        val backup = TrainerBackup(db)
        val original = backup.snapshot()
        val legacy = JsonParser.parseString(String(original)).asJsonObject
        legacy.addProperty("databaseVersion", 3)
        legacy.getAsJsonArray("items").forEach { it.asJsonObject.remove("prescriptionJson") }
        legacy.getAsJsonArray("sessions").forEach { it.asJsonObject.remove("runtimeJson") }
        legacy.getAsJsonArray("exercises").forEach { e -> listOf("equipment", "instructions", "favorite").forEach { e.asJsonObject.remove(it) } }
        backup.restore(legacy.toString().toByteArray())
        assertEquals("", dao.getExercise(id)!!.equipment)
        assertFalse(dao.getExercise(id)!!.favorite)
        backup.restore(original)
        assertEquals("Halteres", dao.getExercise(id)!!.equipment)
        assertEquals("Controle", dao.getExercise(id)!!.instructions)
        assertTrue(dao.getExercise(id)!!.favorite)
        assertArrayEquals(original, backup.snapshot())
        val malformed = JsonParser.parseString(String(original)).asJsonObject
        malformed.getAsJsonArray("exercises")[0].asJsonObject.remove("favorite")
        try { backup.restore(malformed.toString().toByteArray()); fail("Missing v4 field") } catch (_: IllegalArgumentException) { }
        assertArrayEquals(original, backup.snapshot())
        malformed.getAsJsonArray("exercises")[0].asJsonObject.addProperty("favorite", "true")
        try { backup.restore(malformed.toString().toByteArray()); fail("Wrong boolean type") } catch (_: IllegalArgumentException) { }
        assertArrayEquals(original, backup.snapshot())
    }

    @Test fun searchCombinesWordsMuscleEquipmentAndFavorites() {
        val a = ExerciseEntity(id = 1, name = "Elevação lateral", muscleGroup = "Ombros", equipment = "Halteres", favorite = true)
        val b = a.copy(id = 2, equipment = "Cabo", favorite = false)
        val c = a.copy(id = 3, name = "Desenvolvimento")
        val list = listOf(a, b, c)
        assertEquals(listOf(a), ExerciseSearch.filter(list, "HALTERES elevacao", "ombros", "halteres", true))
        assertEquals(listOf(a, b), ExerciseSearch.filter(list, "elevação"))
        assertTrue(ExerciseSearch.filter(list, "", "Pernas").isEmpty())
        assertEquals(listOf(c, a), ExerciseSearch.filter(list, favoritesOnly = true))
    }
}
