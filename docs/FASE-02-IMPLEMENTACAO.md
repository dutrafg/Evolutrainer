# Fase 2 — Prescrição e execução

## Escopo e andamento

Versão de desenvolvimento: **0.5.0-dev**. Branch: `feature/android-nativo-base`.

As etapas **6–10 estão implementadas e a validação automatizada foi aprovada**. Homologação física pendente; a fase 3 permanece bloqueada até o encerramento das pendências.

| Etapa | Situação |
| --- | --- |
| 6. Biblioteca e estrutura de exercícios | Implementada; 31 testes e build aprovados |
| 7. Construtor de treinos | Implementado; 42 testes e build aprovados |
| 8. Prescrição personalizada | Implementada: carga-alvo, RIR/RPE, faixa de repetições, descanso, cadência, duração e observações |
| 9. Execução de treinos | Implementada: pausa persistente, substituição, registros e revisão antes da conclusão |
| 10. Métodos avançados e temporizadores | Implementados com configuração, execução guiada e registro manual de etapas; temporizador persistente |

A base já tinha criação e duplicação de rotinas, séries/repetições, registro de cargas, tipos de séries e descanso simples. A etapa 7 amplia o construtor; as etapas 8–10 foram complementadas na versão 0.5.0-dev.

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

## Etapa 7

- Criação e edição do nome, dia da semana, divisão e observações da ficha.
- Criação de divisões A/B, A/B/C, A/B/C/D ou personalizadas, com 2 a 7 rótulos únicos e dias escolhidos individualmente. A operação cria fichas independentes e vazias, em uma única transação; não prescreve exercícios automaticamente.
- Cadastro direto de modelos, salvamento de uma cópia de ficha como modelo e criação de treinos a partir deles. Cópias têm novos IDs, mantêm ordem e séries/repetições e não herdam aluno nem sessões. Alterações na cópia não alteram a fonte.
- Lista pesquisável e filtros Treinos, Modelos e Arquivados.
- Seletor de exercícios com busca, filtros por músculo/equipamento e favoritos; oculta exercícios já incluídos.
- Edição de séries/repetições; reordenação por botões acessíveis; normalização da ordem depois de incluir, mover ou remover. Corrige empates/lacunas que podiam existir em fichas antigas.
- Arquivamento/restauração: preserva vínculo do aluno, exercícios e histórico. Fichas arquivadas saem da programação e da atribuição. Modelos precisam ser copiados para treinos antes da atribuição ou execução.
- Todas as mutações da ficha de uma sessão em andamento são bloqueadas. Não há descarte destrutivo de rotinas com histórico.
- Formulários só fecham após sucesso, com bloqueio de envio repetido; rascunhos usam estado salvável.

## Smartphone e tablet

Grade adaptável que renderiza os cartões conforme a rolagem, com cartões de largura mínima de 300 dp, filtros que quebram linha e formulário rolável com largura máxima de 680 dp. Mantida a navegação inferior em janelas compactas e lateral a partir de 600 dp. Os rascunhos e filtros utilizam estado salvável; o formulário só fecha depois de a gravação terminar com sucesso. Erros preservam os campos para correção.

## Persistência e compatibilidade

Na etapa 6, Room v4 adicionou `equipment`, `instructions` e `favorite` à tabela `exercises`, com valores padrão seguros para registros existentes. Na etapa 7, Room v5 adiciona `divisionLabel`, `notes`, `isTemplate` e `archived` às rotinas. Migrações v1→v2→v3→v4→v5 sem descarte de tabelas. O arquivo de banco, applicationId e namespace permanecem os mesmos.

O formato criptografado continua na versão 1. O conteúdo exportado passa a declarar `databaseVersion=5`. A restauração aceita backups v3 da fase 1 e v4 da etapa 6, atribuindo os valores padrão apenas aos campos que não existiam nessas versões. Backups v5 exigem todos os campos e os tipos corretos. A validação acontece antes da restauração transacional. A versão antiga do aplicativo não restaura backups v5.

## Validação da etapa 6 (0.4.0-dev)

**31 testes aprovados, zero falhas, erros ou ignorados. Build Android aprovado.**

Execução: https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941

Código validado: `23a9a32f49ccf7d587f24f6ec80a6b672baeeff1`. O commit seguinte apenas registra documentação e o schema v4 gerado pelo compilador Room nessa execução.

APK de desenvolvimento: https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941/artifacts/12869410944

Relatórios XML/HTML e schemas: https://github.com/dutrafg/Evolutrainer/actions/runs/40808084941/artifacts/12868279769

Schema versionado: `app/schemas/br.com.evolupersonal.data.TrainerDatabase/4.json`.

