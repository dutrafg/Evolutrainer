# EvoluTrainer 1.0.RC — Backup e Segurança (QA)

## Implementações
- Novas abas **Backup** e **Segurança** no menu **Mais**, com navegação pela lógica existente de `data-tab`.
- Transferência das opções existentes de armazenamento, sincronização, migração, backup completo/individual, restauração, transferência entre dispositivos, backup diário, biblioteca offline e PWA para a aba Backup, preservando os IDs e ações originais.
- Transferência de integridade, privacidade e autoteste para Segurança.
- Adaptação **parcial e isolada** do módulo criptográfico do EvoluFisico: backup completo cifrado com **AES-256-GCM**, senha derivada por **PBKDF2-SHA-256**, 310.000 iterações, salt de 16 bytes e IV aleatório de 12 bytes por arquivo.
- Restauração criptografada com autenticação GCM, verificação do formato, validação do backup original e confirmações da rotina já existente.
- Nenhuma senha é salva no armazenamento local.
- Atualização do Service Worker para cachear `assets/js/seguranca-backup.js`.

## Testes executados
- **PASSOU:** validação estática das duas abas, IDs únicos de controles e presença das opções do menu.
- **PASSOU:** sintaxe dos scripts JavaScript do pacote local, incluindo o novo módulo.
- **PASSOU:** teste de criptografia com round-trip cifrar/decifrar, rejeição de senha incorreta e rejeição de ciphertext adulterado, em ambiente Node WebCrypto.
- **PASSOU:** leitura de confirmação dos arquivos alterados no repositório.
- **NÃO EXECUTADO:** teste de navegação em Chromium; o ambiente bloqueou tanto localhost quanto file:// com `ERR_BLOCKED_BY_ADMINISTRATOR`.
- **PENDENTE:** QA ponta a ponta no Android/PWA para exportação e restauração real com clientes, banco financeiro, arquivos grandes e atualização de cache.

## Limites e riscos
**A criptografia adicionada protege exclusivamente os backups gerados pelo botão "Baixar backup criptografado".** O IndexedDB, as pastas JSON, backups automáticos e exports antigos continuam sem criptografia. Não se deve anunciar criptografia integral dos dados em repouso. Essa migração requer projeto e testes específicos para evitar perda de dados.

Os fluxos e cálculos de treinos e a associação PT–EN não foram modificados nesta atualização. Os controles de backup existentes foram movidos no DOM sem alterar seus IDs ou funções de negócio.

## Procedimento de validação manual
1. Atualizar a PWA e fechar/reabrir, confirmando a nova versão do cache.
2. Em **Mais > Backup**, verificar todos os botões e o backup diário.
3. Em **Mais > Segurança**, gerar backup criptografado com senha de 12+ caracteres e guardar arquivo.
4. Testar arquivo adulterado ou senha incorreta: não pode restaurar.
5. Testar restauração de backup criptografado em instalação limpa, com confirmação e cópia de segurança anterior.
6. Confirmar dados e fluxos dos clientes, treinos, biblioteca PT–EN, imagens, cobranças e funcionamento offline.

**Estado: publicada em main para testes; NÃO homologada para produção.**
