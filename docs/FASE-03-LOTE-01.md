# Fase 3 — lote 1: etapas 11, 12 e 13

Versão atual: 0.6.1-dev (complementação do lote). Validação anterior: 0.6.0-dev. Branch: feature/android-nativo-base. **63 testes aprovados e build Android concluído.**

A homologação física das fases anteriores continua pendente. Este lote abrange no máximo três etapas, conforme o limite definido para a fase 3. Etapas 14 e 15 não pertencem a esta entrega.

## 11 — Histórico e auditoria

Novas sessões guardam título, nome do aluno, nomes/grupos dos exercícios e prescrição no início. Edições posteriores do cadastro não reescrevem essa cópia. Substituições adicionam os nomes efetivamente utilizados ao registro e guardam eventos com data/hora; pausas e retomadas também são registradas. As séries conservam carga, repetições, RIR/RPE, tipo e notas.

A tela de histórico permite selecionar o aluno (incluindo inativos), abrir sessões, revisar prescrição e séries e acrescentar observações datadas. Observações são adicionadas, não substituídas; limite acumulado de 2000 caracteres. Não há remoção/regravação destrutiva das séries por essa tela.

Sessões antigas sem snapshot aparecem como legadas. Não é possível recuperar retroativamente a prescrição ou os nomes originais de forma confiável; o aplicativo informa essa limitação. Registros de auditoria são locais, sem assinatura antiviolação ou identidade multiusuário.

## 12 — Análise de desempenho

Por aluno e exercício: gráfico das últimas 12 sessões em ordem cronológica, volume de trabalho, total de repetições, maior carga e melhor estimativa de 1RM (Epley, apenas 1–10 repetições com carga positiva). Também há frequência, séries e volume nos últimos sete dias. A análise ignora sessões abertas e exclui aquecimento do volume de trabalho.

A tela respeita kg/lb. O volume representa carga externa × repetições. O gráfico normaliza a altura das barras para exibição; os números exatos aparecem na lista. Não há mistura de alunos na tela.

## 13 — Motor de progressão

Sugestões locais e explicáveis, sem alterar a ficha ou aplicar carga automaticamente. Compara as três sessões concluídas recentes do mesmo aluno/exercício, com prescrição histórica, método tradicional, séries previstas completas, RIR registrado, mesma carga positiva, faixa de repetições, número de séries, descanso e cadência.

- Aumento indicativo de 2%: todas as séries das três sessões atingem o limite superior de repetições com RIR ≥2.
- Redução indicativa de 5%: todas as séries das duas sessões recentes ficam abaixo da faixa ou com RIR zero.
- Manutenção: os critérios anteriores não foram atingidos consistentemente.
- Dados insuficientes/revisão manual: registros incompletos, sessões legadas, alunos misturados, cargas diferentes ou métodos especiais.

As sugestões são heurísticas explícitas, não uma confirmação automática da adequação da progressão. Não há arredondamento por anilhas nem aplicação automática.

## Persistência

Room v7 adiciona snapshotJson e observations às sessões. Migração v6→v7 sem descarte; backups v3–v7 com os novos campos preenchidos apenas quando disponíveis. O formato criptografado não mudou. Eventos residem no runtimeJson. Backup/restauração inclui nomes e prescrições históricos, observações e eventos.

## Validação

Execução aprovada: https://github.com/dutrafg/Evolutrainer/actions/runs/40857317763

Código validado: `b3728330f351c09f306cdb52a4e690c8f07e5c69`. O commit posterior registra documentação e o schema v7 gerado pelo Room.

APK: https://github.com/dutrafg/Evolutrainer/actions/runs/40857317763/artifacts/12889293925

Relatórios XML/HTML e schemas: https://github.com/dutrafg/Evolutrainer/actions/runs/40857317763/artifacts/12889413922

Resultado: **63 testes, zero falhas, zero erros e zero ignorados**. Regressão anterior incluída; interface testada em smartphone e tablet, retrato e paisagem, por ações semânticas em Robolectric. Não foi realizada inspeção visual por capturas de tela.

Testes novos: regras de aumento/manutenção/redução, ausência de mutações, dados insuficientes e não comparáveis, isolamento por aluno, frequência/volume semanal, snapshot preservado após mudança do cadastro e backup, migração e uso da interface em quatro configurações de smartphone/tablet.

Pendências físicas: teclado, TalkBack, fontes ampliadas, rotação real, arquivos/backup e recuperação completa do processo. Não foram realizados testes em aparelhos físicos nesta entrega.

## Complementação das pendências — 0.6.1-dev

- O motor considera as três sessões mais recentes relacionadas ao exercício, incluindo sessões com séries especiais, apenas aquecimento ou prescrição sem execução. Não busca sessões mais antigas para contornar dados não comparáveis. Sessões de outros exercícios continuam excluídas.
- Novos registros distinguem planejamento original e substitutos e guardam o item da ficha de origem. Quando a origem não existe nos snapshots da primeira versão v7, a tela informa “Registro legado: origem não identificada”; não inventa essa classificação. Prescrições históricas ambíguas são encaminhadas para revisão manual.
- O histórico mostra carga-alvo nas unidades selecionadas, RIR/RPE-alvo, cadência, duração, notas técnicas, método, bloco, rodadas e intervalos.
- Eventos com timestamp numérico são apresentados como data/hora legível, mantendo o texto armazenado e os eventos antigos sem timestamp.
- Gráficos separados de volume, carga máxima e 1RM estimada, com valores textuais acessíveis. Lacunas de estimativa não são tratadas como zero.
- Testes adicionais para a seleção de sessões recentes, origem dos registros, apresentação de eventos, restauração de backups v6 e v7 antigos e exibição dos campos/gráficos em quatro configurações de smartphone/tablet.

A alteração do snapshot é interna ao JSON; o banco permanece Room v7, sem alteração de tabelas. A versão 0.6.1-dev mantém a compatibilidade de restauração v3–v7. Resultado da complementação: **68 testes aprovados, zero falhas, erros ou ignorados; build Android aprovado e APK 0.6.1-dev gerado**.

Código validado: `de606f61ab133d132ec463002e9d83b146e6e5a2`.

Execução: https://github.com/dutrafg/Evolutrainer/actions/runs/40860054341

Relatórios: https://github.com/dutrafg/Evolutrainer/actions/runs/40860054341/artifacts/12891451478

APK: https://github.com/dutrafg/Evolutrainer/actions/runs/40860054341/artifacts/12890574486

As pendências de implementação identificadas na revisão do lote 11–13 foram corrigidas. A regressão inclui os fluxos de histórico nas quatro configurações de smartphone/tablet, com verificação dos novos gráficos e campos. A homologação física e a inspeção visual por capturas continuam pendentes. Etapas 14 e 15 não foram iniciadas.
