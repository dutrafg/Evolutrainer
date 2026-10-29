package br.com.evolupersonal.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DatabaseMigrationTest {
    @Test fun migratesV1ToV3AndReopensWithoutLosingSessionOrSets() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val name = "migration-test.db"
        context.deleteDatabase(name)
        context.openOrCreateDatabase(name, 0, null).use { sql ->
            sql.execSQL("PRAGMA foreign_keys=ON")
            sql.execSQL("CREATE TABLE exercises (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, muscleGroup TEXT NOT NULL, origin TEXT NOT NULL, externalId TEXT)")
            sql.execSQL("CREATE UNIQUE INDEX index_exercises_externalId ON exercises(externalId)")
            sql.execSQL("CREATE TABLE routines (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, dayOfWeek INTEGER NOT NULL)")
            sql.execSQL("CREATE TABLE routine_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, routineId INTEGER NOT NULL, exerciseId INTEGER NOT NULL, sortOrder INTEGER NOT NULL, targetSets INTEGER NOT NULL, targetReps INTEGER NOT NULL, FOREIGN KEY(routineId) REFERENCES routines(id) ON DELETE CASCADE, FOREIGN KEY(exerciseId) REFERENCES exercises(id) ON DELETE RESTRICT)")
            sql.execSQL("CREATE INDEX index_routine_exercises_routineId ON routine_exercises(routineId)")
            sql.execSQL("CREATE INDEX index_routine_exercises_exerciseId ON routine_exercises(exerciseId)")
            sql.execSQL("CREATE UNIQUE INDEX index_routine_exercises_routineId_exerciseId ON routine_exercises(routineId,exerciseId)")
            sql.execSQL("CREATE TABLE workout_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, routineId INTEGER NOT NULL, startedAt INTEGER NOT NULL, finishedAt INTEGER, FOREIGN KEY(routineId) REFERENCES routines(id) ON DELETE RESTRICT)")
            sql.execSQL("CREATE INDEX index_workout_sessions_routineId ON workout_sessions(routineId)")
            sql.execSQL("CREATE TABLE workout_sets (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, sessionId INTEGER NOT NULL, exerciseId INTEGER NOT NULL, setNumber INTEGER NOT NULL, repetitions INTEGER NOT NULL, loadKg REAL NOT NULL, rir INTEGER, performedAt INTEGER NOT NULL, FOREIGN KEY(sessionId) REFERENCES workout_sessions(id) ON DELETE CASCADE, FOREIGN KEY(exerciseId) REFERENCES exercises(id) ON DELETE RESTRICT)")
            sql.execSQL("CREATE INDEX index_workout_sets_sessionId ON workout_sets(sessionId)")
            sql.execSQL("CREATE INDEX index_workout_sets_exerciseId ON workout_sets(exerciseId)")
            sql.execSQL("CREATE UNIQUE INDEX index_workout_sets_sessionId_exerciseId_setNumber ON workout_sets(sessionId,exerciseId,setNumber)")
            sql.execSQL("INSERT INTO exercises VALUES(12,'Agachamento','Pernas','MANUAL',NULL)")
            sql.execSQL("INSERT INTO routines VALUES(7,'Treino A',1)")
            sql.execSQL("INSERT INTO routine_exercises VALUES(8,7,12,0,3,10)")
            sql.execSQL("INSERT INTO workout_sessions VALUES(9,7,1000,NULL)")
            sql.execSQL("INSERT INTO workout_sets VALUES(10,9,12,1,10,25.5,2,1100)")
            sql.version = 1
        }
        fun open() = Room.databaseBuilder(context, TrainerDatabase::class.java, name)
            .addMigrations(TrainerDatabase.MIGRATION_1_2, TrainerDatabase.MIGRATION_2_3).allowMainThreadQueries().build()
        try {
            open().use { db ->
                val dao = db.trainerDao()
                assertEquals(12L, dao.exportExercises().single().id)
                assertEquals(7L, dao.exportRoutines().single().id)
                assertEquals(8L, dao.exportItems().single().id)
                assertEquals(9L, dao.getActiveSession()?.id)
                val set = dao.exportSets().single()
                assertEquals(10L, set.id); assertEquals(25.5, set.loadKg, 0.0)
                assertEquals("NORMAL", set.setType); assertEquals("", set.notes); assertNull(set.rpe)
                assertTrue(dao.exportStudents().isEmpty())
                dao.saveSettings(AppSettingsEntity(name = "Profissional", initialized = true))
            }
            open().use { db -> assertEquals("Profissional", db.trainerDao().getSettings()?.name); assertEquals(1, db.trainerDao().exportSets().size) }
        } finally { context.deleteDatabase(name) }
    }
}
