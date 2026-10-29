# EvoluPersonal — Fase 1: fundação

Esta fase corresponde às etapas 1–5 da captura fornecida: arquitetura/validação técnica, dados/segurança/persistência, interface/identidade, inicialização/configurações e gestão de alunos. O diagnóstico anterior é um insumo; esta entrega implementa as funcionalidades.

## Implementação

| Etapa | Resultado no código |
|---|---|
| 1. Arquitetura Android | Kotlin/Compose/Material 3, Room v3, aplicação offline, CI com build e testes, esquema exportado e versionado |
| 2. Dados e recuperação | Migrações v1→v2→v3 sem descarte; exportação completa; backup AES-256-GCM com chave derivada de senha por PBKDF2-HMAC-SHA256 (210.000 iterações e salt aleatório); restauração validada e transacional |
| 3. Identidade e interface | Nome EvoluPersonal, ícone próprio, versão extraída do build, temas claro/escuro, navegação inferior em telas compactas e lateral a partir de 600 dp, grade adaptável de alunos |
| 4. Primeiro acesso | Nome profissional, experiência, objetivo, equipamentos e descanso padrão; gravação confirmada no Room; migração do nome/tema previamente salvos; edição posterior no Perfil |
| 5. Alunos | Cadastro com confirmação de gravação, pesquisa por nome sem distinção de acentos/caixa, filtros Todos/Ativos/Inativos, edição pelo mesmo ID, inativação/reativação e histórico individual |

## Regras de dados

- O backup contém perfil/preferências, alunos, exercícios manuais, fichas, itens, sessões abertas/concluídas e séries, mantendo os IDs.
- Exportação lê todas as sessões, independentemente da quantidade. A consulta do histórico deixou de cortar em 30 sessões.
- O arquivo deve ter até 20 MB; senhas de pelo menos oito caracteres. A senha não é salva no banco nem no arquivo.
- Android Storage Access Framework permite escolher o local do backup e selecionar um arquivo sem permissão ampla de armazenamento.
- Formato, versão, campos, tipos, limites, duplicações e referências são verificados antes de qualquer substituição. Uma falha durante a transação desfaz todas as alterações.
- A restauração exige confirmação explícita de substituição dos dados atuais. Cancelamento não altera o banco.
- Perfil e preferências estão no mesmo banco; a restauração é atômica também para esses dados.
- Aluno inativo mantém fichas e histórico. Novos vínculos/inícios são bloqueados; sessão que já estava aberta pode ser retomada e concluída.
- O banco local permanece protegido pelo armazenamento privado do Android; o backup possui criptografia própria. Não há promessa de criptografia adicional do arquivo SQLite.

## Smartphone e tablet

- A largura disponível determina a navegação; não depende da identificação física do aparelho.
- Listagem em grade com cartões de largura mínima 300 dp; filtros podem quebrar linha.
- Perfil com largura máxima de 680 dp, rolagem e compensação do teclado.
- Rascunhos de perfil/aluno são preservados em recriação. Senhas de backup permanecem apenas em memória e devem ser digitadas novamente após recriação.
- Botão Voltar retorna do perfil individual à lista sem descartar dados já salvos.

## Testes automáticos

- Criptografia: ida/volta, aleatoriedade, senha errada, adulteração, arquivo truncado e senha curta.
- Migração: bancos v1 e v2 com registros, atualização para v3, validação Room, reabertura e preservação de IDs, carga, aluno e sessão aberta.
- Recuperação: todas as tabelas, 35 sessões, sessão aberta, rejeição de referências inválidas e arquivo sem campos.
- Falha SQL simulada durante a restauração para comprovar rollback integral.
- Edição/inativação/reativação sem perda de sessões, séries ou vínculo da ficha.
- Interface Compose em smartphone retrato/paisagem e tablet retrato/paisagem: primeiro acesso, cadastro e pesquisa.
- Testes preexistentes de cálculo e sugestões preservados.

Resultados da execução final devem ser consultados no GitHub Actions da branch feature/android-nativo-base. Esta documentação não substitui a evidência do CI.

## Homologação em aparelho

Os testes de interface usam Robolectric. Ainda é necessária execução em smartphone e tablet físicos para homologar teclado real, leitor de tela, fontes ampliadas, rotação durante edição, seletor de documentos, concessão de acesso por provedor de arquivos e interrupção por encerramento do processo.

Roteiro: salvar perfil → reabrir → cadastrar/editar aluno → atribuir ficha → registrar/concluir sessão → inativar/reativar → exportar backup → alterar dados → restaurar → conferir perfil, aluno, ficha, séries e sessão. Repetir com senha errada e arquivo corrompido; os dados devem permanecer inalterados. Não usar dados únicos sem cópia durante homologação.

## Escopo preservado

Nenhuma importação ou geração da biblioteca 3D. Nenhuma alteração na main. Nenhuma sincronização online ou funcionalidade das fases 2–4 foi declarada entregue por esta fase.

## Referências técnicas

- Migrações e esquemas Room: https://developer.android.com/training/data-storage/room/migrating-db-versions
- Classes de tamanho de janela: https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes
- Adaptação a tamanhos de tela: https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes
