package br.com.evolupersonal.ui

import android.app.Application
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AdaptiveSessionTest {
    @get:Rule val compose = createComposeRule()
    private fun click(text: String) { compose.onNodeWithText(text).performScrollTo().assertIsDisplayed().assertIsEnabled().performSemanticsAction(SemanticsActions.OnClick) { it() } }
    private fun waitFor(predicate: () -> Boolean) = compose.waitUntil(15000) { org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle(); predicate() }
    private fun flow() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val db = TrainerDatabase.get(app)
        runBlocking(Dispatchers.IO) {
            db.clearAllTables(); val dao = db.trainerDao()
            dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
            val e = dao.insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas"))
            dao.insertExercise(ExerciseEntity(name = "Puxada", muscleGroup = "Costas"))
            val r = dao.insertRoutine(RoutineEntity(title = "Sessão teste"))
            dao.insertRoutineExercise(RoutineExerciseEntity(routineId = r, exerciseId = e))
            dao.insertSession(WorkoutSessionEntity(routineId = r, startedAt = System.currentTimeMillis()))
        }
        val vm = TrainerViewModel(app); compose.setContent { TrainerApp(vm) }
        waitFor { vm.ready && !vm.busy }
        compose.onNodeWithText("Treinos").performSemanticsAction(SemanticsActions.OnClick) { it() }
        click("Pausar treino")
        waitFor { !vm.busy && vm.activeSession.value?.runtime()?.pausedAt != 0L }
        compose.onNodeWithText("Treino pausado").assertIsDisplayed()
        click("Retomar treino")
        waitFor { !vm.busy && vm.activeSession.value?.runtime()?.pausedAt == 0L }
        click("Descanso 90s")
        waitFor { !vm.busy && (vm.activeSession.value?.runtime()?.timerStart ?: 0) > 0 }
        click("Substituir Remada")
        compose.onNodeWithText("Puxada").performSemanticsAction(SemanticsActions.OnClick) { it() }
        waitFor { !vm.busy && vm.activeSession.value!!.runtime().substitutions.isNotEmpty() }
        click("Registrar série 1")
        waitFor { !vm.busy && vm.activeSets.value.size == 1 }
        click("Concluir treino")
        compose.onNodeWithText("Confirmar conclusão").performSemanticsAction(SemanticsActions.OnClick) { it() }
        waitFor { !vm.busy && vm.activeSession.value == null && vm.history.value.size == 1 }
    }
    @Test @Config(qualifiers = "w360dp-h800dp-port") fun smartphonePortrait() = flow()
    @Test @Config(qualifiers = "w800dp-h360dp-land") fun smartphoneLandscape() = flow()
    @Test @Config(qualifiers = "w800dp-h1280dp-port") fun tabletPortrait() = flow()
    @Test @Config(qualifiers = "w1280dp-h800dp-land") fun tabletLandscape() = flow()
}
