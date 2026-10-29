package br.com.evolupersonal.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
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
    val animationPath: String? = null,
    val mediaReviewStatus: String = "SEM_MIDIA"
)

@Entity(tableName = "routines")
data class RoutineEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val dayOfWeek: Int = 0
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
    val targetReps: Int = 10
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
    val finishedAt: Long? = null
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
    val performedAt: Long
)

@Dao
interface TrainerDao {
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

    @Query("SELECT * FROM workout_sessions WHERE finishedAt IS NOT NULL ORDER BY finishedAt DESC LIMIT 30")
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

    @Query("SELECT COUNT(*) FROM exercises WHERE origin = 'LIBRARY'")
    suspend fun countLibraryExercises(): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertLibraryExercises(items: List<ExerciseEntity>): List<Long>

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
        ExerciseEntity::class,
        RoutineEntity::class,
        RoutineExerciseEntity::class,
        WorkoutSessionEntity::class,
        WorkoutSetEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class TrainerDatabase : RoomDatabase() {
    abstract fun trainerDao(): TrainerDao

    companion object {
        @Volatile private var instance: TrainerDatabase? = null

        fun get(context: Context): TrainerDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    TrainerDatabase::class.java,
                    "evolupersonal.db"
                ).build().also { instance = it }
            }
    }
}
