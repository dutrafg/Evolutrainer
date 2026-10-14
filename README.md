# EvoluTrainer — 1.1.beta

Aplicativo de gestão de treinos, clientes e acompanhamento físico para profissionais de educação física e seus alunos. Construído como **SPA/PWA estática**, com interface em português brasileiro e armazenamento predominantemente local.

**Site:** https://evolutrainer.vercel.app/  
**Repositório:** https://github.com/dutrafg/Evolutrainer

> **Status:** versão beta em evolução. Não considerar homologada para produção sem testes funcionais, visuais, de segurança e de recuperação de dados em navegadores e dispositivos reais.

## Design

A versão 1.1.beta utiliza um **redesign inspirado na linguagem visual de plataformas modernas de gestão de treinos**, incluindo a Welltrainer como referência de organização, mas preservando o nome, os fluxos e a identidade do EvoluTrainer.

- Paleta preta/grafite e amarelo-dourado (`#FFD54A`) para ações principais.
- Cartões e campos com bordas discretas e cantos levemente arredondados.
- Layout responsivo para celulares, tablets e desktops.
- Temas claro e escuro, com atenção à legibilidade dos controles.
- Estilos aplicados sobre a aplicação completa, sem substituir seus módulos por telas demonstrativas.

## Funcionalidades principais

- **Clientes:** cadastro, seleção e gerenciamento de alunos, com dados locais.
- **Treinos:** criação e execução de rotinas, séries, repetições, cargas, descansos e registro de sessões.
- **Meus Programas:** criação, edição e organização de programas de treino.
- **Biblioteca de exercícios:** catálogo com categorias e recursos visuais, sujeitos à disponibilidade dos arquivos de mídia.
- **Evolução:** acompanhamento de cargas e volumes, comparações por períodos e histórico.
- **Área do aluno:** visão de treinos, histórico e indicadores de evolução.
- **Avaliações e medidas:** registros de evolução corporal.
- **Cobranças:** organização e acompanhamento manual.
- **PDF:** exportação de treinos e relatórios e fluxo de importação compatível com os formatos implementados.

A disponibilidade de recursos varia conforme permissões do navegador, armazenamento, dados existentes e compatibilidade do dispositivo.

## Estrutura do projeto

```text
index.html                         # Entrada da aplicação web
assets/                            # Ícones, imagens e JavaScript complementar
assets/js/meus-programas.js        # Módulo de programas e evolução
data/exercises.json                # Base de exercícios
media/                             # Miniaturas e sequências de exercícios
manifest.webmanifest               # Metadados de instalação PWA
sw.js                              # Service Worker para recursos offline
vercel.json                        # Configuração de implantação
README.md                          # Documentação
```

Os diretórios de mídia e os arquivos de dados devem ser mantidos junto ao `index.html` para que as imagens e os exercícios sejam carregados corretamente.

## Executar localmente

Para testar a aplicação como site, use um servidor HTTP local a partir da raiz do projeto:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080` no navegador. Abrir diretamente por `file://` pode limitar o carregamento de arquivos, o Service Worker e APIs de acesso a pastas. O suporte a algumas APIs também depende de HTTPS, permissões e navegador.

## Publicação na Vercel

1. Importe este repositório no painel da Vercel.
2. Use a raiz do repositório como diretório do projeto.
3. Publique como aplicação estática, preservando `vercel.json`, `assets/`, `data/` e `media/`.
4. Após a implantação, verifique carregamento, navegação, recursos de mídia e atualização do cache PWA.

Se o navegador continuar exibindo estilos antigos, atualize a página e verifique o cache do Service Worker.

## Armazenamento e privacidade

O aplicativo usa mecanismos de armazenamento do navegador, como IndexedDB e localStorage, conforme o módulo. **Não há garantia de sincronização entre aparelhos**. Limpeza de dados do navegador, modo privado e troca de dispositivo podem causar perda de registros. Exporte backups regularmente e não armazene dados reais de clientes sem avaliar consentimento, controle de acesso e conformidade com a LGPD.

## Checklist de validação

- Navegação por todos os módulos nos modos claro e escuro.
- Responsividade em larguras de celular, tablet e desktop.
- Cadastro, edição, seleção e persistência de clientes.
- Criação e execução de treinos, conclusão e histórico.
- Biblioteca: filtros, miniaturas, GIFs e arquivos ausentes.
- Exportação e importação de PDF com arquivos reais.
- Programas, evolução de cargas e relatórios.
- Operação offline, atualização do Service Worker e recuperação de backup.
- Inspeção de erros no console, acessibilidade e segurança de entradas.

**Nota de QA:** na atualização do redesign foram verificadas a presença dos estilos e a sintaxe dos scripts embutidos; isso **não substitui testes ponta a ponta** em navegadores reais.

## Versionamento

A identificação atual é **1.1.beta**. As próximas alterações funcionais devem seguir a sequência combinada de versões beta, incluindo a transição de `0.99.beta` para `1.0.beta`.

## Créditos

EvoluTrainer é um projeto próprio. Welltrainer foi usada apenas como **referência de linguagem visual**, sem vínculo ou afiliação.

## GIFs aprovados — 1.1.beta

Foram incorporados 166 GIFs aprovados no protótipo. Somente ilustrações provisórias foram substituídas; IDs, nomes, mídias já existentes e dados dos clientes foram preservados. Fontes e correspondências estão em `data/gifs-aprovados.json`. A nova revisão do catálogo sincroniza as miniaturas no IndexedDB; o cache do catálogo usa rede com fallback offline.
