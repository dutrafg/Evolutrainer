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
    @Test fun migratesV1ToV5AndReopensWithoutLosingSessionOrSets() = checkMigration(1)
    @Test fun migratesV2ToV5AndPreservesExistingStudent() = checkMigration(2)

    @Test fun migratesV3ToV5WithSafeDefaults() = checkMigration(3)

    @Test fun migratesV4ToV5PreservingExerciseMetadata() = checkMigration(4)

    @Test fun migratesV5ToV6PreservingRoutine() = checkMigration(5)

    private fun checkMigration(startVersion: Int) = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val name = "migration-test-$startVersion.db"
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
            if (startVersion >= 2) {
                sql.execSQL("CREATE TABLE students (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, goal TEXT NOT NULL, equipment TEXT NOT NULL, notes TEXT NOT NULL, active INTEGER NOT NULL)")
                sql.execSQL("ALTER TABLE routines ADD COLUMN studentId INTEGER")
                sql.execSQL("ALTER TABLE workout_sessions ADD COLUMN studentId INTEGER")
                sql.execSQL("ALTER TABLE workout_sessions ADD COLUMN energy INTEGER")
                sql.execSQL("ALTER TABLE workout_sessions ADD COLUMN sleep INTEGER")
                sql.execSQL("ALTER TABLE workout_sessions ADD COLUMN fatigue INTEGER")
                sql.execSQL("ALTER TABLE workout_sets ADD COLUMN setType TEXT NOT NULL DEFAULT 'NORMAL'")
                sql.execSQL("ALTER TABLE workout_sets ADD COLUMN rpe INTEGER")
                sql.execSQL("ALTER TABLE workout_sets ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
                sql.execSQL("INSERT INTO students VALUES(42, 'Maria', 'Força', 'Halteres', 'Preservar', 0)")
                sql.execSQL("UPDATE routines SET studentId = 42")
                sql.execSQL("UPDATE workout_sessions SET studentId = 42, energy = 3")
            }
            if (startVersion >= 3) {
                sql.execSQL("ALTER TABLE students ADD COLUMN availability TEXT NOT NULL DEFAULT ''")
                sql.execSQL("CREATE TABLE app_settings (id INTEGER NOT NULL PRIMARY KEY, name TEXT NOT NULL, dark INTEGER NOT NULL, initialized INTEGER NOT NULL, experience TEXT NOT NULL, equipment TEXT NOT NULL, goal TEXT NOT NULL, restSeconds INTEGER NOT NULL, weightUnit TEXT NOT NULL, lengthUnit TEXT NOT NULL)")
                sql.execSQL("INSERT INTO app_settings VALUES(1,'Original',1,1,'Iniciante','','Força',90,'kg','cm')")
            }
            if (startVersion >= 4) {
                sql.execSQL("ALTER TABLE exercises ADD COLUMN equipment TEXT NOT NULL DEFAULT ''")
                sql.execSQL("ALTER TABLE exercises ADD COLUMN instructions TEXT NOT NULL DEFAULT ''")
                sql.execSQL("ALTER TABLE exercises ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0")
                sql.execSQL("UPDATE exercises SET equipment='Halteres', instructions='Controle', favorite=1")
            }
            if (startVersion >= 5) {
                sql.execSQL("ALTER TABLE routines ADD COLUMN divisionLabel TEXT NOT NULL DEFAULT ''")
                sql.execSQL("ALTER TABLE routines ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
                sql.execSQL("ALTER TABLE routines ADD COLUMN isTemplate INTEGER NOT NULL DEFAULT 0")
                sql.execSQL("ALTER TABLE routines ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
            }
            sql.version = startVersion
        }
        fun open() = Room.databaseBuilder(context, TrainerDatabase::class.java, name)
            .addMigrations(TrainerDatabase.MIGRATION_1_2, TrainerDatabase.MIGRATION_2_3, TrainerDatabase.MIGRATION_3_4, TrainerDatabase.MIGRATION_4_5, TrainerDatabase.MIGRATION_5_6).allowMainThreadQueries().build()
        try {
            val db = open()
            try {
                val dao = db.trainerDao()
                val exercise = dao.exportExercises().single()
                assertEquals(12L, exercise.id)
                assertEquals(if (startVersion >= 4) "Halteres" else "", exercise.equipment)
                assertEquals(if (startVersion >= 4) "Controle" else "", exercise.instructions)
                assertEquals(startVersion >= 4, exercise.favorite)
                assertFalse(dao.getRoutine(7)!!.isTemplate)
                assertFalse(dao.getRoutine(7)!!.archived)
                assertEquals("", dao.getRoutine(7)!!.divisionLabel)
                assertEquals("", dao.getRoutine(7)!!.notes)
                if (startVersion >= 3) assertEquals("Original", dao.getSettings()?.name)
                assertEquals(7L, dao.exportRoutines().single().id)
                assertEquals(8L, dao.exportItems().single().id)
                assertEquals(9L, dao.getActiveSession()?.id)
                val set = dao.exportSets().single()
                assertEquals(10L, set.id); assertEquals(25.5, set.loadKg, 0.0)
                assertEquals("NORMAL", set.setType); assertEquals("", set.notes); assertNull(set.rpe)
                if (startVersion == 1) assertTrue(dao.exportStudents().isEmpty())
                else {
                    assertEquals("Maria", dao.getStudent(42)?.name)
                    assertEquals("", dao.getStudent(42)?.availability)
                    assertEquals(false, dao.getStudent(42)?.active)
                    assertEquals(42L, dao.exportRoutines().single().studentId)
                    assertEquals(42L, dao.getActiveSession()?.studentId)
                    assertEquals(3, dao.getActiveSession()?.energy)
                }
                dao.saveSettings(AppSettingsEntity(name = "Profissional", initialized = true))
            } finally { db.close() }
            val reopened = open()
            try {
                assertEquals("Profissional", reopened.trainerDao().getSettings()?.name)
                assertEquals(1, reopened.trainerDao().exportSets().size)
            } finally { reopened.close() }
        } finally { context.deleteDatabase(name) }
    }
}
