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
        compose.onNodeWithText("Salvar e começar").performScrollTo().assertIsDisplayed().performClick()
        compose.waitUntil(15_000) { vm.settings.initialized && !vm.busy }
        compose.onNodeWithText("Alunos (0) · gerenciar").performScrollTo().assertIsDisplayed().performClick()
        compose.onNodeWithText("Pesquisar aluno por nome").assertIsDisplayed()
        compose.onNodeWithText("Cadastrar aluno").performClick()
        compose.onNodeWithText("Nome").performTextInput("Aluna Tablet")
        compose.onNodeWithText("Objetivo").performTextInput("Força")
        compose.onNodeWithText("Salvar").assertIsDisplayed().performClick()
        compose.waitUntil(15_000) { !vm.busy && vm.students.value.any { it.name == "Aluna Tablet" } }
        compose.onNodeWithText("Aluna Tablet").assertIsDisplayed()
        compose.onNodeWithText("Pesquisar aluno por nome").performTextInput("não existe")
        compose.onNodeWithText("Nenhum aluno encontrado").assertExists()
    }

    @Test @Config(qualifiers = "w360dp-h800dp-port") fun smartphonePortrait() = saveProfile()
    @Test @Config(qualifiers = "w800dp-h360dp-land") fun smartphoneLandscape() = saveProfile()
    @Test @Config(qualifiers = "w800dp-h1280dp-port") fun tabletPortrait() = saveProfile()
    @Test @Config(qualifiers = "w1280dp-h800dp-land") fun tabletLandscape() = saveProfile()
}
