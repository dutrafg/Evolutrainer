# EvoluTrainer v6.0 PT-BR — Preparação Vercel/PWA

## Implementado

- SPA estática preservando módulos Treinos, Clientes, Biblioteca, Histórico, Evolução, Cobranças e Configurações.
- CSS dividido em 4 arquivos e JavaScript dividido em 8 arquivos por responsabilidade, mantendo compatibilidade com funções globais existentes.
- Catálogo externo JSON com 1.230 IDs de exercícios preservados.
- 2.947 mídias extraídas em `media/thumbs/` e `media/steps/`, sem exigir baixar ~48 MB de base64 na entrada.
- Figura anatômica `assets/anatomia-corporal.svg` compartilhada pelo mapa e formulário de medidas.
- PWA `manifest.webmanifest`, ícones instaláveis e `sw.js` com cache da interface + catálogo; mídias em cache sob demanda.
- Opção em Configurações para guardar a biblioteca completa offline com indicador de progresso.
- Configuração estática e cabeçalhos HTTP em `vercel.json`.

## Verificações feitas

- [x] Sintaxe de todos os 8 scripts e do Service Worker: `node --check`.
- [x] Referências de todos os 1.230 exercícios aos 2.947 arquivos de mídia; nenhum recurso faltante.
- [x] Integridade dos dados: IDs únicos; formatos GIF e WebP verificados na extração.
- [x] Lógica do Service Worker testada com ambiente simulado (instalação, atualização, cache e reutilização).
- [x] Tela de entrada com estilos completos em 390, 820, 1440 e 1920 px; sem transbordamento horizontal.
- [x] ZIP verificado, arquivos organizados na raiz.
- [ ] Teste real de instalação PWA: navegação local bloqueada por política do ambiente Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`).
- [ ] Testes reais de IndexedDB, importação de PDF e restauração após publicação HTTPS.
- [ ] Teste de download completo das mídias offline em smartphones reais (depende da quota local).

## Limitações e proteção dos dados

A Vercel hospeda apenas arquivos estáticos. Clientes, treinos, históricos, avaliações e cobranças continuam armazenados localmente em IndexedDB e/ou pasta autorizada pelo usuário; não há backend de sincronização entre aparelhos. Fazer backup pelo navegador antigo e restaurar no domínio HTTPS é necessário. O cache offline pode ser removido pelo sistema; um backup JSON externo é indispensável. A seleção entre Aluno e Personal não constitui controle de acesso seguro para dispositivos compartilhados.

O SVG anatômico preserva a arte raster embutida em um contêiner SVG; não é vetorização de contornos musculares.
