# EvoluPersonal — beta híbrido

Nova implementação web/PWA + APK Android com Capacitor 8, em `feature/pwa-hibrido-beta`. O Android nativo anterior está preservado em `feature/android-nativo-base`. A `main` não foi substituída.

## Executar e compilar

Node 22+, Java 21, Android SDK 36. `npm ci`, `npm run check`, `npm test`, `npm run build`, `npx cap sync android`. A compilação automatizada usa Gradle 8.14.3 e gera APK debug beta para Android 10+.

O APK usa `br.com.evolupersonal.hibrido`, origem local `https://localhost` e arquivos web incluídos no pacote. Versão atual: `0.1.0-beta.6`, versionCode `1001`. Para atualizar este beta, manter identificador, origem e assinatura e aumentar versionCode. Não desinstalar para atualizar. A assinatura é fixa de **desenvolvimento**, exclusiva dos betas; a chave de teste não é identidade de produção. Não atualiza diretamente o aplicativo Kotlin anterior, que possui outro armazenamento e assinatura.

## Escopo beta

Perfil/primeiro acesso, alunos, catálogo de 500 exercícios por IDs canônicos, fichas, prescrição, métodos, sessões, histórico, progressão explicável, volume muscular, periodização, agenda, avaliações/fotos consentidas, mensagens/feedback por pacotes criptografados, mensalidades, CSV/impressão e backup AES-GCM. PWA instalável nos navegadores compatíveis; APK permite lembretes locais após concessão de permissão.

## Limites reais

- A revisão disponível no repositório de mídia aponta 445 vínculos, 55 ausências e 155 revisões visuais pendentes. O catálogo de 500 nomes é incluído, mas as animações não são declaradas aprovadas e não são geradas novamente. Conteúdo externo pendente não é silenciosamente aprovado para preencher o beta.
- Compartilhamento entre profissional e aluno por arquivos criptografados, com importação explícita de retorno. Não há servidor de mensagens nem sincronização online automática. O espaço do aluno usa `student.html` e um documento IndexedDB separado, e recebe apenas os dados do próprio aluno. Essa separação local não substitui autenticação de servidor.
- Não há login de nuvem, cobrança bancária automática ou atualizador OTA. Atualização Android por APK assinado com a mesma chave. PWA usa service worker com atualização confirmada, sem recarregar durante sessão/rascunho.
- Backups desta base não importam automaticamente bancos Room/Kotlin ou dados do EvoluFísico2. O reinício é uma base nova.
- IndexedDB mantém os dados locais; o backup é criptografado por senha. O banco local não recebe criptografia adicional por este beta. Limpeza dos dados do site remove o armazenamento local; manter cópias.

Os aprendizados do EvoluFísico2 foram aplicados nos fluxos de salvamento confirmado, responsividade, isolamento de temas, IDs permanentes, atualização controlada e recuperação transacional. Não houve cópia integral da interface/código legado.

