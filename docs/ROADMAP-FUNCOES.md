# EvoluPersonal — matriz de funcionalidades inspiradas no mercado (28/10/2026)

**Fontes e referência funcional (não copiar design, código ou algoritmos proprietários):**
- Hevy: https://www.hevyapp.com/features/ — registro rápido, superséries, PRs, progressão e volume.
- Strong: https://www.strong.app/ — simplicidade, aquecimento, temporizador, CSV, medidas.
- Fitbod: https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout — individualização por objetivo, equipamento e recuperação, sem copiar algoritmo.
- Trainerize: https://help.trainerize.com/hc/en-us/articles/208688876-What-is-ABC-Trainerize-A-Getting-Started-Overview — programas, clientes, hábitos e comunicação.
- Everfit: construtor de programas e prescrição avançada.

## Entregue no código-fonte 0.2.0-dev (aguarda validação de build e dispositivo)
1. Navegação principal e identidade própria grafite/azul.
2. Exercícios manuais, fichas, dia de treino e execução offline.
3. Alunos com objetivo, equipamento, observações e vinculação de rotina.
4. Check-in opcional pré-treino: energia, sono e fadiga.
5. Séries de aquecimento, trabalho, back-off, drop e falha; carga, repetições, RIR, RPE e notas.
6. Desempenho anterior do mesmo aluno, descanso 60/90/120 segundos e sugestão conservadora.
7. Histórico e volume, séries de trabalho e estimativa 1RM.
8. Room v2 com migração conservadora de v1; nenhuma importação 3D.

## Próximas entregas por prioridade

### P0 — estabilidade e eficiência do treino
- Build Android CI verde, APK debug validado, testes de migração, teste real Android e acessibilidade.
- Corrigir entradas de decimal/teclado, confirmação de salvamento e migrações.
- Editor avançado da ficha: alterar, excluir, reordenar, duplicar e criar templates.
- Prescrição individual de séries (alvo, intervalo, descanso, tempo/cadência, carga-alvo).
- Rascunho de sessão, pausa/retomada robusta, cronômetro e áudio opcionais.

### P1 — prescrição profissional
- Divisões e programas com semanas/mesociclos, deload e calendário.
- Superséries, bi-sets, tri-sets, dropsets, rest-pause, cluster, pirâmide, myo-reps e circuitos; validade por método.
- Substituição de exercícios com histórico; filtros por equipamento e disponibilidade.
- Histórico granular por aluno/exercício, PR, melhores séries, progressão sem mudar ficha sem aprovação.
- Painel de aderência, tempo, sessões programadas versus executadas, séries semanais por grupo muscular.

### P2 — acompanhamento
- Metas, evolução corporal, fotos com consentimento, avaliações e gráficos.
- Questionários, prontidão percebida, hábitos e feedback de sessão (sem diagnóstico).
- Calendário, notificações locais, alertas de reavaliação e agenda do personal.
- Backup e restauração criptografados com migração testada.

### P3 — plataforma conectada
- Identidades separadas profissional/aluno, controles de acesso, consentimento e LGPD.
- Sincronização entre aparelhos, mensagens e notificações, agenda compartilhada.
- Cobrança mensal, recibos, contratos e relatórios exportáveis.
- Integração com Health Connect somente com consentimento e escopo mínimo.

### P4 — biblioteca oficial 3D
- **Aguardar finalização e QA** dos 500 exercícios em `dutrafg/EvoluPersonal`.
- Importação por IDs oficiais, checksum, manifesto versionado, resolução de duplicatas.
- Mídia offline em pacotes sob demanda, separada do APK; não importar GIFs reprovados.

### Critério de estabilidade
Nada é declarado pronto/estável sem build, testes e execução em Android real. Nunca publicar na `main` sem autorização.
