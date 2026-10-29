package br.com.evolupersonal.ui

import android.app.Application
import android.net.Uri
import br.com.evolupersonal.data.AppSettingsEntity
import br.com.evolupersonal.data.BackupCrypto
import br.com.evolupersonal.data.TrainerBackup
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.room.withTransaction
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.evolupersonal.core.TrainingSetInput
import br.com.evolupersonal.core.WorkoutMath
import br.com.evolupersonal.data.ExerciseEntity
import br.com.evolupersonal.data.StudentEntity
import br.com.evolupersonal.data.RoutineEntity
import br.com.evolupersonal.data.RoutineExerciseEntity
import br.com.evolupersonal.data.TrainerDatabase
import br.com.evolupersonal.data.WorkoutSessionEntity
import br.com.evolupersonal.data.WorkoutSetEntity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class TrainerViewModel(app: Application) : AndroidViewModel(app) {
    private val database = TrainerDatabase.get(app)
    private val dao = database.trainerDao()
    private val preferences = app.getSharedPreferences("trainer_settings", 0)

    var settings by mutableStateOf(AppSettingsEntity())
        private set
    val profileName get() = settings.name
    val isDarkTheme get() = settings.dark
    var ready by mutableStateOf(false)
        private set
    var busy by mutableStateOf(false)
        private set
    var startupError by mutableStateOf(false)
        private set
    var statusMessage by mutableStateOf<String?>(null)
        private set
    private var pendingBackup: ByteArray? = null

    init { loadSettings() }

    fun loadSettings() = perform {
        startupError = false
        try {
            settings = dao.getSettings() ?: AppSettingsEntity(
                name = preferences.getString("name", "")?.trim().orEmpty().take(60),
                dark = preferences.getBoolean("dark", true),
                initialized = (preferences.getString("name", "")?.trim()?.length ?: 0) >= 2
            ).also { dao.saveSettings(it) }
            ready = true
        } catch (e: Exception) {
            startupError = true
            throw e
        }
    }

    val students = dao.observeStudents().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList()
    )
    val exercises = dao.observeExercises().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList()
    )
    val routines = dao.observeRoutines().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList()
    )
    val routineExercises = dao.observeRoutineExercises().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList()
    )
    val activeSession = dao.observeActiveSession().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), null
    )
    val history = dao.observeHistory().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList()
    )
    val allSets = dao.observeAllSets().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList()
    )
    val activeSets = activeSession.flatMapLatest { session ->
        session?.let { dao.observeSessionSets(it.id) } ?: flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun clearStatus() { statusMessage = null }

    fun saveProfile(name: String, experience: String, equipment: String, goal: String, restSeconds: Int) = perform {
        require(name.trim().length in 2..60) { "Informe um nome de 2 a 60 caracteres." }
        require(goal.trim().length in 1..100 && equipment.length <= 200 && restSeconds in 15..600) { "Confira objetivo, equipamentos e descanso (15–600 s)." }
        require(experience in listOf("Iniciante", "Intermediário", "Avançado"))
        val updated = settings.copy(name = name.trim(), experience = experience, equipment = equipment.trim(), goal = goal.trim(), restSeconds = restSeconds, initialized = true)
        dao.saveSettings(updated)
        settings = updated
        statusMessage = "Perfil salvo com sucesso."
    }

    fun toggleTheme(isDark: Boolean) = perform {
        val updated = settings.copy(dark = isDark)
        dao.saveSettings(updated)
        settings = updated
    }

    fun saveStudent(id: Long?, name: String, goal: String, equipment: String, notes: String, onSaved: () -> Unit) = perform {
        require(name.trim().length in 2..80 && goal.trim().length in 1..100 && equipment.length <= 200 && notes.length <= 500) { "Confira nome, objetivo e os limites dos campos." }
        val current = if (id != null) requireNotNull(dao.getStudent(id)) { "Aluno não encontrado." } else null
        val student = (current ?: StudentEntity(name = "", goal = "", equipment = "", notes = "")).copy(name = name.trim(), goal = goal.trim(), equipment = equipment.trim(), notes = notes.trim())
        if (current == null) dao.insertStudent(student) else require(dao.updateStudent(student) == 1)
        statusMessage = "Aluno salvo com sucesso."
        onSaved()
    }

    fun setStudentActive(id: Long, active: Boolean) = perform {
        val student = requireNotNull(dao.getStudent(id)) { "Aluno não encontrado." }
        require(dao.updateStudent(student.copy(active = active)) == 1)
        statusMessage = if (active) "Aluno reativado." else "Aluno inativado. Histórico preservado."
    }

    fun prepareBackup(password: CharArray, onReady: () -> Unit) = perform {
        try {
            pendingBackup = withContext(Dispatchers.IO) { BackupCrypto.encrypt(TrainerBackup(database).snapshot(), password) }
            onReady()
        } finally { password.fill('\u0000') }
    }

    fun writeBackup(uri: Uri?) = perform {
        val bytes = pendingBackup
        pendingBackup = null
        if (uri == null || bytes == null) return@perform
        withContext(Dispatchers.IO) {
            requireNotNull(getApplication<Application>().contentResolver.openOutputStream(uri, "wt")).use { it.write(bytes); it.flush() }
        }
        statusMessage = "Backup criptografado salvo. Guarde a senha para restaurar."
    }

    fun restoreBackup(uri: Uri, password: CharArray) = perform {
        try {
            val restored = withContext(Dispatchers.IO) {
                val bytes = requireNotNull(getApplication<Application>().contentResolver.openInputStream(uri)).use { input ->
                    val out = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        require(out.size() + count <= BackupCrypto.MAX_BYTES) { "Backup excede 20 MB." }
                        out.write(buffer, 0, count)
                    }
                    out.toByteArray()
                }
                TrainerBackup(database).restore(BackupCrypto.decrypt(bytes, password))
            }
            settings = restored
            statusMessage = "Backup restaurado com sucesso."
        } finally { password.fill('\u0000') }
    }

    fun assignRoutine(routineId: Long, studentId: Long?) = perform {
        require(dao.getRoutine(routineId) != null) { "Treino não encontrado." }
        require(studentId == null || dao.getStudent(studentId)?.active == true) { "Selecione um aluno ativo." }
        val current = dao.getRoutine(routineId)!!
        require(current.studentId == null || current.studentId == studentId || studentId == null) {
            "Este treino pertence a outro aluno. Faça uma cópia antes de atribuir."
        }
        dao.assignRoutine(routineId, studentId)
        statusMessage = if (studentId == null) "Treino desvinculado." else "Treino atribuído ao aluno."
    }

    fun addExercise(name: String, muscleGroup: String) = perform {
        val title = name.trim()
        val group = muscleGroup.trim()
        require(title.length in 2..80 && group.length in 2..50) {
            "Informe um nome e um grupo muscular válidos."
        }
        dao.insertExercise(ExerciseEntity(name = title, muscleGroup = group))
        statusMessage = "Exercício cadastrado."
    }

    fun addRoutine(title: String, dayOfWeek: Int) = perform {
        require(title.trim().length in 2..60) { "Informe o nome do treino." }
        require(dayOfWeek in 0..7) { "Dia da semana inválido." }
        dao.insertRoutine(RoutineEntity(title = title.trim(), dayOfWeek = dayOfWeek))
        statusMessage = "Treino criado. Agora adicione exercícios."
    }

    fun addExerciseToRoutine(routineId: Long, exerciseId: Long) = perform {
        require(dao.getRoutineExerciseCount(routineId, exerciseId) == 0) {
            "Esse exercício já está no treino."
        }
        val count = dao.getRoutineExerciseCount(routineId)
        dao.insertRoutineExercise(
            RoutineExerciseEntity(
                routineId = routineId,
                exerciseId = exerciseId,
                sortOrder = count
            )
        )
        statusMessage = "Exercício incluído no treino."
    }

    fun duplicateRoutine(routineId: Long) = perform {
        val routine = dao.getRoutine(routineId)
            ?: throw IllegalArgumentException("Treino não encontrado.")
        database.withTransaction {
            val newId = dao.insertRoutine(
                routine.copy(id = 0, title = (routine.title + " (cópia)").take(60), studentId = null)
            )
            dao.getRoutineExerciseList(routineId).forEach { item ->
                dao.insertRoutineExercise(item.copy(id = 0, routineId = newId))
            }
        }
        statusMessage = "Cópia do treino criada, sem alterar o original."
    }

    fun changeTargets(itemId: Long, targetSets: Int, targetReps: Int) = perform {
        require(targetSets in 1..15 && targetReps in 1..1000) {
            "Informe 1 a 15 séries e 1 a 1000 repetições."
        }
        require(dao.updateTargets(itemId, targetSets, targetReps) > 0) {
            "Exercício não encontrado na rotina."
        }
        statusMessage = "Prescrição atualizada."
    }

    fun removeFromRoutine(itemId: Long) = perform {
        require(dao.getActiveSession() == null) {
            "Conclua a sessão em andamento antes de alterar a ficha."
        }
        require(dao.removeRoutineExercise(itemId) > 0) { "Item não encontrado." }
        statusMessage = "Exercício retirado da ficha. Histórico preservado."
    }

    fun reorderRoutineExercise(routineId: Long, itemId: Long, direction: Int) = perform {
        require(direction == -1 || direction == 1) { "Direção inválida." }
        require(dao.getActiveSession() == null) { "Conclua o treino aberto antes de reordenar." }
        database.withTransaction {
            val items = dao.getRoutineExerciseList(routineId)
            val index = items.indexOfFirst { it.id == itemId }
            require(index >= 0 && index + direction in items.indices) { "Posição inválida." }
            val other = items[index + direction]
            dao.updateSortOrder(itemId, other.sortOrder)
            dao.updateSortOrder(other.id, items[index].sortOrder)
        }
        statusMessage = "Ordem do treino atualizada."
    }

    fun startRoutine(routineId: Long, energy: Int?, sleep: Int?, fatigue: Int?) = perform {
        require(listOf(energy, sleep, fatigue).all { it == null || it in 1..5 }) {
            "Valores do check-in devem estar entre 1 e 5."
        }
        if (dao.getActiveSession() != null) {
            statusMessage = "Já existe um treino aberto. Retome-o antes de iniciar outro."
            return@perform
        }
        require(dao.getRoutineExerciseCount(routineId) > 0) {
            "Adicione pelo menos um exercício para começar."
        }
        val routine = dao.getRoutine(routineId) ?: throw IllegalArgumentException("Treino não encontrado.")
        require(routine.studentId == null || dao.getStudent(routine.studentId)?.active == true) { "Reative o aluno antes de iniciar um novo treino." }
        dao.insertSession(
            WorkoutSessionEntity(
                routineId = routineId,
                startedAt = System.currentTimeMillis(),
                studentId = routine.studentId,
                energy = energy,
                sleep = sleep,
                fatigue = fatigue
            )
        )
        statusMessage = "Treino iniciado."
    }

    fun recordSet(
        exerciseId: Long,
        repetitions: String,
        weightKg: String,
        rir: String,
        setType: String,
        rpe: String,
        notes: String
    ) = perform {
        val repetitionsValue = repetitions.trim().toIntOrNull()
        val weightValue = weightKg.trim().replace(',', '.').toDoubleOrNull()
        val rirValue = rir.trim().takeIf { it.isNotEmpty() }?.toIntOrNull()
        require(repetitionsValue != null && weightValue != null) {
            "Informe repetições e carga válidas."
        }
        require(rir.isBlank() || rirValue != null) { "RIR deve ser um número de 0 a 10." }
        val rpeValue = rpe.trim().takeIf { it.isNotEmpty() }?.toIntOrNull()
        require(rpe.isBlank() || (rpeValue != null && rpeValue in 1..10)) { "RPE deve ser um número de 1 a 10." }
        require(setType in setOf("AQUECIMENTO", "NORMAL", "BACKOFF", "DROP", "FALHA")) {
            "Tipo de série inválido."
        }
        require(notes.length <= 180) { "Observação deve ter até 180 caracteres." }
        val input = TrainingSetInput(repetitionsValue, weightValue, rirValue)
        require(WorkoutMath.isValid(input)) {
            "Valores permitidos: 1–1000 repetições, 0–1000 kg e RIR 0–10."
        }

        val session = dao.getActiveSession()
            ?: throw IllegalArgumentException("Não há treino aberto.")
        require(dao.getRoutineExerciseCount(session.routineId, exerciseId) > 0) {
            "Exercício não pertence ao treino ativo."
        }
        val number = dao.lastSetNumber(session.id, exerciseId) + 1
        dao.insertSet(
            WorkoutSetEntity(
                sessionId = session.id,
                exerciseId = exerciseId,
                setNumber = number,
                repetitions = input.repetitions,
                loadKg = input.loadKg,
                rir = input.rir,
                performedAt = System.currentTimeMillis(),
                setType = setType,
                rpe = rpeValue,
                notes = notes.trim()
            )
        )
        statusMessage = "Série $number registrada."
    }

    fun finishSession() = perform {
        val session = dao.getActiveSession()
            ?: throw IllegalArgumentException("Não há treino aberto.")
        require(dao.countSets(session.id) > 0) {
            "Registre pelo menos uma série antes de concluir."
        }
        dao.finishSession(session.id, System.currentTimeMillis())
        statusMessage = "Treino concluído e salvo no histórico."
    }

    private fun perform(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        viewModelScope.launch {
            try {
                block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: javax.crypto.AEADBadTagException) {
                statusMessage = "Senha incorreta ou backup corrompido. Seus dados foram preservados."
            } catch (e: IllegalArgumentException) {
                statusMessage = e.message ?: "Dados inválidos."
            } catch (e: Exception) {
                statusMessage = "Não foi possível concluir. Confira os dados e tente novamente."
            } finally {
                busy = false
            }
        }
    }
}
