# EvoluTrainer — Plano de refatoração e critérios de aceite

## Diagnóstico inicial (16/10/2026)
- `index.html`: ~595 mil caracteres, 33 blocos `<style>`, 10 blocos `<script>`.
- CSS: mais de 2.400 ocorrências de `!important`; sobreposições sucessivas de temas e componentes.
- `sw.js`: identificador de cache antigo `0.64.beta-20261013`, divergente da versão exibida no HTML.
- `README.md`: descreve a versão 0.92.beta, divergente do título 1.0.beta do HTML.
- Risco principal: regressões de interface e incompatibilidade de armazenamento/backup ao separar módulos.

## Princípios
1. Não alterar chaves de armazenamento, estrutura IndexedDB, identificadores de elementos ou eventos sem migração e teste.
2. Não remover funcionalidades para simplificar a interface.
3. Evitar mudanças de produção na branch main antes de QA e confirmação.
4. Não invalidar caches offline ou alterar service worker sem testar instalação, atualização e funcionamento sem rede.
5. CSS por tokens de tema + componentes; retirar regras redundantes gradualmente e verificar os dois temas.

## Etapas
### Fase A — Inventário e proteção
- Mapear módulos, funções públicas, seletores DOM, dependências e arquivos de mídia.
- Criar testes de fumaça automatizados para navegação, inicialização, troca de tema, persistência e console.
- Exportar dados de teste antes de qualquer migração.

### Fase B — Design system
- Consolidar tokens de cor, tipografia, espaçamento, bordas e estados.
- Migrar telas progressivamente: Configurações, Clientes, Treinos, Biblioteca, Evolução, Cobranças.
- Validar em larguras 360, 390, 768 e 1280 px, em claro e escuro.

### Fase C — Modularização
- Separar CSS por tokens, base, layout e componentes sem alterar os IDs existentes.
- Extrair JS em módulos de armazenamento, domínio, navegação, treino, evolução, backups e PDF.
- Substituir listeners duplicados e evitar renderizações desnecessárias.

### Fase D — Offline, desempenho e segurança
- Revisar versão de cache e estratégia de atualização do service worker.
- Medir tempo de inicialização, tamanho de transferências e consumo de memória.
- Auditar validação de importações, sanitização de HTML e recuperação de dados.

### Fase E — QA e lançamento
- Testes de regressão por módulo, backup/restauração, sessões ativas, troca aluno/personal e importação/exportação.
- Testes em Android Chrome e Samsung Internet, desktop e PWA instalada.
- Somente após aprovação, integrar a branch de refatoração na main.

## Estado
- Branch de trabalho criada: `refactor/arquitetura-2026-10`.
- Este documento registra o diagnóstico e o plano. **Não equivale à conclusão da refatoração ou validação de produção.**

## Execução registrada em 16/10/2026
- CSS: 33 blocos inline extraídos para três folhas externas; arquivo principal agora ~27 KB de marcação HTML.
- JS: exportação PDF, importação PDF, evolução, cobranças, preços, área do aluno e núcleo SPA extraídos sem mudança intencional de lógica.
- PWA: precache atualizado para incluir arquivos externos da refatoração.
- QA estático: verificados 11 arquivos CSS/JS referenciados no HTML; os 8 JS externos passaram na verificação sintática via parser JavaScript.
- Automação: `tests/structural-smoke.cjs` e `.github/workflows/refactor-qa.yml` adicionados. **Execução do GitHub Actions ainda não confirmada.**
- **Pendências bloqueantes para produção:** teste no navegador de inicialização, treino, clientes, PDF, evolução e cobranças; backup/restauração; offline PWA; atualização de cache e validação visual em Android/desktop.
- O código está publicado na branch de refatoração, mas **não homologado para mesclagem em main**.
