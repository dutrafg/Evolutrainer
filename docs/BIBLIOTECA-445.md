# Importação dos 445 exercícios e GIFs — beta 4

Origem fixada: dutrafg/EvoluPersonal, revisão 106e53d564999eed86bf6f8c68cb3cf37f9cd836, production/INVENTARIO_MD500.json. 445 vínculos, 442 GIFs únicos por SHA Git. Três reutilizações de arquivo são preservadas e não significam aprovação da correspondência. Estados de revisão originais são mantidos.

A importação automática acrescenta os 445 exercícios vinculados e atualiza somente os metadados de mídia dos registros existentes; preserva notas, favoritos, IDs e fichas. Os 55 restantes do catálogo de 500 não são removidos se já existirem no cadastro. Novos perfis recebem os 445 vinculados. A área do aluno conserva apenas o subconjunto compartilhado.

Cada mídia é copiada para media/SHA.gif e verificada por assinatura GIF e SHA Git durante a compilação. O APK contém todos os arquivos; a versão web carrega sob demanda e oferece download explícito de cerca de 135 MB para uso offline, com retomada dos arquivos concluídos. Nenhuma mídia é baixada de terceiros em execução no APK. O backup inclui vínculos, não duplica os binários. Arquivos originais e status de revisão não foram modificados.

27 testes automatizados passaram, incluindo importação idempotente, preservação do cadastro, contagem exata de vínculos/arquivos e isolamento do aluno. Homologação visual e em aparelhos físicos permanece separada.

Como a origem é privada, o fluxo completo de exportação e APK fica na branch integration/evolupersonal-beta4-media de dutrafg/EvoluPersonal, workflow export-app-beta4.yml. Ele lê a origem local, verifica todos os binários e compila a revisão fixada do aplicativo. A CI de Evolutrainer executa QA sem depender de credenciais de outro repositório. As duas main permanecem intactas.
