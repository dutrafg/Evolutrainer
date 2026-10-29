package br.com.evolupersonal.ui

import android.app.Application
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.data.AppSettingsEntity
import br.com.evolupersonal.data.TrainerDatabase
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
class AdaptiveLibraryTest {
    @get:Rule val compose = createComposeRule()
    private fun click(text: String) = compose.onNodeWithText(text).assertIsDisplayed().assertIsEnabled().performSemanticsAction(SemanticsActions.OnClick) { it() }
    private fun waitFor(predicate: () -> Boolean) = compose.waitUntil(15_000) {
        org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
        predicate()
    }
    private fun scroll(text: String) = compose.onNodeWithTag("exercise-grid").performScrollToNode(hasText(text))

    private fun libraryFlow() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val db = TrainerDatabase.get(app)
        runBlocking(Dispatchers.IO) {
            db.clearAllTables()
            db.trainerDao().saveSettings(AppSettingsEntity(name = "Personal", initialized = true))
        }
        val vm = TrainerViewModel(app)
        compose.setContent { TrainerApp(vm) }
        waitFor { vm.ready && !vm.busy }
        click("Biblioteca")
        scroll("Cadastrar exercício"); click("Cadastrar exercício")
        compose.onNodeWithText("Nome do exercício").performScrollTo().performTextInput("Elevação lateral")
        compose.onNodeWithText("Grupo muscular").performScrollTo().performTextInput("Ombros")
        compose.onNodeWithText("Equipamento").performScrollTo().performTextInput("Halteres")
        compose.onNodeWithText("Instruções de execução").performScrollTo().performTextInput("Controle o movimento")
        compose.onNodeWithText("Salvar exercício").performScrollTo(); click("Salvar exercício")
        waitFor { !vm.busy && vm.exercises.value.size == 1 }
        scroll("Elevação lateral")
        compose.onNodeWithText("Elevação lateral").assertIsDisplayed()
        compose.onNodeWithContentDescription("Favoritar Elevação lateral").assertIsDisplayed().performSemanticsAction(SemanticsActions.OnClick) { it() }
        waitFor { !vm.busy && vm.exercises.value.single().favorite }
        scroll("Editar exercício"); click("Editar exercício")
        compose.onNodeWithText("Nome do exercício").performScrollTo().performTextReplacement("Elevação lateral sentada")
        compose.onNodeWithText("Salvar exercício").performScrollTo(); click("Salvar exercício")
        waitFor { !vm.busy && vm.exercises.value.single().name == "Elevação lateral sentada" }
        scroll("Buscar nome, músculo ou equipamento")
        compose.onNodeWithText("Buscar nome, músculo ou equipamento").performTextInput("elevacao halteres")
        scroll("Elevação lateral sentada")
        compose.onNodeWithText("Elevação lateral sentada").assertIsDisplayed()
        scroll("Favoritos"); click("Favoritos")
        scroll("Elevação lateral sentada")
        compose.onNodeWithText("Elevação lateral sentada").assertIsDisplayed()
        scroll("Buscar nome, músculo ou equipamento")
        compose.onNodeWithText("Buscar nome, músculo ou equipamento").performTextReplacement("inexistente")
        scroll("Nenhum exercício encontrado")
        compose.onNodeWithText("Nenhum exercício encontrado").assertIsDisplayed()
        runBlocking(Dispatchers.IO) {
            val exercise = db.trainerDao().exportExercises().single()
            assertEquals("Controle o movimento", exercise.instructions)
            assertEquals("Halteres", exercise.equipment)
            assertTrue(exercise.favorite)
        }
    }

    @Test @Config(qualifiers = "w360dp-h800dp-port") fun smartphonePortrait() = libraryFlow()
    @Test @Config(qualifiers = "w800dp-h360dp-land") fun smartphoneLandscape() = libraryFlow()
    @Test @Config(qualifiers = "w800dp-h1280dp-port") fun tabletPortrait() = libraryFlow()
    @Test @Config(qualifiers = "w1280dp-h800dp-land") fun tabletLandscape() = libraryFlow()
}
