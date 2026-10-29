# EvoluPersonal — Android nativo

Aplicativo de treinamento físico para Android desenvolvido **do zero** em Kotlin, Jetpack Compose, Material 3 e Room/SQLite. Não é WebView nem PWA.

## Status: 0.2.0-dev — primeira base funcional

- Início, Treinos, Biblioteca, Evolução e Perfil
- Criação de exercícios manuais e rotinas, associação de exercícios a rotinas
- Início/retomada/conclusão de sessão e registro de séries (repetições, carga e RIR)
- Histórico e volume movimentado por sessão
- Descanso cronometrado durante o treino
- Tema claro/escuro e nome persistidos
- Funcionamento offline; sem permissões de Internet

## Desenvolvimento

Abrir a pasta no Android Studio com JDK 17+ e SDK 36. Sincronizar Gradle; módulo `app`. Gradle recomendado: 8.13 (compatível com AGP 8.13.2). O wrapper binário não foi incluído nesta primeira base: usar Gradle instalado no Android Studio ou gerar o wrapper (`gradle wrapper --gradle-version 8.13`).

Não foi possível realizar a compilação Android neste ambiente, que não dispõe do Android SDK nem do Gradle instalado. Esta versão é **código-fonte de desenvolvimento**, não APK homologado.

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
