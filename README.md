# EvoluPersonal — Android nativo

Aplicativo de treinamento físico para Android desenvolvido **do zero** em Kotlin, Jetpack Compose, Material 3 e Room/SQLite. Não é WebView nem PWA.

## Status: 0.6.0-dev — Fase 3, lote 1 (etapas 11–13) validado

- Início, Treinos, Biblioteca, Evolução e Perfil
- Criação de exercícios manuais e rotinas, associação de exercícios a rotinas
- Início/retomada/conclusão de sessão e registro de séries (repetições, carga e RIR)
- Histórico e volume movimentado por sessão
- Descanso cronometrado durante o treino
- Tema claro/escuro e nome persistidos
- Funcionamento offline; sem permissões de Internet

## Desenvolvimento

Abrir a pasta no Android Studio com JDK 17+ e SDK 36. Sincronizar Gradle; módulo `app`. Gradle recomendado: 8.13 (compatível com AGP 8.13.2). O wrapper binário não foi incluído nesta primeira base: usar Gradle instalado no Android Studio ou gerar o wrapper (`gradle wrapper --gradle-version 8.13`).

A compilação Android e os testes são executados no GitHub Actions. O ambiente local não dispõe de SDK/Gradle. Esta versão é de desenvolvimento e exige homologação em aparelhos antes de ser tratada como estável.

## Biblioteca 3D

A biblioteca canônica de exercícios está sendo concluída **separadamente**, no repositório `dutrafg/EvoluFisico`. O EvoluPersonal mantém exercícios do usuário com `origin=MANUAL` e reserva `externalId` para sincronizar futuramente identificadores canônicos `origin=LIBRARY`, sem duplicação por nome. Não apagar nem modificar a biblioteca externa.

## Branches

- `main`: estado estável/README inicial; não publicar sem autorização.
- `feature/android-nativo-base`: implementação ativa.

Ver `docs/ARQUITETURA.md` para decisões, limites e próximo lote.

## Identidade do aplicativo
O nome oficial a partir desta etapa é **EvoluPersonal**. O repositório técnico ainda mantém o nome antigo `dutrafg/Evolutrainer`; nenhum repositório existente foi renomeado ou apagado.

Os mais de 400 GIFs legados e os dados da lista MD500 permanecem no repositório fonte `dutrafg/EvoluPersonal`, branch `codex/evolupersonal-media-350`. Não são importados automaticamente até passar pelo contrato de integridade.

## Etapa atual — funcionalidades selecionadas
- Gestão offline de alunos (nome, objetivo, equipamentos, notas) e atribuição de fichas.
- Check-in opcional de energia/sono/fadiga ao iniciar sessão.
- Registro ampliado de séries: aquecimento, trabalho, back-off, drop e falha, RIR, RPE e observações.
- Descanso configurável durante a sessão e histórico anterior por exercício/aluno.
- Sugestões explicáveis de progressão, sem aplicar cargas automaticamente, e melhor 1RM estimada.
- Migração Room v1→v2, sem descarte de dados.

**Ainda não implementados:** editor completo de métodos e mesociclos, chat personal-aluno, integração com serviços externos, controle financeiro, sincronização online, biblioteca 3D e auditoria clínica/biomecânica. Consulte `docs/ROADMAP-FUNCOES.md`.


## Fase 1 — fundação (etapas 1–5)

- Room v3 com migrações v1→v2→v3, perfil e preferências no mesmo banco.
- Primeiro acesso explícito com nome profissional, experiência, objetivo, equipamentos e descanso padrão.
- Backup portátil protegido por senha (AES-256-GCM, PBKDF2-HMAC-SHA256), seleção de arquivo pelo Android e restauração transacional de todas as tabelas.
- Pesquisa sem distinção de acentos, edição, filtros, ativação/inativação e histórico individual dos alunos.
- Smartphone: navegação inferior. Tablet a partir de 600 dp: navegação lateral e grade adaptável de alunos. Formulário de perfil limitado a 680 dp para leitura confortável.
- Versão do perfil extraída do build e ícone próprio.

Testes novos cobrem migração, integridade de backup, autenticação, recuperação de mais de 30 sessões e cenários de interface em smartphone/tablet. Os resultados e limites da validação ficam em docs/FASE-01-IMPLEMENTACAO.md.

A biblioteca 3D permanece fora desta entrega. A main não deve receber alterações sem autorização.

Validação da Fase 1: 22 testes aprovados, zero falhas/erros/ignorados; build Android aprovado na execução https://github.com/dutrafg/Evolutrainer/actions/runs/40806493717 . Homologação em smartphone e tablet físicos permanece pendente.

## Fase 2 — início pela biblioteca (etapa 6)

Cadastro e edição de exercícios próprios, equipamento, instruções, busca sem acentos, filtros e favoritos persistentes. Room v4, migração preservando dados e restauração compatível com backups da fase 1. Grade e formulários adaptados a smartphone e tablet.

A etapa 7 amplia o construtor com edição de fichas, divisões, modelos reutilizáveis e arquivamento. As etapas 8–10 foram implementadas na versão 0.5.0-dev. Consulte [o andamento da fase 2](docs/FASE-02-IMPLEMENTACAO.md).

Validação da etapa 6: **31 testes aprovados e build Android concluído** na [execução de validação](https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941). Homologação física ainda pendente.

Construtor: modelos e fichas independentes, divisões A/B/C/D ou personalizadas, busca/filtros, reordenação consistente e arquivamento sem perder histórico. Room v5 com restauração de backups v3/v4/v5.

Validação da etapa 7: **42 testes aprovados e APK 0.4.1-dev gerado** na [execução final](https://github.com/dutrafg/Evolutrainer/actions/runs/40841230528). Homologação física de smartphone e tablet ainda pendente.

Fase 2: prescrição por exercício, métodos configuráveis com execução guiada e registro manual, temporizador persistente, pausa/retomada e substituição por sessão. Room v6 e backups v3–v6. **49 testes aprovados**, [build e APK](https://github.com/dutrafg/Evolutrainer/actions/runs/40844110365). A homologação em aparelhos segue pendente e deve ser concluída antes de uma versão estável.

## Fase 3 — lote 1

Histórico com prescrição preservada, observações e eventos da sessão; análise por aluno/exercício com gráfico, recordes e resumo semanal; progressão explicável sem aplicação automática de cargas. Room v7. **63 testes aprovados e build Android concluído.** [Relatório do lote](docs/FASE-03-LOTE-01.md). As etapas 14 e 15 ficam para o próximo lote.
