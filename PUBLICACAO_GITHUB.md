# Publicar EvoluTrainer v6.0 PT-BR no GitHub

Destino identificado na sua conta: **https://github.com/dutrafg/Evolutrainer**.

**Atenção:** esse repositório está **público**. Examine a licença e os direitos de redistribuição das imagens/GIFs antes de enviar. Não inclua backups de clientes, documentos, tokens ou senhas no diretório.

## No Windows (recomendado)

1. Instale o [Git para Windows](https://git-scm.com/download/win) se ainda não estiver instalado.
2. Extraia **todo o ZIP** para uma pasta no PC. Não execute scripts dentro do ZIP compactado.
3. Abra `PUBLICAR_NO_GITHUB.bat`.
4. Confirme que você quer enviar os arquivos ao repositório **público**.
5. Quando o Git solicitar, autentique-se na conta GitHub que tem permissão de escrita em `dutrafg/Evolutrainer`.
6. Aguarde `PUBLICACAO CONCLUIDA` e abra o endereço do repositório.

O script usa `git init`, `git add`, `git commit` e `git push`. Não inclui senhas/tokens e não força sobrescrita de commits remotos.

## Pelo terminal (alternativa)

Na pasta extraída do projeto:

```powershell
git init -b main
git remote add origin https://github.com/dutrafg/Evolutrainer.git
git add .
git commit -m "Publicar EvoluTrainer v6.0 PT-BR"
git push -u origin main
```

Se o repositório remoto já tiver commits, não execute `--force`; primeiro verifique o histórico e concilie as mudanças.

## Depois de publicar

- Confirme `README.md`, `index.html`, `sw.js`, `manifest.webmanifest`, `assets/`, `data/` e `media/` no GitHub.
- Para hospedar na **Vercel**, conecte esse repositório à Vercel e selecione o framework **Other**.
- A publicação do código no GitHub **não hospeda os dados pessoais dos clientes**; esses dados ficam no armazenamento local do navegador ou na pasta autorizada.
- O aplicativo permanece na **versão v6.0 PT-BR**, sem renomeação.
