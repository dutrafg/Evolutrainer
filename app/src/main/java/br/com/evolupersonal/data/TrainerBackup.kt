package br.com.evolupersonal.data

import androidx.room.withTransaction
import com.google.gson.Gson
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

object BackupCrypto {
    private val magic = byteArrayOf(69, 86, 80, 66, 1)
    const val MAX_BYTES = 20 * 1024 * 1024
    private fun key(password: CharArray, salt: ByteArray): SecretKeySpec {
        val spec = PBEKeySpec(password, salt, 210_000, 256)
        return try { SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded, "AES") }
        finally { spec.clearPassword() }
    }
    fun encrypt(plain: ByteArray, password: CharArray): ByteArray {
        require(password.size >= 8) { "Use uma senha com pelo menos 8 caracteres." }
        require(plain.size <= MAX_BYTES - 49) { "Backup excede o limite de 20 MB." }
        val random = SecureRandom()
        val salt = ByteArray(16).also(random::nextBytes)
        val iv = ByteArray(12).also(random::nextBytes)
        val header = magic + salt + iv
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key(password, salt), GCMParameterSpec(128, iv))
        cipher.updateAAD(header)
        return header + cipher.doFinal(plain)
    }
    fun decrypt(bytes: ByteArray, password: CharArray): ByteArray {
        require(bytes.size in 49..MAX_BYTES && bytes.copyOfRange(0, 5).contentEquals(magic)) { "Backup inválido ou incompatível." }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(password, bytes.copyOfRange(5, 21)), GCMParameterSpec(128, bytes.copyOfRange(21, 33)))
        cipher.updateAAD(bytes.copyOfRange(0, 33))
        return cipher.doFinal(bytes.copyOfRange(33, bytes.size))
    }
}

data class BackupData(
    val format: String, val version: Int, val databaseVersion: Int,
    val settings: AppSettingsEntity,
    val students: List<StudentEntity>, val exercises: List<ExerciseEntity>,
    val routines: List<RoutineEntity>, val items: List<RoutineExerciseEntity>,
    val sessions: List<WorkoutSessionEntity>, val sets: List<WorkoutSetEntity>
)

