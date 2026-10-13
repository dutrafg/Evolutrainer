# QA — EvoluTrainer v6.0

## Estrutura e integridade (automatizado)
- [x] 1.230 exercícios, IDs e dados preservados no JSON
- [x] 2.947 arquivos de mídia com referências existentes no catálogo
- [x] HTML, CSS, JS e SVG modularizados; ausência de base64 de mídia no HTML
- [x] Manifesto PWA, ícones 192/512, Service Worker e configuração da Vercel
- [ ] Gravação real de cliente, treino, evolução e cobrança em IndexedDB na origem de produção
- [ ] Fluxo de backup e restauração entre file:// e HTTPS
- [ ] Instalação PWA no Android/Chrome, Safari/iOS e desktop
- [ ] Download de todas as mídias e teste com rede completamente desligada
- [ ] Testes físicos de vibração em Android; Safari iOS não oferece vibração web
- [ ] Testes de automação de ponta a ponta em navegadores-alvo, após publicação
- [x] Renderização isolada da tela inicial em 390, 820, 1440 e 1920 px, sem transbordamento horizontal
- [x] Sintaxe JavaScript validada em todos os arquivos (`node --check`)
- [x] Integridade do ZIP verificada com CRC

**Limitação de ambiente:** a navegação do Chromium no endereço HTTP local retornou `net::ERR_BLOCKED_BY_ADMINISTRATOR`; por isso, o registro real do Service Worker, PWA instalado, fluxo de IndexedDB e o teste offline real permanecem pendentes.

## Verificação manual de aceite
1. Entrar em Personal e selecionar um cliente existente após restauração.
2. Importar um treino em PDF, recarregar, confirmar persistência.
3. Iniciar sessão; confirmar que outras abas ficam bloqueadas; registrar séries e concluir/salvar.
4. Conferir Histórico, Evolução, medidas e miniaturas.
5. Em Cobranças, criar lançamento de R$ 25,00 e exportar backup.
6. Em Configurações, baixar biblioteca completa e testar offline em um novo acesso.
7. Exportar cliente no PC e restaurá-lo no celular.
8. Trocar modo Aluno/Personal e tema claro/escuro.
9. Verificar se os backups e as sessões pertencem apenas ao cliente correto.

## Riscos conhecidos
O banco de dados do domínio Vercel não compartilha automaticamente dados com o arquivo HTML local; armazenamento do navegador pode ser apagado pelo usuário; backups JSON não são criptografados; PWA não é autenticação segura.
