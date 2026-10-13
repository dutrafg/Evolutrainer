# EvoluTrainer 0.64.beta

Aplicativo de gestão de treinos, clientes e acompanhamento de evolução, desenvolvido como **SPA/PWA estática**. Compatível com publicação no **GitHub + Vercel** e uso offline após o carregamento e armazenamento dos recursos necessários.

> **Versão:** `0.64.beta` — versão de testes. Não considerar homologada para produção até concluir testes de ponta a ponta no navegador e em dispositivos reais.

## Funcionalidades

- **Treinos:** criação, edição e execução de rotinas, registro de séries, repetições, cargas e intervalos de descanso.
- **Conclusão rigorosa:** o treino só pode ser concluído e salvo quando **todas as séries de todos os exercícios** estiverem marcadas como feitas. Enquanto houver séries pendentes, os botões de conclusão ficam desativados e mostram quantas faltam.
- **Excluir série:** botão `×` em cada série na sessão. A exclusão de uma série já concluída exige confirmação. Pelo menos uma série é preservada por exercício.
- **Concluir / trocar exercício:** botões com espaços próprios, sem sobreposição em telas pequenas; no celular ficam empilhados.
- **Meus Programas:** modelos PPL, Full Body, Upper/Lower ou personalizados, editáveis e atribuíveis a clientes com cópias independentes.
- **Biblioteca de exercícios:** catálogo de 1.230 exercícios com miniaturas e sequências ilustradas.
- **Evolução de cargas:** comparação mês a mês ou a cada três meses, filtros e exportação CSV, a partir das séries efetivamente concluídas e salvas.
- **Evolução corporal:** peso, composição, medidas, histórico e mapa anatômico.
- **Clientes e Histórico:** registros separados por cliente no armazenamento local.
- **Cobranças:** controle manual; o aplicativo **não processa pagamentos**.
- **Importação/exportação:** recursos de treino em PDF e backup/restauração conforme a compatibilidade do navegador.

## Organização dos arquivos

```text
index.html                   Página inicial do aplicativo
README.md                    Documentação
vercel.json                  Configurações para a Vercel
manifest.webmanifest         Manifesto PWA
sw.js                        Service Worker para o cache offline
robots.txt                   Política de indexação
assets/css/                  Estilos, incluindo layout responsivo
assets/js/                   Lógica do app, programas, evolução, PDF e cobranças
assets/icon-192.png          Ícone PWA de 192 px
assets/icon-512.png          Ícone PWA de 512 px
assets/anatomia-corporal.svg Mapa corporal
media/thumbs/               Miniaturas da biblioteca
media/steps/                Imagens dos exercícios
data/exercises.json          Catálogo de exercícios
```

## Publicar na Vercel usando o GitHub

1. Abra o repositório [dutrafg/Evolutrainer](https://github.com/dutrafg/Evolutrainer).
2. Na Vercel, clique em **Add New → Project** e importe o repositório.
3. Configure **Framework Preset: Other** e **Root Directory: `./`**.
4. Não é necessário configurar comando de compilação; `index.html` deve permanecer na raiz.
5. Publique e aguarde o status **Ready**. Abra a URL HTTPS gerada.
6. Verifique o catálogo, as imagens, as rotinas e o registro do Service Worker.

Se o repositório já estiver conectado à Vercel, alterações na branch `main` **normalmente** disparam uma nova implantação, desde que a integração e o deploy automático estejam ativos.

## Usar como PWA e offline

O `manifest.webmanifest` e o `sw.js` permitem instalar a aplicação em navegadores compatíveis. O Service Worker armazena a interface, os scripts, os estilos e o catálogo em cache e adiciona imagens ao cache conforme o uso.

Para usar **todas as imagens sem internet**, procure em Configurações a opção de baixar a biblioteca para uso offline e aguarde até terminar. O cache é próprio de cada dispositivo e pode ser removido pelo navegador/sistema; faça a primeira visita com internet. A instalação PWA requer HTTPS ou localhost, não basta abrir `index.html` por `file://`.

## Dados, backups e privacidade

**Os dados dos clientes não são enviados automaticamente ao GitHub, à Vercel ou a um servidor.** Eles ficam no armazenamento local do navegador e, quando autorizado e suportado, em pasta de arquivos do dispositivo. A troca de navegador, dispositivo ou endereço do site não transfere esses dados automaticamente.

- Exporte backups antes de atualizar, reinstalar ou trocar o dispositivo.
- Confira o conteúdo restaurado **antes** de apagar a fonte anterior.
- Proteja backups que contenham informações pessoais; o JSON exportado não é necessariamente criptografado.
- Os modos **Aluno** e **Personal** personalizam a interface, mas **não são um sistema de autenticação seguro** para dados em computadores compartilhados.
- O acesso offline e o armazenamento persistente dependem das permissões e capacidades do navegador.

## Testes recomendados antes da produção

1. Escolher um cliente de teste e criar uma rotina com dois exercícios de três séries.
2. Iniciar o treino e confirmar que **Concluir e salvar** fica desativado com séries pendentes.
3. Marcar cinco das seis séries; confirmar que ainda não é possível finalizar.
4. Marcar a última série; confirmar que o botão de conclusão é habilitado.
5. Desmarcar uma série; confirmar que o botão volta a ficar desativado.
6. Marcar todas novamente, concluir e verificar os dados no Histórico e no relatório de cargas.
7. Iniciar outra sessão, excluir uma série não concluída e conferir a renumeração; excluir série concluída deve pedir confirmação.
8. Testar **Concluir exercício** e **Trocar exercício** em telas de 320, 375, 390, 768 e 1440 px.
9. Testar recuperação após recarregar a página e troca de cliente, sem corromper a sessão ativa.
10. Instalar PWA em HTTPS e verificar cache, offline, restauração de backup e armazenamento IndexedDB.

**Situação:** as verificações de sintaxe e os testes automatizados isolados são executados antes da publicação. A validação em produção com IndexedDB real, PWA instalado e dispositivos Android/iOS precisa ser confirmada separadamente.

## Observações técnicas

- Front-end estático em HTML, CSS e JavaScript; **sem backend** e sem sincronização de contas.
- `assets/js/nucleo-app.js` coordena a execução e o armazenamento dos treinos; `assets/js/meus-programas.js` controla os programas reutilizáveis.
- O cache PWA usa versão `0.64.beta` para atualizar arquivos da interface, preservando o cache de mídia reutilizável quando possível.
- O histórico de sessões concluídas não é alterado pelas novas regras de finalização de treinos em andamento.