class TrainerBackup(private val db: TrainerDatabase) {
    private val dao = db.trainerDao()
    private val gson = com.google.gson.GsonBuilder().serializeNulls().create()
    suspend fun snapshot(): ByteArray = db.withTransaction {
        val data = BackupData("EvoluPersonal", 1, 5, requireNotNull(dao.getSettings()),
            dao.exportStudents(), dao.exportExercises(), dao.exportRoutines(), dao.exportItems(), dao.exportSessions(), dao.exportSets())
        validate(data)
        gson.toJson(data).toByteArray(Charsets.UTF_8)
    }
    fun validate(data: BackupData) {
        require(data.format == "EvoluPersonal" && data.version == 1 && data.databaseVersion == 5) { "Versão de backup incompatível." }
        val s = data.settings
        require(s.weightUnit in listOf("kg", "lb") && s.lengthUnit in listOf("cm", "in"))
        require(s.id == 1 && s.name.trim().length in 2..60 && s.initialized && s.restSeconds in 15..600)
        require(s.experience in listOf("Iniciante", "Intermediário", "Avançado") && s.goal.length in 1..100 && s.equipment.length <= 200)
        fun ids(values: List<Long>): Set<Long> {
            require(values.size <= 100_000 && values.all { it > 0 } && values.distinct().size == values.size) { "IDs inválidos ou duplicados." }
            return values.toSet()
        }
        val students = ids(data.students.map { it.id }); val exercises = ids(data.exercises.map { it.id })
        val routines = ids(data.routines.map { it.id }); val sessions = ids(data.sessions.map { it.id })
        ids(data.items.map { it.id }); ids(data.sets.map { it.id })
        require(data.students.all { it.name.trim().length in 2..80 && it.goal.length in 1..100 && it.equipment.length <= 200 && it.notes.length <= 500 && it.availability.length <= 200 })
        require(data.exercises.all { it.name.length in 2..80 && it.muscleGroup.length in 2..50 && it.origin in listOf("MANUAL", "LIBRARY") && it.equipment.length <= 100 && it.instructions.length <= 2000 })
        require(data.routines.all { it.title.length in 2..60 && it.dayOfWeek in 0..7 && it.divisionLabel.length <= 30 && it.notes.length <= 1000 && (!it.isTemplate || it.studentId == null) && (it.studentId == null || it.studentId in students) })
        require(data.items.all { it.routineId in routines && it.exerciseId in exercises && it.targetSets in 1..15 && it.targetReps in 1..1000 && it.sortOrder >= 0 })
        require(data.items.map { it.routineId to it.exerciseId }.distinct().size == data.items.size)
        require(data.sessions.count { it.finishedAt == null } <= 1)
        require(data.sessions.filter { it.finishedAt == null }.all { session -> data.routines.any { it.id == session.routineId && !it.isTemplate && !it.archived } })
        require(data.sessions.all { it.routineId in routines && (it.studentId == null || it.studentId in students) && it.startedAt > 0 && (it.finishedAt == null || it.finishedAt >= it.startedAt) && listOf(it.energy, it.sleep, it.fatigue).all { n -> n == null || n in 1..5 } })
        require(data.sets.all { it.sessionId in sessions && it.exerciseId in exercises && it.setNumber > 0 && it.repetitions in 1..1000 && it.loadKg.isFinite() && it.loadKg in 0.0..1000.0 && (it.rir == null || it.rir in 0..10) && (it.rpe == null || it.rpe in 1..10) && it.setType in listOf("AQUECIMENTO", "NORMAL", "BACKOFF", "DROP", "FALHA") && it.notes.length <= 180 && it.performedAt > 0 })
        require(data.sets.map { Triple(it.sessionId, it.exerciseId, it.setNumber) }.distinct().size == data.sets.size)
        val externalIds = data.exercises.mapNotNull { it.externalId }; require(externalIds.distinct().size == externalIds.size)
    }
    /** All parsing and validation precedes mutation; database exceptions roll back every table. */
    suspend fun restore(plain: ByteArray): AppSettingsEntity {
        require(plain.size <= BackupCrypto.MAX_BYTES)
        val json = com.google.gson.JsonParser.parseString(String(plain, Charsets.UTF_8)).asJsonObject
        val required = setOf("format", "version", "databaseVersion", "settings", "students", "exercises", "routines", "items", "sessions", "sets")
        require(json.keySet() == required) { "Estrutura de backup inválida." }
        require(json["format"].isJsonPrimitive && json["format"].asJsonPrimitive.isString && json["format"].asString == "EvoluPersonal")
        fun version(name: String): Int {
            val value = json[name].asJsonPrimitive
            require(value.isNumber)
            return value.asBigDecimal.intValueExact()
        }
        require(version("version") == 1 && version("databaseVersion") in 3..5) { "Versão de backup incompatível." }
        val sourceVersion = version("databaseVersion")
        // Upgrade only the known v3 schema; never silently repair malformed v4 files.
        if (sourceVersion == 3) {
            json.getAsJsonArray("exercises").forEach {
                val exercise = it.asJsonObject
                require(exercise.keySet() == setOf("id", "name", "muscleGroup", "origin", "externalId"))
                exercise.addProperty("equipment", "")
                exercise.addProperty("instructions", "")
                exercise.addProperty("favorite", false)
            }
        }
        if (sourceVersion <= 4) {
            json.getAsJsonArray("routines").forEach {
                val routine = it.asJsonObject
                require(routine.keySet() == setOf("id", "title", "dayOfWeek", "studentId"))
                routine.addProperty("divisionLabel", "")
                routine.addProperty("notes", "")
                routine.addProperty("isTemplate", false)
                routine.addProperty("archived", false)
            }
        }
        json.addProperty("databaseVersion", 5)
        fun fields(obj: com.google.gson.JsonObject, names: Set<String>) {
            require(obj.keySet() == names) { "Campos ausentes ou incompatíveis." }
            val nullable = setOf("externalId", "studentId", "finishedAt", "energy", "sleep", "fatigue", "rir", "rpe")
            val integers = setOf("id", "restSeconds", "dayOfWeek", "routineId", "exerciseId", "sortOrder", "targetSets", "targetReps", "startedAt", "finishedAt", "studentId", "energy", "sleep", "fatigue", "sessionId", "setNumber", "repetitions", "rir", "performedAt", "rpe")
            names.forEach { name ->
                val value = obj.get(name)
                if (value.isJsonNull) require(name in nullable) { "Campo obrigatório vazio." }
                else {
                    require(value.isJsonPrimitive)
                    val primitive = value.asJsonPrimitive
                    when {
                        name in setOf("dark", "initialized", "active", "favorite", "isTemplate", "archived") -> require(primitive.isBoolean)
                        name in integers -> { require(primitive.isNumber); primitive.asBigDecimal.toBigIntegerExact().longValueExact() }
                        name == "loadKg" -> require(primitive.isNumber && primitive.asDouble.isFinite())
                        else -> require(primitive.isString)
                    }
                }
            }
        }
        fields(json.getAsJsonObject("settings"), setOf("id", "name", "dark", "initialized", "experience", "equipment", "goal", "restSeconds", "weightUnit", "lengthUnit"))
        val tables = mapOf(
            "students" to setOf("id", "name", "goal", "equipment", "notes", "active", "availability"),
            "exercises" to setOf("id", "name", "muscleGroup", "origin", "externalId", "equipment", "instructions", "favorite"),
            "routines" to setOf("id", "title", "dayOfWeek", "studentId", "divisionLabel", "notes", "isTemplate", "archived"),
            "items" to setOf("id", "routineId", "exerciseId", "sortOrder", "targetSets", "targetReps"),
            "sessions" to setOf("id", "routineId", "startedAt", "finishedAt", "studentId", "energy", "sleep", "fatigue"),
            "sets" to setOf("id", "sessionId", "exerciseId", "setNumber", "repetitions", "loadKg", "rir", "performedAt", "setType", "rpe", "notes")
        )
        tables.forEach { (table, names) -> json.getAsJsonArray(table).forEach { fields(it.asJsonObject, names) } }
        val data = gson.fromJson(json, BackupData::class.java)
        validate(data)
        db.withTransaction {
            dao.clearSets(); dao.clearSessions(); dao.clearItems(); dao.clearRoutines(); dao.clearStudents(); dao.clearExercises()
            data.students.forEach { dao.insertStudent(it) }; data.exercises.forEach { dao.insertExercise(it) }
            data.routines.forEach { dao.insertRoutine(it) }; data.items.forEach { dao.insertRoutineExercise(it) }
            data.sessions.forEach { dao.insertSession(it) }; data.sets.forEach { dao.insertSet(it) }
            dao.saveSettings(data.settings)
        }
        return data.settings
    }
}
