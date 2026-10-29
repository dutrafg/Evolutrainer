# Fase 3 — lote prioritário (etapas 11–14)

Beta 7, 29/10/2026. Base existente revisada sem alterar mídias ou aprovação de exercícios.

- 11 Histórico: detalhe agora mostra faixa, método, carga-alvo, RIR/RPE e cadência prescritos, notas técnicas, tipo/RPE/observações das séries, conservando snapshots e eventos.
- 12 Desempenho: gráficos recebem datas e distinguem estimativa/carga indisponível de zero. Aquecimentos ficam fora das métricas de trabalho. Estimativa de 1RM exige carga positiva e até dez repetições.
- 13 Progressão: fadiga alta relatada e substituições nas sessões recentes exigem revisão manual. Comparação também considera duração, rodadas, execução e intervalo, sem aplicar cargas automaticamente.
- 14 Volume/recuperação: músculos secundários repetidos com variações de acento/caixa contam uma única vez por série, preservando rótulo original. Referência de recuperação continua configurável e não mede recuperação fisiológica.

Validação: 38 testes passaram, sintaxe e build passaram. Interface de análise na prévia exibiu sessão fictícia de 200 kg × rep., carga 20 kg, estimativa 26,67 kg, data e mensagem de dados insuficientes para progressão com apenas uma sessão. Os testes novos cobrem ausência de estimativa, aquecimentos, fadiga, diferença de duração e duplicação de músculos secundários.

Este lote cobre melhorias nas quatro prioridades; não declara toda a fase 3 encerrada. Etapa 15 (periodização) fica fora desta revisão. Homologação em smartphone/tablet físicos permanece pendente. APK beta 6 entregue anteriormente não contém estas mudanças; código beta 7 preparado na branch feature/pwa-hibrido-beta. Main preservada.
