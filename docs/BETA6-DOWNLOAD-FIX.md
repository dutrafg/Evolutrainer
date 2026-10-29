# Beta 6 — correção do download

Reproduzido pela interface: Illegal invocation ao executar a função fetch armazenada como propriedade de MediaDownloads. A chamada era ligada ao gerenciador, enquanto o navegador exige o contexto global. Corrigido por função intermediária e teste que exige esse contexto.

Download exibe estado de conexão imediatamente e identifica resposta HTTP. Android usa transporte oficial CapacitorHttp para transferência binária com timeout e validação do endereço; retorno base64 convertido sem alterar bytes. Integridade GIF/SHA permanece obrigatória antes de gravar. Aplicação segue leve, sem GIFs no APK. Dados de alunos e fichas não são modificados.

Armazenamento web possui alternativa IndexedDB quando Cache Storage não está disponível. Testes cobrem contexto fetch, bytes do transporte nativo, respostas HTTP, pausa e retomada. Homologação física não foi executada nesta sessão.

Sondagem pública confirmou HTTP 200 e GIF89a, mas sem Access-Control-Allow-Origin: os arquivos _headers não produziram CORS nesse serviço. Web agora busca /media/ na mesma origem da aplicação; o pacote web contém as mídias no servidor, sem pré-baixá-las na instalação. Android usa CapacitorHttp e conserva o User-Agent real do WebView pelo parâmetro x-cap-user-agent previsto no SDK. Nenhuma verificação TLS é desabilitada.
