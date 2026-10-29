# Arquitetura e plano — EvoluPersonal 0.1.0-dev

## Identidade
Marca: EvoluPersonal. Produto Android nativo, sem copiar os aplicativos de referência. Design: superfícies grafite com cartões, destaque azul-cobalto, verde-menta para sucesso; modo claro/escuro. Navegação inferior com cinco destinos.

## Camadas
- `MainActivity`: instancia o ViewModel com `Application`.
- `data/TrainerDatabase.kt`: entidades, índices e DAOs Room; dados offline.
- `ui/TrainerViewModel.kt`: estado e ações das telas, corrotinas.
- `ui/TrainerApp.kt`: telas Compose.
- `core/WorkoutMath.kt`: regras puras testáveis.

## Integridade
Sessão inacabada deve ser retomada após reabrir o app. Registros de séries pertencem à sessão e ao exercício. Validação: repetições 1..1000, carga 0..1000 kg, RIR 0..10. Conclusão exige pelo menos uma série. Rotinas e exercícios manuais não são excluídos nesta fase.

## Dados de exercícios
Origem MANUAL para exercícios cadastrados pelo usuário. Futuro importador de biblioteca usará `externalId` estável em vez de nome, fará upsert e manterá logs históricos. Nenhum GIF nem exercício de biblioteca é copiado nesta etapa.

## Próximas etapas
1. Validar build com SDK/Gradle no CI e dispositivo real; introduzir wrapper verificável.
2. Editor de rotina (reordenar, editar séries-alvo, dia, remoção com confirmação).
3. Importador versionado da biblioteca 3D, metadados e cache local com verificação.
4. Cronômetro de descanso em primeiro plano com notificação opcional.
5. Evolução detalhada por exercício: 1RM estimado, volume e carga.
6. Backup/restauração criptografados com testes de migração Room.
7. Testes de UI, acessibilidade, minificação, assinatura e release APK.

### Limitações atuais
Sem sincronização remota, GIF/3D, editor avançado, notificação em segundo plano, autenticação ou APK compilado. Requer Android Studio/SDK para build real.
