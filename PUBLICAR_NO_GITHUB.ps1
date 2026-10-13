# EvoluTrainer v6.0 PT-BR | Publicacao no repositorio EXISTENTE do GitHub
# Nao solicita nem armazena token, senha ou chave de acesso.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$repo = 'https://github.com/dutrafg/Evolutrainer.git'
$repoDisplay = 'https://github.com/dutrafg/Evolutrainer'

function VerificarUltimoComando($mensagem) {
    if ($LASTEXITCODE -ne 0) { throw $mensagem }
}

try {
    Write-Host '===================================================' -ForegroundColor Cyan
    Write-Host ' EvoluTrainer v6.0 PT-BR | Publicar no GitHub' -ForegroundColor Cyan
    Write-Host '===================================================' -ForegroundColor Cyan
    Write-Host "Destino: $repoDisplay"
    Write-Host 'ATENCAO: o repositorio existente e PUBLICO.' -ForegroundColor Yellow
    Write-Host 'Os arquivos que voce enviar poderao ser acessados por outras pessoas.' -ForegroundColor Yellow
    Write-Host ''

    $resposta = Read-Host 'Deseja enviar todos os arquivos do aplicativo ao repositorio PUBLICO? (S/N)'
    if ($resposta -notin @('s','S','sim','SIM','Sim')) {
        Write-Host 'Publicacao cancelada. Nenhum arquivo foi enviado.'
        exit 0
    }

    if (!(Test-Path -LiteralPath 'index.html') -or !(Test-Path -LiteralPath 'sw.js') -or !(Test-Path -LiteralPath 'manifest.webmanifest') -or !(Test-Path -LiteralPath 'README.md')) {
        throw 'Faltam arquivos obrigatorios. Extraia o ZIP COMPLETO antes de executar este script.'
    }
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git nao encontrado. Instale o Git para Windows em https://git-scm.com/download/win e execute novamente.'
    }

    if (!(Test-Path -LiteralPath '.git')) {
        git init -b main
        VerificarUltimoComando 'Falha ao inicializar o repositório local.'
    }

    # Nao modificar um projeto que esteja vinculado a outro repositorio remoto.
    $origin = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0) {
        git remote add origin $repo
        VerificarUltimoComando 'Falha ao configurar o repositorio remoto.'
    } elseif ($origin.Trim() -ne $repo -and $origin.Trim() -ne 'git@github.com:dutrafg/Evolutrainer.git') {
        throw "Esta pasta ja aponta para outro repositorio: $origin. Publicacao interrompida para evitar perda de dados."
    }

    # Configurar identidade SOMENTE neste projeto, se ainda estiver vazia.
    $name = git config --local user.name
    if (!$name) { git config --local user.name 'dutrafg' }
    $mail = git config --local user.email
    if (!$mail) { git config --local user.email '151931671+dutrafg@users.noreply.github.com' }

    git branch -M main
    VerificarUltimoComando 'Falha ao selecionar a branch main.'

    Write-Host 'Incluindo arquivos do projeto...' -ForegroundColor Cyan
    git add --all
    VerificarUltimoComando 'Falha ao preparar os arquivos para commit.'

    git diff --cached --quiet
    $hasChanges = ($LASTEXITCODE -eq 1)
    if ($hasChanges) {
        git commit -m 'Publicar EvoluTrainer v6.0 PT-BR - PWA modular'
        VerificarUltimoComando 'Falha ao gravar o commit.'
    } else {
        Write-Host 'Nao ha mudancas locais para registrar.'
    }

    Write-Host 'Enviando ao GitHub. A autenticacao pode abrir o navegador...' -ForegroundColor Cyan
    git push -u origin main
    VerificarUltimoComando 'O envio falhou. Confira a autenticacao GitHub e as permissoes do repositorio.'

    Write-Host ''
    Write-Host 'PUBLICACAO CONCLUIDA' -ForegroundColor Green
    Write-Host $repoDisplay -ForegroundColor Green
} catch {
    Write-Host ''
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Nenhum arquivo remoto foi apagado pelo script.' -ForegroundColor Yellow
    exit 1
}
