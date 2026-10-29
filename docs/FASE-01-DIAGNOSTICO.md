# Fase 1 — Diagnóstico inicial

Data: 28/10/2026 (America/Sao_Paulo).

## Escopo e conclusão

Diagnóstico do Android nativo no repositório dutrafg/Evolutrainer, branch feature/android-nativo-base, commit 5d51e6330312bd2b3ae6c9afa56caed54a063cdb.
O código atual usa a identidade EvoluPersonal; o nome do repositório continua Evolutrainer. Registrar essa diferença antes de qualquer mudança de identidade.

Esta entrega conclui a revisão inicial e define correções verificáveis. Não implementa backup, onboarding ou gestão ampliada de alunos; essas lacunas continuam abertas. Não reconstrói o restante do plano de 20 fases, cujo texto integral não está disponível nesta sessão.

## Evidências de base

- main consultada: 55f8e9f791841e836ac643e4c8b296c9b128a518. Nenhuma alteração nela.
- Android CI do commit auditado: sucesso, execução 40798438011.
- Evidência: https://github.com/dutrafg/Evolutrainer/actions/runs/40798438011
- O workflow executa testDebugUnitTest e assembleDebug; não executa testes instrumentados, emulador, acessibilidade ou testes em aparelho.
- Kotlin/Compose/Room nativos, applicationId br.com.evolupersonal, SDK mínimo 26, versão de build 0.2.0-dev.
- A árvore auditada não contém AGENTS.md, testes androidTest ou esquemas Room exportados.

## Achados e critérios de correção

### 1. Persistência e segurança — prioridade alta

Evidências: TrainerDatabase.kt, app/build.gradle.kts, AndroidManifest.xml e android-ci.yml.

- Room v2 registra MIGRATION_1_2 e não usa fallback destrutivo.
- exportSchema=false; os testes existentes são de cálculos e sugestões, sem cobertura de migração Room.
- A migração acrescenta alunos, vínculo nas fichas/sessões, check-in e campos de série. A existência do SQL não prova preservação em atualização real.
- Não existe exportação/restauração pelo usuário. allowBackup=false desativa o backup Android; isso não equivale a backup próprio nem a criptografia do banco.
- studentId nas fichas e sessões não tem chave estrangeira; integridade do vínculo depende da aplicação.
- observeHistory limita o resultado a 30 sessões. Uma futura exportação não pode usar esse fluxo como fonte de backup completo.
- Sessões e séries persistem no banco; rotinas duplicadas usam transação.

Critérios:
1. Exportar esquemas e testar banco v1 com dados reais de todas as tabelas → migração → abertura e validação Room v2, preservando IDs, cargas, séries e sessão aberta.
2. Testar criação de banco novo v2 e atualização; conferir defaults NORMAL e observação vazia.
3. Backup deve incluir todas as tabelas, relações, preferências, versão do formato e validação de integridade.
4. Restaurar somente após validar formato, referências e compatibilidade. Falha, cancelamento e arquivo corrompido devem preservar integralmente os dados atuais.
5. Validar exportar → restaurar → reabrir, incluindo mais de 30 sessões e a sessão aberta.
6. Definir proteção e portabilidade do backup antes da implementação, sem prometer recuperação com chave indisponível.

### 2. Primeiro acesso — prioridade alta

Evidências: TrainerViewModel.updateName, TrainerApp e ProfileScreen em TrainerExtraScreens.kt.

- O nome já é gravado em SharedPreferences com apply(); não há evidência nesta revisão de que o nome deixe sempre de persistir.
- Não existe onboarding explícito nem marcador de configuração concluída.
- updateName aceita nome vazio e não informa sucesso/erro de gravação.
- ProfileScreen mantém rascunho com remember, sujeito a perda por recriação.

Critérios:
1. Primeiro acesso apresenta formulário explícito; conclusão depende de nome validado e persistência confirmada.
2. Falha de gravação mantém formulário e explica o erro.
3. Reabrir, girar a tela e encerrar o processo não devem perder perfil já salvo.
4. Atualização de instalações existentes preserva nomes válidos e evita exigir novo cadastro.
5. Separar rascunho, operação em andamento e perfil confirmado.

### 3. Alunos — prioridade alta

Evidências: StudentsScreen.kt, TrainerDao e TrainerViewModel.addStudent/assignRoutine.

- Cadastro e atribuição/desvinculação de ficha já existem.
- Não há pesquisa, editor do aluno nem ação de ativar/inativar.
- StudentEntity.active existe, mas não há operação para alterá-lo na interface/DAO.
- O diálogo de cadastro fecha imediatamente após disparar operação assíncrona, antes da confirmação do banco; em falha o usuário perde acesso ao rascunho.
- assignRoutine valida aluno por students.value, que pode estar temporariamente vazio; preferir leitura direta por ID no DAO.
- O ID do aluno é copiado para a sessão no início do treino, o que oferece base para manter o histórico individual.

Critérios:
1. Busca por nome, filtros Todos/Ativos/Inativos e estado visível.
2. Edição mantém o mesmo ID, fichas, sessões e séries; nunca recria o aluno para editar.
3. Inativação não exclui cadastro nem histórico. Reativação recupera acesso ao mesmo registro.
4. Definir bloqueio de novas atribuições/inícios para inativos, preservando retomada/conclusão de sessão existente.
5. Formulário preserva rascunho em erro e rotação, impede envio duplicado e fecha apenas após sucesso.
6. Testar dois alunos e impedir mistura de histórico antes/depois de edição/inativação.

### 4. Acabamento Android e validação — prioridade média

Evidências: AndroidManifest.xml, strings.xml, TrainerExtraScreens.kt e workflow.

- Label e cabeçalho usam EvoluPersonal; o repositório chama-se Evolutrainer. Não renomear silenciosamente sem resolver a identidade final.
- Perfil mostra 0.1.0-dev fixo, diferente de versionName=0.2.0-dev. Exibir a versão gerada pelo build para evitar divergência.
- Manifest não declara android:icon ou roundIcon e a árvore não inclui assets de ícone.
- CI gera APK debug; não comprova comportamento de teclado, botão Voltar, telas pequenas, rotação, TalkBack ou contraste.

Critérios:
1. Nome, ícone, tela de perfil e versão devem estar coerentes.
2. Validar temas claro/escuro, teclado aberto, fontes ampliadas, rotação, navegação do sistema e aparelho compacto.
3. Conferir botões de cadastro/salvamento, mensagens de erro e retomada de sessão após encerramento.
4. Não declarar estável apenas por compilação bem-sucedida.

## Ordem de execução proposta a partir do diagnóstico

1. Proteger dados com testes de migração e contrato de backup/restauração.
2. Corrigir o fluxo de primeiro acesso e confirmação de salvamento.
3. Ampliar alunos e validar preservação do histórico.
4. Corrigir identificação/versão e executar QA Android.

Essa sequência é uma priorização dos quatro achados da captura, não uma substituição do roadmap completo.

## Limites e exclusões

Revisão de código e consulta de CI concluídas. Não foram executados testes locais Android, migração instrumentada, restauração ou QA em aparelho nesta entrega. Nenhuma correção funcional deve ser considerada pronta por este relatório.

Biblioteca 3D, GIFs, catálogo e repositórios de mídia permanecem fora desta fase. Não houve importação, geração ou duplicação de exercícios.
