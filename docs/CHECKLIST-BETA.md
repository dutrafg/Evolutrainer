# Checklist das 4 fases e 20 etapas

Beta híbrido 0.1.0-beta.1. Estado antes da validação final; cada linha deve ser conferida no código e nos testes, sem usar resultados do Android Kotlin como aprovação da nova base.

| Etapa | Implementação e limite |
|---|---|
| 1 Arquitetura | HTML/CSS/ES modules, Capacitor 8, Android 10+, CI com QA e APK |
| 2 Dados | IndexedDB transacional, revisão para impedir sobrescrita entre abas, migração v1→v2, backup AES-GCM validado |
| 3 Interface | Identidade própria, claro/escuro, navegação responsiva e formulários acessíveis |
| 4 Inicialização | Nome obrigatório e perfil persistido antes de liberar a aplicação |
| 5 Alunos | Cadastro, pesquisa, edição, inativação, equipamento, disponibilidade, notas e fichas |
| 6 Biblioteca | Exercícios próprios e importação idempotente do MD500, busca e favoritos |
| 7 Construtor | Fichas, atribuição, duplicação independente, ordenação, arquivamento e prescrições |
| 8 Prescrição | Séries, faixa, carga, RIR/RPE, descanso, cadência, duração, notas, método e bloco |
| 9 Execução | Registro persistente, pausa/retomada, substituição, revisão e conclusão segura |
| 10 Métodos | Supersérie/bi/tri, drop, rest-pause, cluster, circuito, HIIT, EMOM e AMRAP configuráveis; execução/registro manuais guiados |
| 11 Histórico | Snapshot da sessão, nomes, prescrições, séries, pausas e substituições |
| 12 Desempenho | Gráficos por aluno/exercício de volume, carga e estimativa de 1RM |
| 13 Progressão | Três sessões recentes, regras explicadas e nenhuma carga aplicada automaticamente |
| 14 Volume | Séries diretas/indiretas, dias de estímulo, fadiga relatada, intervalo de referência configurável |
| 15 Periodização | Mesociclos com semanas editáveis, modelos linear/ondulatório, deload e aplicação confirmada em cópias |
| 16 Agenda | Calendário, compromissos, repetição semanal, presença/falta/cancelamento e lembretes no APK |
| 17 Avaliações | Medidas opcionais, foto com consentimento, hábitos, energia/sono e reavaliação na agenda |
| 18 Área do aluno | Pacote filtrado, armazenamento separado, feedback e retorno criptografados; sincronização manual, sem servidor online |
| 19 Gestão | Mensalidades, ocultação de valores, CSV, impressão/PDF pelo navegador, backup/restauração e limites de acesso do pacote |
| 20 Biblioteca 3D/QA | Catálogo 500 importável e revisão local; conteúdo de mídia pendente na origem (55 ausências/155 revisões). QA e APK beta; não declarar biblioteca integralmente concluída |

## Pendências externas que impedem afirmar as 20 etapas integralmente encerradas

1. Vinculação e aprovação visual/biomecânica da biblioteca de animações pelo fluxo separado de mídia.
2. Homologação em smartphone/tablet físicos, permissões, compartilhamento nativo, lembretes, teclado e atualização real por cima.
3. Uma plataforma com contas e sincronização automática exige backend/autenticação; o beta implementa a alternativa offline de compartilhamento explícito, sem simular proteção de servidor.
