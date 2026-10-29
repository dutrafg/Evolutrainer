# QA das fases 1 e 2 — EvoluPersonal 0.5.0-dev

Código sob teste: `7217b47b759fbf5a094e5f0b98195e2e32768c4a`.

## Escopo

Regressão completa com build Android debug e testes JVM/Robolectric. Esta rodada acrescenta quatro testes de recuperação e limites, além dos 49 existentes. Não foram introduzidas funcionalidades de fases posteriores.

| Área | Verificações automatizadas |
| --- | --- |
| Perfil e alunos | Primeiro acesso, cadastro e pesquisa em quatro tamanhos/orientações; edição, inativação e preservação de vínculos/histórico |
| Dados | Migrações dos bancos v1–v5 para v6, preservação de IDs e registros; reabertura do banco em disco |
| Backup | Criptografia, senha incorreta, adulteração, truncamento, restauração completa, referências inválidas e rollback de falha SQL |
| Biblioteca | Busca sem acentos, filtros, favoritos, edição, duplicação e preservação dos vínculos |
| Construtor | Fichas, modelos independentes, divisões e rollback, ordenação, arquivamento e bloqueio durante sessão |
| Prescrição | Persistência, cópia, limites numéricos, métodos válidos, rejeição de NaN/infinito e configuração inválida |
| Sessão | Pausa, retomada, temporizador, substituição e conclusão em quatro configurações de tela; preservação da ficha original |
| Recuperação ampliada | Backup criptografado com perfil/aluno/prescrição/sessão pausada; banco fechado e reaberto; restauração rejeitada sem perda de dados quando o conteúdo interno é inválido |
| Cálculos | Conversão kg/lb, volume, estimativa e sugestões existentes; limites de transição do temporizador |

Configurações de interface: smartphone 360×800 dp e 800×360 dp; tablet 800×1280 dp e 1280×800 dp. Ambiente Robolectric Android API 34; compilação SDK 36. Os testes usam ações semânticas e verificações de visibilidade, não toques físicos.

## Resultado

**53 testes aprovados; zero falhas, erros ou ignorados. Build Android debug aprovado.**

Execução final: https://github.com/dutrafg/Evolutrainer/actions/runs/40855204047

Relatórios XML/HTML: https://github.com/dutrafg/Evolutrainer/actions/runs/40855204047/artifacts/12888449323

APK: https://github.com/dutrafg/Evolutrainer/actions/runs/40855204047/artifacts/12888588796

A primeira rodada teve 52 aprovações e uma falha de sincronização no teste de primeiro acesso. Foi acrescentado o processamento explícito do looper na espera da inicialização, mantendo os 15 segundos de limite e as mesmas verificações. A execução final repetiu a bateria inteira com sucesso. Nenhuma alteração no código do aplicativo foi necessária nesta rodada.

## Limites e pendências

O fechamento/reabertura do banco comprova persistência em disco, mas não equivale a encerrar e restaurar todo o processo Android. Permanecem pendentes uso em aparelhos físicos, teclado real, TalkBack, fontes ampliadas, rotação real, seletores/provedores de documentos e instalação/atualização do APK. Não foi realizada inspeção visual por capturas de tela nesta rodada.

A fase 3 permanece bloqueada enquanto as pendências de homologação não forem encerradas.

## Regra para a fase 3

Após encerrar as pendências anteriores, desenvolver no máximo três etapas por lote: etapas 11–13, depois 14–15. Validar cada lote antes de seguir.
