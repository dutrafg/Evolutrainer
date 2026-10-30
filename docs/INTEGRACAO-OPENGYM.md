# Integração openGym — EvoluTrainer/EvoluPersonal

**Branch de trabalho:** feature/opengym-ferramentas-ptbr-20261029
**Base:** feature/pwa-hibrido-beta (sem alterações na main)
**Versão do código:** 0.1.0-beta.8

## Dados importados e origem

- Origem: https://github.com/DuarteSantos8/openGym
- Avisos e licença: https://github.com/DuarteSantos8/openGym/blob/main/NOTICE.md
- Catálogo pt-BR: 5.632 nomes de exercícios em português brasileiro; 1.324 entradas têm instruções completas pt-BR no snapshot consultado em 29/10/2026.
- Arquivo dist/catalog-open-gym.json contém **somente texto**: IDs de origem, nomes, grupo, equipamento, músculos e instruções quando existentes. Nenhuma mídia, vídeo, imagem ou endereço de mídia Gym visual foi copiado.
- Os textos marcados como oriundos do ExerciseDB v1 são sob MIT; descrições, traduções e demais textos originais do openGym são sob AGPL-3.0. Manter avisos e cumprir as condições de licenciamento de aplicativos derivados. Uso não comercial não elimina essas obrigações.
- Para animações do Gym visual em apps independentes, obter licença diretamente com a fornecedora. Não extrair, reutilizar, hotlinkar ou alimentar sistemas de IA com essas mídias.

## Implementado nesta branch

1. Nova página Ferramentas na navegação profissional e do aluno.
2. Modelos de fichas novos e editáveis: Push/Pull/Legs, Superior/Inferior, Corpo inteiro e Força 5×5.
3. Calendário de atividade dos últimos 28 dias, contagem de sessões e séries efetivas e volume total.
4. Recordes de cada exercício e estimativa de 1RM.
5. Calculadora de 1RM pelas fórmulas Epley e Brzycki, limitada a 12 repetições.
6. Calculadora simétrica de anilhas com estimativa de carga não alcançada.
7. Exportação CSV dos registros, com medidas contra fórmulas maliciosas.
8. Botão de importação opcional do catálogo textual pt-BR com 5.632 entradas, sem substituir exercícios existentes. IDs importados têm prefixo og_ e o salvamento usa a transação de dados já existente.
9. Conversor reproduzível em scripts/import-opengym-catalog.mjs.

Sistemas preexistentes de séries, timer, métodos especiais, avaliações, progressão, backups, aluno e mídia própria continuam em seus módulos originais.

## Uso

1. Faça backup criptografado dos registros.
2. Execute npm run check e npm test após baixar o projeto.
3. Acesse Ferramentas e, caso deseje, importe o catálogo textual. Por padrão, os 500 itens existentes permanecem sem carga extra do catálogo opcional.
4. Monte uma ficha inicial escolhendo aluno ou treino pessoal, e edite a prescrição de cada exercício antes de executar.

Para atualizar o catálogo posteriormente: mantenha um checkout separado do openGym e use npm run sync:opengym -- ../openGym. Essa ferramenta nunca lê catalogue/media. Revise o resultado e mantenha o aviso NOTICE-OPENGYM.md.

## Ainda não implementado

- Importadores diretos para históricos de Strong, Hevy e FitNotes com correspondência de exercícios.
- Progressão automática customizável, regras Greyskull e metas por período.
- Sincronização multi-dispositivo por servidor e tratamento de conflitos.
- Health Connect e outras integrações nativas.
- Controle avançado de periodização por rotação e equipamentos; avaliação comparativa ampliada.
- Treinador IA e conectores de serviços.
- Compilação e testes completos de APK desta branch.

Nenhum recurso pendente deve ser apresentado como pronto. Não incorporar a main antes de testes e aprovação.
