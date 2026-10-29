# EvoluPersonal — Android nativo

Aplicativo de treinamento físico para Android desenvolvido **do zero** em Kotlin, Jetpack Compose, Material 3 e Room/SQLite. Não é WebView nem PWA.

## Status: 0.1.0-dev — primeira base funcional

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
