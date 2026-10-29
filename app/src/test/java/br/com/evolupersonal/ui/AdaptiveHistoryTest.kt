package br.com.evolupersonal.ui

import android.app.Application
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.data.*
import br.com.evolupersonal.core.Prescription
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AdaptiveHistoryTest {
    @get:Rule val compose = createComposeRule()
    private fun click(text: String) { compose.onNodeWithText(text).performScrollTo().assertIsDisplayed().performSemanticsAction(SemanticsActions.OnClick) { it() } }
    private fun flow() {
        val app = ApplicationProvider.getApplicationContext<Application>(); val db = TrainerDatabase.get(app)
        var exercise = 0L
        runBlocking(Dispatchers.IO) {
            db.clearAllTables(); val dao = db.trainerDao(); dao.saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
            exercise = dao.insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas"))
            val routine = dao.insertRoutine(RoutineEntity(title = "Ficha atual"))
            for (i in 1..3) {
                val snapshot = SessionSnapshot("Treino $i", "", listOf(SnapshotExercise(exercise, "Remada", "Costas", Prescription(sets = 1, repsMin = 8, repsMax = 10, loadKg = 20.0, rir = 2, rpe = 8, cadence = "3-1-1-0", durationSeconds = 40, notes = "Controle técnico"))))
                val session = dao.insertSession(WorkoutSessionEntity(routineId = routine, startedAt = i * 1000L, finishedAt = i * 1000L + 500, snapshotJson = Gson().toJson(snapshot)))
                dao.insertSet(WorkoutSetEntity(sessionId = session, exerciseId = exercise, setNumber = 1, repetitions = 10, loadKg = 20.0, rir = 3, performedAt = i * 1000L + 100))
            }
        }
        val vm = TrainerViewModel(app); compose.setContent { TrainerApp(vm) }
        compose.waitUntil(15000) { org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle(); vm.ready && !vm.busy }
        compose.onNodeWithText("Evolução").performSemanticsAction(SemanticsActions.OnClick) { it() }
        click("Exercício: todos")
        compose.onNodeWithText("Remada (#$exercise)").performSemanticsAction(SemanticsActions.OnClick) { it() }
        compose.onNodeWithText("Considerar aumento").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Carga máxima por sessão").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("1RM estimada por sessão").performScrollTo().assertIsDisplayed()
        click("Treino 3")
        compose.onNodeWithText("Planejado: Remada").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Notas técnicas: Controle técnico").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Descanso: 90s · Cadência: 3-1-1-0 · Duração-alvo: 40s").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("RIR 3 · RPE —").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Adicionar observação ao histórico").performScrollTo().performTextInput("Técnica revisada")
        click("Salvar observação")
        compose.waitUntil(15000) { org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle(); !vm.busy && vm.history.value.any { it.observations.contains("Técnica revisada") } }
        compose.onNodeWithText("Treino 3").performScrollTo().assertIsDisplayed()
    }
    @Test @Config(qualifiers = "w360dp-h800dp-port") fun smartphonePortrait() = flow()
    @Test @Config(qualifiers = "w800dp-h360dp-land") fun smartphoneLandscape() = flow()
    @Test @Config(qualifiers = "w800dp-h1280dp-port") fun tabletPortrait() = flow()
    @Test @Config(qualifiers = "w1280dp-h800dp-land") fun tabletLandscape() = flow()
}
