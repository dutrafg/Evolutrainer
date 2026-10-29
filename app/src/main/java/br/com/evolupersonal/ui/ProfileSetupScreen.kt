package br.com.evolupersonal.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import br.com.evolupersonal.BuildConfig

@Composable
fun ProfileSetupScreen(vm: TrainerViewModel) {
    val s = vm.settings
    var name by rememberSaveable(s.name) { mutableStateOf(s.name) }
    var goal by rememberSaveable(s.goal) { mutableStateOf(s.goal) }
    var equipment by rememberSaveable(s.equipment) { mutableStateOf(s.equipment) }
    var experience by rememberSaveable(s.experience) { mutableStateOf(s.experience) }
    var rest by rememberSaveable(s.restSeconds) { mutableStateOf(s.restSeconds.toString()) }
    var backupDialog by rememberSaveable { mutableStateOf(false) }
    var restorePath by rememberSaveable { mutableStateOf<String?>(null) }
    val restoreUri = restorePath?.let(Uri::parse)
    var password by remember { mutableStateOf("") }
    var repeatedPassword by remember { mutableStateOf("") }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { vm.writeBackup(it) }
    val restore = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { restorePath = it?.toString() }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 680.dp).fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionHeader(if (s.initialized) "Perfil e configurações" else "Bem-vindo ao EvoluPersonal", "Seu perfil profissional e as preferências ficam neste aparelho.")
            OutlinedTextField(name, { name = it.take(60) }, label = { Text("Nome do profissional") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Text("Experiência")
            listOf("Iniciante", "Intermediário", "Avançado").forEach { level ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = experience == level, onClick = { experience = level }, enabled = !vm.busy)
                    TextButton(onClick = { experience = level }, enabled = !vm.busy) { Text(level) }
                }
            }
            OutlinedTextField(goal, { goal = it.take(100) }, label = { Text("Objetivo principal") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(equipment, { equipment = it.take(200) }, label = { Text("Equipamentos disponíveis (opcional)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(rest, { rest = it.take(3) }, label = { Text("Descanso padrão em segundos (15–600)") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number))
            Button(onClick = { vm.saveProfile(name, experience, equipment, goal, rest.toIntOrNull() ?: 0) }, enabled = !vm.busy && name.trim().length >= 2 && goal.isNotBlank() && (rest.toIntOrNull() ?: 0) in 15..600, modifier = Modifier.fillMaxWidth()) {
                Text(if (vm.busy) "Salvando…" else if (s.initialized) "Salvar perfil" else "Salvar e começar")
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Modo escuro", modifier = Modifier.weight(1f))
                Switch(s.dark, vm::toggleTheme, enabled = !vm.busy)
            }
            if (s.initialized) {
                HorizontalDivider()
                SectionHeader("Dados e recuperação", "Backup protegido por senha. Guarde-a: ela é necessária para restaurar em outro aparelho.")
                OutlinedButton(onClick = { backupDialog = true }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) { Text("Salvar backup criptografado") }
                OutlinedButton(onClick = { restore.launch(arrayOf("*/*")) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) { Text("Restaurar backup") }
            } else {
                TextButton(onClick = { restore.launch(arrayOf("*/*")) }, enabled = !vm.busy) { Text("Já tenho um backup") }
            }
            Text("EvoluPersonal ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelLarge)
            Text("Android nativo · Dados offline", style = MaterialTheme.typography.bodySmall)
        }
    }
    if (backupDialog || restoreUri != null) {
        val restoring = restoreUri != null
        fun dismiss() { backupDialog = false; restorePath = null; password = ""; repeatedPassword = "" }
        AlertDialog(
            onDismissRequest = { if (!vm.busy) dismiss() },
            title = { Text(if (restoring) "Restaurar dados?" else "Proteger backup") },
            text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(if (restoring) "O conteúdo deste backup substituirá todos os dados atuais, incluindo perfil, alunos e treinos. Faça um backup atual antes de continuar. Arquivo inválido ou senha incorreta preservam os dados atuais." else "Crie uma senha com pelo menos 8 caracteres. Sem ela não será possível recuperar o arquivo.")
                OutlinedTextField(password, { password = it }, label = { Text("Senha do backup") }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
                if (!restoring) OutlinedTextField(repeatedPassword, { repeatedPassword = it }, label = { Text("Repita a senha") }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
            } },
            confirmButton = { TextButton(enabled = !vm.busy && password.length >= 8 && (restoring || password == repeatedPassword), onClick = {
                val secret = password.toCharArray()
                if (restoring) vm.restoreBackup(requireNotNull(restoreUri), secret)
                else vm.prepareBackup(secret) { export.launch("EvoluPersonal-backup.evp") }
                dismiss()
            }) { Text(if (restoring) "Substituir e restaurar" else "Escolher local") } },
            dismissButton = { TextButton(onClick = { dismiss() }, enabled = !vm.busy) { Text("Cancelar") } }
        )
    }
}
