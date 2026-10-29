# Fase 2 — Prescrição e execução

## Escopo e andamento

Versão de desenvolvimento: **0.4.0-dev**. Branch: `feature/android-nativo-base`.

Esta entrega inicia a fase 2 pela **etapa 6 — estrutura da biblioteca**. A fase 2 completa inclui as etapas 6 a 10; as etapas 7 a 10 ainda não estão concluídas.

| Etapa | Situação |
| --- | --- |
| 6. Biblioteca e estrutura de exercícios | Implementada; 31 testes e build aprovados |
| 7. Construtor de treinos | Próxima entrega: edição de ficha, modelos, divisões e reorganização completa |
| 8. Prescrição personalizada | Pendente: carga-alvo, RIR/RPE-alvo, cadência, tempo e observações técnicas por item |
| 9. Execução de treinos | Pendente: pausa persistente, substituição de exercício e revisão da conclusão segura |
| 10. Métodos avançados e temporizadores | Pendente: superséries, bi/trisets, dropsets, rest-pause, cluster, circuitos, HIIT, EMOM e AMRAP |

A base já tinha criação e duplicação de rotinas, séries/repetições, registro de cargas, tipos de séries e descanso simples. Esses recursos não equivalem à conclusão das etapas 7 a 10.

## Etapa 6

- Cadastro e edição de exercícios próprios: nome, grupo muscular, equipamento e instruções de execução.
- Nome e grupo muscular obrigatórios; equipamento e instruções opcionais.
- Busca por palavras combinadas em nome, grupo muscular e equipamento, sem distinção de caixa ou acentos.
- Filtros combinados por músculo, equipamento e favoritos; opção de limpar filtros.
- Favoritos persistidos no banco e incluídos no backup.
- Prevenção de duplicação pelo conjunto normalizado nome + grupo muscular + equipamento. Variantes com equipamentos diferentes são permitidas.
- Edição mantém o ID, vínculos de fichas, séries e favoritos. Os números históricos não são recalculados; o nome exibido passa a ser o nome atualizado do cadastro. Auditoria de alterações e snapshots históricos pertencem à fase 3.
- Exercícios importados conservam `origin` e `externalId`; apenas favoritos podem ser alterados por esta interface. Nenhuma importação foi executada.
- Nenhum exercício 3D/GIF foi criado, copiado ou importado. A integração canônica continua reservada para a fase 4.

## Smartphone e tablet

Grade preguiçosa adaptável com cartões de largura mínima de 300 dp, filtros que quebram linha e formulário rolável com largura máxima de 680 dp. Mantida a navegação inferior em janelas compactas e lateral a partir de 600 dp. Os rascunhos e filtros utilizam estado salvável; o formulário só fecha depois de a gravação terminar com sucesso. Erros preservam os campos para correção.

## Persistência e compatibilidade

Room v4 adiciona `equipment`, `instructions` e `favorite` à tabela `exercises`, com valores padrão seguros para registros existentes. Migrações v1→v2→v3→v4 sem descarte de tabelas. O arquivo de banco, applicationId e namespace permanecem os mesmos.

O formato criptografado continua na versão 1. O conteúdo exportado passa a declarar `databaseVersion=4`. A restauração aceita backups v3 da fase 1 e atribui os valores padrão aos três novos campos. Backups v4 exigem todos os campos e os tipos corretos. A validação acontece antes da restauração transacional. A versão antiga do aplicativo não restaura backups v4.

## Validação

**31 testes aprovados, zero falhas, erros ou ignorados. Build Android aprovado.**

Execução: https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941

Código validado: `23a9a32f49ccf7d587f24f6ec80a6b672baeeff1`. O commit seguinte apenas registra documentação e o schema v4 gerado pelo compilador Room nessa execução.

APK de desenvolvimento: https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941/artifacts/12869410944

Relatórios XML/HTML e schemas: https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941/artifacts/12868279769

Schema versionado: `app/schemas/br.com.evolupersonal.data.TrainerDatabase/4.json`.

Testes acrescentados: migração direta v3→v4 e cadeias anteriores; edição/favoritos com vínculos históricos; duplicação normalizada e validações; busca/filtros combinados; roundtrip de backup v4; restauração v3; rejeição de backup v4 incompleto ou com tipo inválido; fluxo de cadastro, edição, busca e favoritos em quatro configurações de smartphone/tablet.

Homologação física permanece pendente: teclado, TalkBack, fontes ampliadas, rotação real, gestos e instalação/atualização. Os testes de Compose/Robolectric usam ações semânticas e não substituem essas verificações.
