package br.com.evolupersonal.data

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.Update
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

@Entity(
    tableName = "exercises",
    indices = [Index(value = ["externalId"], unique = true)]
)
data class ExerciseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val muscleGroup: String,
    val origin: String = "MANUAL",
    val externalId: String? = null,
    @ColumnInfo(defaultValue = "''") val equipment: String = "",
    @ColumnInfo(defaultValue = "''") val instructions: String = "",
    @ColumnInfo(defaultValue = "0") val favorite: Boolean = false
)

@Entity(tableName = "students")
data class StudentEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val goal: String,
    val equipment: String,
    val notes: String,
    val active: Boolean = true,
    @ColumnInfo(defaultValue = "''") val availability: String = ""
)

@Entity(tableName = "routines")
data class RoutineEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val dayOfWeek: Int = 0,
    val studentId: Long? = null,
    @ColumnInfo(defaultValue = "''") val divisionLabel: String = "",
    @ColumnInfo(defaultValue = "''") val notes: String = "",
    @ColumnInfo(defaultValue = "0") val isTemplate: Boolean = false,
    @ColumnInfo(defaultValue = "0") val archived: Boolean = false
)

@Entity(
    tableName = "routine_exercises",
    foreignKeys = [
        ForeignKey(
            entity = RoutineEntity::class,
            parentColumns = ["id"],
            childColumns = ["routineId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["exerciseId"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [Index("routineId"), Index("exerciseId"), Index(value = ["routineId", "exerciseId"], unique = true)]
)
data class RoutineExerciseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val routineId: Long,
    val exerciseId: Long,
    val sortOrder: Int = 0,
    val targetSets: Int = 3,
    val targetReps: Int = 10,
    @ColumnInfo(defaultValue = "''") val prescriptionJson: String = ""
)

@Entity(
    tableName = "workout_sessions",
    foreignKeys = [
        ForeignKey(
            entity = RoutineEntity::class,
            parentColumns = ["id"],
            childColumns = ["routineId"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [Index("routineId")]
)
data class WorkoutSessionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val routineId: Long,
    val startedAt: Long,
    val finishedAt: Long? = null,
    val studentId: Long? = null,
    val energy: Int? = null,
    val sleep: Int? = null,
    val fatigue: Int? = null,
    @ColumnInfo(defaultValue = "''") val runtimeJson: String = ""
)

@Entity(
    tableName = "workout_sets",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["exerciseId"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [Index("sessionId"), Index("exerciseId"), Index(value = ["sessionId", "exerciseId", "setNumber"], unique = true)]
)
data class WorkoutSetEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: Long,
    val exerciseId: Long,
    val setNumber: Int,
    val repetitions: Int,
    val loadKg: Double,
    val rir: Int?,
    val performedAt: Long,
    @ColumnInfo(defaultValue = "'NORMAL'") val setType: String = "NORMAL",
    val rpe: Int? = null,
    @ColumnInfo(defaultValue = "''") val notes: String = ""
)

@Entity(tableName = "app_settings")
data class AppSettingsEntity(
    @PrimaryKey val id: Int = 1,
    val name: String = "",
    val dark: Boolean = true,
    val initialized: Boolean = false,
    val experience: String = "Iniciante",
    val equipment: String = "",
    val goal: String = "Condicionamento",
    val restSeconds: Int = 90,
    val weightUnit: String = "kg",
    val lengthUnit: String = "cm"
)

@Dao
interface TrainerDao {
    @Update suspend fun updateRoutineItem(item: RoutineExerciseEntity): Int
    @Update suspend fun updateSession(item: WorkoutSessionEntity): Int

    @Update
    suspend fun updateRoutine(routine: RoutineEntity): Int

    @Query("SELECT * FROM routine_exercises WHERE id = :id")
    suspend fun getRoutineItem(id: Long): RoutineExerciseEntity?

    @Query("SELECT * FROM exercises WHERE id = :id")
    suspend fun getExercise(id: Long): ExerciseEntity?

    @Update
    suspend fun updateExercise(exercise: ExerciseEntity): Int

    @Query("UPDATE exercises SET favorite = :favorite WHERE id = :id")
    suspend fun setExerciseFavorite(id: Long, favorite: Boolean): Int

    @Query("SELECT * FROM app_settings WHERE id = 1")
    suspend fun getSettings(): AppSettingsEntity?

    @Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun saveSettings(settings: AppSettingsEntity)

    @Query("SELECT * FROM students WHERE id = :id")
    suspend fun getStudent(id: Long): StudentEntity?

    @Update
    suspend fun updateStudent(student: StudentEntity): Int

    @Query("SELECT * FROM exercises ORDER BY id")
    suspend fun exportExercises(): List<ExerciseEntity>
    @Query("SELECT * FROM students ORDER BY id")
    suspend fun exportStudents(): List<StudentEntity>
    @Query("SELECT * FROM routines ORDER BY id")
    suspend fun exportRoutines(): List<RoutineEntity>
    @Query("SELECT * FROM routine_exercises ORDER BY id")
    suspend fun exportItems(): List<RoutineExerciseEntity>
    @Query("SELECT * FROM workout_sessions ORDER BY id")
    suspend fun exportSessions(): List<WorkoutSessionEntity>
    @Query("SELECT * FROM workout_sets ORDER BY id")
    suspend fun exportSets(): List<WorkoutSetEntity>

    @Query("DELETE FROM workout_sets") suspend fun clearSets()
    @Query("DELETE FROM workout_sessions") suspend fun clearSessions()
    @Query("DELETE FROM routine_exercises") suspend fun clearItems()
    @Query("DELETE FROM routines") suspend fun clearRoutines()
    @Query("DELETE FROM students") suspend fun clearStudents()
    @Query("DELETE FROM exercises") suspend fun clearExercises()

    @Query("SELECT * FROM students ORDER BY name COLLATE NOCASE")
    fun observeStudents(): Flow<List<StudentEntity>>

    @Insert
    suspend fun insertStudent(item: StudentEntity): Long

    @Query("SELECT * FROM routines WHERE id = :id LIMIT 1")
    suspend fun getRoutine(id: Long): RoutineEntity?

    @Query("SELECT * FROM routine_exercises WHERE routineId = :routineId ORDER BY sortOrder, id")
    suspend fun getRoutineExerciseList(routineId: Long): List<RoutineExerciseEntity>

    @Query("UPDATE routine_exercises SET targetSets = :sets, targetReps = :reps WHERE id = :id")
    suspend fun updateTargets(id: Long, sets: Int, reps: Int): Int

    @Query("UPDATE routine_exercises SET sortOrder = :newIndex WHERE id = :id")
    suspend fun updateSortOrder(id: Long, newIndex: Int): Int

    @Query("DELETE FROM routine_exercises WHERE id = :id")
    suspend fun removeRoutineExercise(id: Long): Int

    @Query("UPDATE routines SET studentId = :studentId WHERE id = :routineId")
    suspend fun assignRoutine(routineId: Long, studentId: Long?): Int

    @Query("SELECT * FROM exercises ORDER BY name COLLATE NOCASE ASC")
    fun observeExercises(): Flow<List<ExerciseEntity>>

    @Query("SELECT * FROM routines ORDER BY id DESC")
    fun observeRoutines(): Flow<List<RoutineEntity>>

    @Query("SELECT * FROM routine_exercises ORDER BY routineId, sortOrder, id")
    fun observeRoutineExercises(): Flow<List<RoutineExerciseEntity>>

    @Query("SELECT * FROM workout_sessions WHERE finishedAt IS NULL ORDER BY startedAt DESC LIMIT 1")
    fun observeActiveSession(): Flow<WorkoutSessionEntity?>

    @Query("SELECT * FROM workout_sessions WHERE finishedAt IS NULL ORDER BY startedAt DESC LIMIT 1")
    suspend fun getActiveSession(): WorkoutSessionEntity?

    @Query("SELECT * FROM workout_sessions WHERE finishedAt IS NOT NULL ORDER BY finishedAt DESC")
    fun observeHistory(): Flow<List<WorkoutSessionEntity>>

    @Query("SELECT * FROM workout_sets ORDER BY performedAt, id")
    fun observeAllSets(): Flow<List<WorkoutSetEntity>>

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId ORDER BY performedAt, id")
    fun observeSessionSets(sessionId: Long): Flow<List<WorkoutSetEntity>>

    @Query("SELECT COUNT(*) FROM routine_exercises WHERE routineId = :routineId AND exerciseId = :exerciseId")
    suspend fun getRoutineExerciseCount(routineId: Long, exerciseId: Long): Int

    @Query("SELECT COUNT(*) FROM routine_exercises WHERE routineId = :routineId")
    suspend fun getRoutineExerciseCount(routineId: Long): Int

    @Query("SELECT COUNT(*) FROM workout_sets WHERE sessionId = :sessionId")
    suspend fun countSets(sessionId: Long): Int

    @Query("SELECT COALESCE(MAX(setNumber), 0) FROM workout_sets WHERE sessionId = :sessionId AND exerciseId = :exerciseId")
    suspend fun lastSetNumber(sessionId: Long, exerciseId: Long): Int

    @Query("UPDATE workout_sessions SET finishedAt = :finishedAt WHERE id = :sessionId AND finishedAt IS NULL")
    suspend fun finishSession(sessionId: Long, finishedAt: Long): Int

    @Insert
    suspend fun insertExercise(item: ExerciseEntity): Long

    @Insert
    suspend fun insertRoutine(item: RoutineEntity): Long

    @Insert
    suspend fun insertRoutineExercise(item: RoutineExerciseEntity): Long

    @Insert
    suspend fun insertSession(item: WorkoutSessionEntity): Long

    @Insert
    suspend fun insertSet(item: WorkoutSetEntity): Long
}

@Database(
    entities = [
        AppSettingsEntity::class,
        ExerciseEntity::class,
        StudentEntity::class,
        RoutineEntity::class,
        RoutineExerciseEntity::class,
        WorkoutSessionEntity::class,
        WorkoutSetEntity::class
    ],
    version = 6,
    exportSchema = true
)
abstract class TrainerDatabase : RoomDatabase() {
    abstract fun trainerDao(): TrainerDao

    companion object {
        @Volatile private var instance: TrainerDatabase? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS students (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL," +
                        "name TEXT NOT NULL, goal TEXT NOT NULL," +
                        "equipment TEXT NOT NULL, notes TEXT NOT NULL, active INTEGER NOT NULL)"
                )
                db.execSQL("ALTER TABLE routines ADD COLUMN studentId INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN studentId INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN energy INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN sleep INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN fatigue INTEGER")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN setType TEXT NOT NULL DEFAULT 'NORMAL'")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN rpe INTEGER")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE students ADD COLUMN availability TEXT NOT NULL DEFAULT ''")
                db.execSQL("CREATE TABLE IF NOT EXISTS app_settings (id INTEGER NOT NULL PRIMARY KEY, name TEXT NOT NULL, dark INTEGER NOT NULL, initialized INTEGER NOT NULL, experience TEXT NOT NULL, equipment TEXT NOT NULL, goal TEXT NOT NULL, restSeconds INTEGER NOT NULL, weightUnit TEXT NOT NULL, lengthUnit TEXT NOT NULL)")
            }
        }

        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE exercises ADD COLUMN equipment TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE exercises ADD COLUMN instructions TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE exercises ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0")
            }
        }

        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE routines ADD COLUMN divisionLabel TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE routines ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE routines ADD COLUMN isTemplate INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE routines ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
            }
        }

        val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE routine_exercises ADD COLUMN prescriptionJson TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN runtimeJson TEXT NOT NULL DEFAULT ''")
            }
        }

        fun get(context: Context): TrainerDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    TrainerDatabase::class.java,
                    "evolupersonal.db"
                ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6).build().also { instance = it }
            }
    }
}

