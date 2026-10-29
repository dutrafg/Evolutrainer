package br.com.evolupersonal.ui

import android.app.Application
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import br.com.evolupersonal.data.TrainerDatabase
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AdaptiveProfileTest {
    @get:Rule val compose = createComposeRule()

    private fun saveProfile() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        kotlinx.coroutines.runBlocking(kotlinx.coroutines.Dispatchers.IO) { TrainerDatabase.get(app).clearAllTables() }
        val vm = TrainerViewModel(app)
        compose.setContent { TrainerApp(vm) }
        compose.waitUntil(15_000) { vm.ready }
        compose.onNodeWithText("Nome do profissional").performTextInput("Personal Teste")
        compose.onNodeWithText("Nome do profissional").assertTextContains("Personal Teste")
        compose.onNodeWithText("Salvar e começar").performScrollTo().assertIsDisplayed().assertIsEnabled().performSemanticsAction(androidx.compose.ui.semantics.SemanticsActions.OnClick) { it() }
        try {
            compose.waitUntil(15_000) {
                org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
                vm.settings.initialized && !vm.busy
            }
        } catch (e: Throwable) {
            println("Profile state: ready=${vm.ready}, busy=${vm.busy}, initialized=${vm.settings.initialized}, status=${vm.statusMessage}")
            println(compose.onRoot().printToString())
            throw e
        }
        compose.onNodeWithText("Alunos (0) · gerenciar").performScrollTo().assertIsDisplayed().assertIsEnabled().performSemanticsAction(androidx.compose.ui.semantics.SemanticsActions.OnClick) { it() }
        compose.onNodeWithTag("students-grid").performScrollToNode(hasText("Pesquisar aluno por nome"))
        compose.onNodeWithText("Pesquisar aluno por nome").assertIsDisplayed()
        compose.onNodeWithTag("students-grid").performScrollToNode(hasText("Cadastrar aluno"))
        compose.onNodeWithText("Cadastrar aluno").assertIsDisplayed().performSemanticsAction(androidx.compose.ui.semantics.SemanticsActions.OnClick) { it() }
        compose.onNodeWithText("Nome").performTextInput("Aluna Tablet")
        compose.onNodeWithText("Objetivo").performTextInput("Força")
        compose.onNodeWithText("Salvar").performScrollTo().assertIsDisplayed().assertIsEnabled().performSemanticsAction(androidx.compose.ui.semantics.SemanticsActions.OnClick) { it() }
        compose.waitUntil(15_000) {
            org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
            !vm.busy && vm.students.value.any { it.name == "Aluna Tablet" }
        }
        compose.onNodeWithTag("students-grid").performScrollToNode(hasText("Aluna Tablet"))
        compose.onNodeWithText("Aluna Tablet").assertIsDisplayed()
        compose.onNodeWithTag("students-grid").performScrollToNode(hasText("Pesquisar aluno por nome"))
        compose.onNodeWithText("Pesquisar aluno por nome").performTextInput("não existe")
        compose.onNodeWithText("Nenhum aluno encontrado").assertExists()
    }

    @Test @Config(qualifiers = "w360dp-h800dp-port") fun smartphonePortrait() = saveProfile()
    @Test @Config(qualifiers = "w800dp-h360dp-land") fun smartphoneLandscape() = saveProfile()
    @Test @Config(qualifiers = "w800dp-h1280dp-port") fun tabletPortrait() = saveProfile()
    @Test @Config(qualifiers = "w1280dp-h800dp-land") fun tabletLandscape() = saveProfile()
}
