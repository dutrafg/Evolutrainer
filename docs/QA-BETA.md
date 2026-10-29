# Validação do beta híbrido 0.1.0-beta.1

Data: 29/10/2026. Nova base web/Capacitor; resultados do app Kotlin não são usados como aprovação.

## Evidência

- 18 testes Node passaram; verificação sintática e build web passaram.
- GitHub Actions final: https://github.com/dutrafg/Evolutrainer/actions/runs/40904469753 — compilação e QA aprovados.
- Código do APK: 89ac3b33b52e71c93c8c6380e679b2c167ee6c3d, branch feature/pwa-hibrido-beta. Main preservada.
- APK inspecionado: ZIP íntegro, versão beta, módulos e correção de ID incluídos.
- SHA256 do APK: f6c95a5d72dce4f4f53f24b4b5889a057862a060ea87d8618ec9954980365083.
- Web publicada com acesso privado; o endereço exige entrada na conta ChatGPT autorizada.

## Fluxos conferidos na interface

Perfil e aluno persistidos após recarga; catálogo de 500 importado; ficha com exercício, prescrição de 1 série e carga-alvo de 20 kg; início, pausa, retomada, registro de 10 repetições e conclusão. Histórico exibiu 1 série e 200 kg × repetições. Agenda salvou compromisso. Mesociclo de 4 semanas foi criado e a quarta semana de deload gerou uma cópia independente. Mensalidade fictícia de R$150 paga exibiu total recebido correto. Avaliação sem foto nem medidas foi salva. Mensagem fictícia foi salva por aluno.

## Cobertura automatizada

Validação de domínio, clone transacional, duplicação, sessão única, inativação, snapshots, pausa, substituições, métodos, limites, catálogo, periodização, volume direto/indireto, progressão, isolamento do pacote do aluno, retorno idempotente, consentimento de foto, valor financeiro, migração, criptografia/erro de senha/adulteração, identidade de ficha nova e conversão kg/lb.

## Instalação e atualização

APK Android 10 ou superior, ID br.com.evolupersonal.hibrido. Assinatura fixa de desenvolvimento, exclusiva para testes. Futuras atualizações precisam manter assinatura e ID, aumentar versionCode e ser instaladas por cima, sem desinstalar. Não substitui nem importa automaticamente o antigo app Kotlin. Conteúdo web embarcado funciona offline; atualizações do APK exigem novo instalador. Não há OTA configurado.

## Limites de homologação

Não foram executados testes em smartphone/tablet físicos, instalação/atualização real, permissões, lembretes e compartilhamento nativo. A interface tem regras responsivas, mas a inspeção visual desta execução ocorreu apenas no viewport disponível. A biblioteca de mídia externa ainda registra 55 ausências e 155 revisões pendentes; não se presume aprovação biomecânica. A área do aluno troca pacotes criptografados manualmente, sem backend, contas próprias ou sincronização automática. Dados locais não têm criptografia adicional de banco; exportações usam AES-GCM. Recomenda-se uso inicial com dados fictícios.
