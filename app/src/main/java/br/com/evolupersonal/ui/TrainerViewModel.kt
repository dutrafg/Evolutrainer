package br.com.evolupersonal.ui

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.evolupersonal.core.TrainingSetInput
import br.com.evolupersonal.core.WorkoutMath
import br.com.evolupersonal.data.ExerciseEntity
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
    private val dao = TrainerDatabase.get(app).trainerDao()
    private val preferences = app.getSharedPreferences("trainer_settings", 0)

    var profileName by mutableStateOf(preferences.getString("name", "") ?: "")
        private set
    var isDarkTheme by mutableStateOf(preferences.getBoolean("dark", true))
        private set
    var statusMessage by mutableStateOf<String?>(null)
        private set

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

    fun updateName(name: String) {
        profileName = name.take(60)
        preferences.edit().putString("name", profileName).apply()
    }

    fun toggleTheme(isDark: Boolean) {
        isDarkTheme = isDark
        preferences.edit().putBoolean("dark", isDark).apply()
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

    fun startRoutine(routineId: Long) = perform {
        if (dao.getActiveSession() != null) {
            statusMessage = "Já existe um treino aberto. Retome-o antes de iniciar outro."
            return@perform
        }
        require(dao.getRoutineExerciseCount(routineId) > 0) {
            "Adicione pelo menos um exercício para começar."
        }
        dao.insertSession(
            WorkoutSessionEntity(
                routineId = routineId,
                startedAt = System.currentTimeMillis()
            )
        )
        statusMessage = "Treino iniciado."
    }

    fun recordSet(
        exerciseId: Long,
        repetitions: String,
        weightKg: String,
        rir: String
    ) = perform {
        val repetitionsValue = repetitions.trim().toIntOrNull()
        val weightValue = weightKg.trim().replace(',', '.').toDoubleOrNull()
        val rirValue = rir.trim().takeIf { it.isNotEmpty() }?.toIntOrNull()
        require(repetitionsValue != null && weightValue != null) {
            "Informe repetições e carga válidas."
        }
        require(rir.isBlank() || rirValue != null) { "RIR deve ser um número de 0 a 10." }
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
                performedAt = System.currentTimeMillis()
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
        viewModelScope.launch {
            try {
                block()
            } catch (e: IllegalArgumentException) {
                statusMessage = e.message ?: "Dados inválidos."
            } catch (e: Exception) {
                statusMessage = "Não foi possível salvar. Tente novamente."
            }
        }
    }
}
