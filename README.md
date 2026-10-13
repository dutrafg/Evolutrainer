# EvoluTrainer v6.3 PT-BR

Aplicativo web de gestão de **clientes, treinos, biblioteca de exercícios, histórico, evolução corporal e cobranças**, preparado para publicação como site estático na **Vercel** e instalação como **PWA (Progressive Web App)**.

> **Versão:** v6.3 PT-BR — Este pacote não altera a numeração do aplicativo.

## Funcionalidades

- **Clientes:** cadastro e seleção de perfis, com treinos e registros individuais.
- **Treinos:** criação de rotinas, importação de PDF, execução presencial, séries, cargas, repetições e descanso.
- **Biblioteca:** catálogo de 1.230 exercícios com pesquisa e recursos visuais.
- **Histórico e Evolução:** sessões realizadas, calendário, registros corporais e relatórios.
- **Cobranças:** controle manual de serviços, valores e pagamentos; não processa pagamentos reais.
- **Configurações:** aparência, modos de interface, backup/restauração e recursos offline.
- **Modos Personal e Aluno:** interfaces diferentes; a seleção de modo **não é autenticação segura**.

## Publicação na Vercel

1. Extraia **todo o ZIP**, preservando os diretórios.
2. Acesse [vercel.com](https://vercel.com/) e crie um projeto para este site estático.
3. Utilize a pasta que contém `index.html` e `vercel.json` como raiz do projeto.
4. Se solicitado, selecione **Framework Preset: Other**; não configure um comando de build.
5. Publique e acesse o endereço **HTTPS** gerado pela Vercel.
6. Verifique se os módulos abrem e se as imagens dos exercícios são carregadas.

**Importante:** não publique apenas `index.html`; envie também `assets/`, `data/`, `media/`, `sw.js`, `manifest.webmanifest` e `vercel.json`.

## Estrutura dos arquivos

```text
/
├── index.html                # Entrada do aplicativo
├── README.md                 # Este documento
├── vercel.json               # Cabeçalhos e configuração de hospedagem
├── manifest.webmanifest      # Manifesto do PWA
├── sw.js                     # Service Worker e cache offline
├── assets/
│   ├── css/                  # 4 folhas de estilo
│   ├── js/                   # 8 scripts organizados por responsabilidade
│   ├── anatomia-corporal.svg # Referência para medidas corporais
│   └── icon-*                # Ícones da aplicação
├── data/
│   └── exercises.json        # Catálogo dos exercícios
├── media/
│   ├── thumbs/               # Miniaturas
│   └── steps/                # Imagens/animações dos movimentos
├── IMPLEMENTACAO.md          # Detalhes técnicos da implementação
├── QA-CHECKLIST.md           # Verificações realizadas e pendentes
└── LEIA-ME.txt               # Instruções resumidas
```

Os scripts estão separados em arquivos, mas ainda compartilham parte do escopo JavaScript original. Essa organização **não equivale** a uma reescrita completa com `import`/`export` ES Modules.

## PWA e funcionamento offline

O projeto inclui manifesto, ícones e Service Worker:

- A interface principal e o catálogo são armazenados em cache para uso offline após o carregamento inicial.
- As mídias podem ser armazenadas sob demanda.
- Para preparar **todas as imagens e animações** para uso sem internet, acesse **Configurações → PWA e biblioteca offline → Baixar biblioteca completa para uso offline** e aguarde a conclusão.
- O primeiro acesso e o preenchimento inicial do cache exigem conexão.
- O funcionamento offline depende do armazenamento disponível; o navegador/sistema pode limpar o cache.
- A instalação PWA requer **HTTPS** (ou `localhost` em ambiente de desenvolvimento). Abrir o arquivo por `file://` não oferece instalação de Service Worker.

## Como usar no PC e no celular

1. Publique o aplicativo na Vercel.
2. Abra a URL no navegador do computador ou do celular.
3. No dispositivo, use a opção de instalação do navegador, quando oferecida.
4. Antes de ficar offline, baixe a biblioteca completa de mídias no **próprio dispositivo**.
5. Para continuar um acompanhamento iniciado em outro aparelho, **exporte o backup no aparelho antigo e restaure no novo**.

### Armazenamento e segurança dos dados

- A Vercel hospeda os arquivos estáticos; **não** há sincronização automática de clientes, histórico ou cobranças entre dispositivos.
- Os registros permanecem no armazenamento local do navegador (IndexedDB) e, quando compatível e autorizado, em pasta local.
- Ao migrar do HTML aberto no computador para o domínio HTTPS, **os dados do navegador antigo não são transferidos automaticamente**.
- Faça **backups externos frequentes** e confira a restauração antes de apagar os dados de origem.
- Os arquivos de backup JSON não são criptografados por padrão: armazene-os em local protegido.
- O backup automático às 22h depende do aplicativo aberto; quando reaberto, o app verifica backups pendentes.
- Não utilize a escolha entre Aluno e Personal como mecanismo de proteção de informações em dispositivos compartilhados.

## Desenvolvimento local

Para testar os arquivos sem publicar, execute um servidor HTTP local na raiz do projeto:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`. Evite abrir `index.html` diretamente com `file://` para testes de PWA e armazenamento.

## Checklist de validação após a publicação

- [ ] Abrir o site por HTTPS, sem erros no console.
- [ ] Entrar no modo Personal e escolher/restaurar um cliente.
- [ ] Importar um treino por PDF; recarregar e confirmar a persistência.
- [ ] Iniciar uma sessão, registrar séries, concluir e salvar.
- [ ] Verificar Histórico, Evolução, mapa corporal e Cobranças.
- [ ] Confirmar que as miniaturas e animações carregam.
- [ ] Testar instalação do PWA em Android, iOS e desktop, quando compatível.
- [ ] Executar o download da biblioteca offline e testar sem rede.
- [ ] Testar backup e restauração entre computador e celular.
- [ ] Verificar separação de dados entre clientes.

**Situação dos testes:** a sintaxe dos scripts, referências de mídia e integridade do pacote foram verificadas na preparação da v6.3. A instalação PWA real, o IndexedDB em produção e os testes de ponta a ponta precisam ser confirmados no domínio publicado. Consulte `QA-CHECKLIST.md` para os detalhes.

## Documentação complementar

- `IMPLEMENTACAO.md` — arquitetura e verificações técnicas.
- `QA-CHECKLIST.md` — testes já feitos, pendências e riscos.
- `LEIA-ME.txt` — instruções rápidas de publicação.

## Novidades v6.3

- Meus Programas: modelos PPL, Full Body, Upper/Lower e personalizados, com atribuição por cliente.
- Evolução de Cargas: agrupamento mês a mês e de três em três meses.
- Calendários responsivos centralizados para Treinos, Clientes e Evolução.
- Interface índigo/grafite, com ícones SVG de navegação e ajustes de contraste.
- O armazenamento dos clientes permanece local no dispositivo.

## Correção de séries — manutenção da v6.3

- **Treino em andamento:** cada série agora tem um botão **×** para excluir aquela série, renumerando automaticamente as restantes.
- Séries já concluídas exigem confirmação antes de excluir.
- **Editar rotina:** utilize **− Série**, ou **×** nas metas individuais, e salve a rotina.
- **Meus Programas:** utilize **− Série** para reduzir a quantidade antes de salvar.
- Uma série mínima é preservada por exercício; o histórico de sessões finalizadas não é alterado.

**QA:** todos os nove scripts passaram no verificador de sintaxe. Testes isolados cobriram confirmação, renumeração, último item, alteração de metas e persistência simulada. Verificação visual no Chromium em 320, 375, 390, 768 e 1440 px sem transbordamento das linhas. Testes end-to-end do aplicativo completo/IndexedDB permanecem pendentes porque a navegação a localhost foi bloqueada neste ambiente.
