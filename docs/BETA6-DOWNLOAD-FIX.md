# Beta 6 — correção do download

Reproduzido pela interface: Illegal invocation ao executar a função fetch armazenada como propriedade de MediaDownloads. A chamada era ligada ao gerenciador, enquanto o navegador exige o contexto global. Corrigido por função intermediária e teste que exige esse contexto.

Download exibe estado de conexão imediatamente e identifica resposta HTTP. Android usa transporte oficial CapacitorHttp para transferência binária com timeout e validação do endereço; retorno base64 convertido sem alterar bytes. Integridade GIF/SHA permanece obrigatória antes de gravar. Aplicação segue leve, sem GIFs no APK. Dados de alunos e fichas não são modificados.

Armazenamento web possui alternativa IndexedDB quando Cache Storage não está disponível. Testes cobrem contexto fetch, bytes do transporte nativo, respostas HTTP, pausa e retomada. Homologação física não foi executada nesta sessão.