Testes acrescentados: migração direta v3→v4 e cadeias anteriores; edição/favoritos com vínculos históricos; duplicação normalizada e validações; busca/filtros combinados; roundtrip de backup v4; restauração v3; rejeição de backup v4 incompleto ou com tipo inválido; fluxo de cadastro, edição, busca e favoritos em quatro configurações de smartphone/tablet.

Homologação física permanece pendente: teclado, TalkBack, fontes ampliadas, rotação real, gestos e instalação/atualização. Os testes de Compose/Robolectric usam ações semânticas e não substituem essas verificações.

## Validação da etapa 7 (0.4.1-dev)

**42 testes aprovados, zero falhas, erros ou ignorados. Build Android e APK 0.4.1-dev gerados com sucesso.**

Execução final: https://github.com/dutrafg/Evolutrainer/actions/runs/40841230528

Código validado: `aa61a6dcd77667aab660314066f9121a83fe2b63`. O commit seguinte apenas registra esta documentação e o schema v5 gerado pelo compilador Room.

APK: https://github.com/dutrafg/Evolutrainer/actions/runs/40841230528/artifacts/12883555689

Relatórios e schemas: https://github.com/dutrafg/Evolutrainer/actions/runs/40841230528/artifacts/12882254744

Schema versionado: `app/schemas/br.com.evolupersonal.data.TrainerDatabase/5.json`.

Novos testes cobrem cópias independentes/modelos, divisões e rollback, arquivamento e preservação de histórico, bloqueio das mutações durante sessão, ordenação com lacunas/empates legados, migrações até v5 e restauração de backups v3/v4. O fluxo de criação, edição, inclusão, reordenação e reutilização de modelo é exercitado em quatro configurações de smartphone/tablet, incluindo restauração de rascunho via estado salvável.

Também foi corrigido e testado o retorno ao construtor por “Criar treino” na tela inicial, que podia reabrir a última ficha selecionada. A `main` permanece no commit `55f8e9f791841e836ac643e4c8b296c9b128a518`.

## Complementação das etapas 8–10 — 0.5.0-dev

Implementação validada automaticamente: **49 testes aprovados, zero falhas/erros/ignorados e build Android concluído**. Homologação física ainda pendente.

- Prescrição por exercício: séries, faixa de repetições, carga em kg/lb, RIR/RPE, descanso, cadência, duração e observações.
- Métodos configuráveis: tradicional, supersérie, bi-set, tri-set, dropset, rest-pause, cluster, circuito, HIIT, EMOM e AMRAP. Blocos identificam exercícios associados; a abertura da sessão valida a quantidade de participantes. A execução é guiada e os registros de cada etapa são manuais; não se altera a carga automaticamente.
- Rodadas, tempo de execução e intervalo configuráveis. EMOM exige ciclo de 60 segundos e AMRAP exige duração. Temporizador calcula fase/rodada a partir do início persistido.
- Pausa/retomada salva no banco; o intervalo pausado é descontado do tempo ativo e desloca o temporizador.
- Substituições por sessão preservam a ficha original. Séries já registradas permanecem associadas ao exercício efetivamente executado.
- Confirmação de conclusão e bloqueio de encerramento sem séries; todas as séries salvas permanecem no histórico.
- Room v6 com migração v5→v6 e restauração de backups v3–v6, incluindo prescrição e estado da sessão.

Validação automatizada inclui migrações v1–v5 para v6, prescrição, limites dos métodos, transições do temporizador, persistência de pausa/substituições em backup e os fluxos de sessão em smartphone/tablet retrato/paisagem. A substituição usa tela completa; a pausa mantém o rascunho da série. O descanso padrão vem do perfil e a confirmação de conclusão lista séries pendentes.

Execução aprovada: https://github.com/dutrafg/Evolutrainer/actions/runs/40844110365

Código validado: `4dd83d21e209baf8135294fdfba0d17208b2a83e`. O commit seguinte acrescenta documentação e o schema v6 gerado nessa execução.

APK: https://github.com/dutrafg/Evolutrainer/actions/runs/40844110365/artifacts/12884775233

Relatórios e schemas: https://github.com/dutrafg/Evolutrainer/actions/runs/40844110365/artifacts/12883928034

Pendências para encerramento da homologação: revisão visual e uso real dos formulários, métodos em sequência, teclado, acessibilidade, fontes ampliadas, seletor de backup e recuperação após encerramento do processo em smartphone/tablet físicos. A fase 3 não será iniciada enquanto houver pendências. Os testes semânticos em Robolectric não substituem a execução em aparelhos.
