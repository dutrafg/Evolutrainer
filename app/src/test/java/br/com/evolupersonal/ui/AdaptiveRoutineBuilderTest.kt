package br.com.evolupersonal.ui

import android.app.Application
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AdaptiveRoutineBuilderTest {
    @get:Rule val compose = createComposeRule()
    private fun click(text: String) = compose.onNodeWithText(text).assertIsDisplayed().assertIsEnabled().performSemanticsAction(SemanticsActions.OnClick) { it() }
    private fun waitFor(predicate: () -> Boolean) = compose.waitUntil(15_000) {
        org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
        predicate()
    }
    private fun scroll(tag: String, text: String) = compose.onNodeWithTag(tag).performScrollToNode(hasText(text))
    private fun detail(text: String) { scroll("routine-detail", text); click(text) }

    private fun builderFlow() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val db = TrainerDatabase.get(app)
        runBlocking(Dispatchers.IO) {
            db.clearAllTables()
            db.trainerDao().saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
            db.trainerDao().insertExercise(ExerciseEntity(name = "Agachamento", muscleGroup = "Pernas", equipment = "Halteres"))
            db.trainerDao().insertExercise(ExerciseEntity(name = "Remada", muscleGroup = "Costas", equipment = "Cabo", favorite = true))
        }
        val vm = TrainerViewModel(app)
        val restoration = StateRestorationTester(compose)
        restoration.setContent { TrainerApp(vm) }
        waitFor { vm.ready && !vm.busy }
        click("Treinos")
        scroll("routines-grid", "Novo treino"); click("Novo treino")
        compose.onNodeWithText("Nome da ficha").performScrollTo().performTextInput("Treino teste")
        restoration.emulateSavedInstanceStateRestore()
        compose.onNodeWithText("Nome da ficha").performScrollTo().assertTextContains("Treino teste")
        compose.onNodeWithText("Divisão (A, B, superior…)").performScrollTo().performTextInput("A")
        compose.onNodeWithText("Salvar ficha").performScrollTo(); click("Salvar ficha")
        waitFor { !vm.busy && vm.routines.value.size == 1 }
        val source = vm.routines.value.single().id
        detail("Editar ficha")
        compose.onNodeWithText("Nome da ficha").performScrollTo().performTextReplacement("Treino editado")
        compose.onNodeWithText("Salvar ficha").performScrollTo(); click("Salvar ficha")
        waitFor { !vm.busy && vm.routines.value.single().title == "Treino editado" }
        for (name in listOf("Agachamento", "Remada")) {
            detail("Adicionar exercício")
            scroll("routine-picker", "Buscar exercício")
            compose.onNodeWithText("Buscar exercício").performTextInput(name)
            scroll("routine-picker", "Adicionar $name"); click("Adicionar $name")
            waitFor { !vm.busy && vm.routineExercises.value.size == if (name == "Agachamento") 1 else 2 }
        }
        scroll("routine-detail", "2. Remada")
        compose.onNodeWithContentDescription("Mover Remada para cima").performScrollTo().assertIsDisplayed().performSemanticsAction(SemanticsActions.OnClick) { it() }
        waitFor { !vm.busy && vm.routineExercises.value.filter { it.routineId == source }.minBy { it.sortOrder }.exerciseId == vm.exercises.value.first { it.name == "Remada" }.id }
        scroll("routine-detail", "1. Remada")
        compose.onNodeWithText("1. Remada").assertIsDisplayed()
        detail("Salvar como modelo")
        waitFor { !vm.busy && vm.routines.value.any { it.isTemplate } }
        val template = vm.routines.value.single { it.isTemplate }.id
        detail("Criar treino deste modelo")
        waitFor { !vm.busy && vm.routines.value.size == 3 }
        runBlocking(Dispatchers.IO) {
            val dao = db.trainerDao()
            val sourceItems = dao.getRoutineExerciseList(source)
            val templateItems = dao.getRoutineExerciseList(template)
            assertEquals(sourceItems.map { it.exerciseId }, templateItems.map { it.exerciseId })
            assertTrue(templateItems.none { t -> sourceItems.any { it.id == t.id } })
            assertNull(dao.getRoutine(template)!!.studentId)
        }
    }
    @Test @Config(qualifiers = "w360dp-h800dp-port") fun smartphonePortrait() = builderFlow()
    @Test @Config(qualifiers = "w800dp-h360dp-land") fun smartphoneLandscape() = builderFlow()
    @Test @Config(qualifiers = "w800dp-h1280dp-port") fun tabletPortrait() = builderFlow()
    @Test @Config(qualifiers = "w1280dp-h800dp-land") fun tabletLandscape() = builderFlow()
}
