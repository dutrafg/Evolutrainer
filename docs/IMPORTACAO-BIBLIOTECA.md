# Contrato de importação incremental da biblioteca 3D

## Fonte de verdade
Os exercícios e GIFs/3D seguem sendo criados em outro projeto. **Este repositório não modifica a fonte original**. O layout interno real ainda precisa ser confirmado quando houver um lote pronto para exportação.

## Estratégia aprovada
- Lotes de 25 ou 30 exercícios, preferencialmente apenas itens validados e presentes na lista canônica de 500.
- Cada exercício terá `externalId` permanente, fornecido pela origem; não deduzir ID pela posição ou pelo nome.
- Cada exportação terá versão, total esperado, lote, data e checksum dos arquivos de mídia.
- O app fará inserção ou atualização por `externalId`, sem substituir IDs locais nem apagar dados do usuário.
- Mídias 3D serão opcionais durante importação; exibir estado `animação pendente` quando ausentes.
- A importação deve ser atômica, com validação do manifesto e rollback em falha; um lote não deve corromper treinos em andamento.
- Não importar nomes ou GIFs sem correspondência auditável com os 500 exercícios da lista.
- As mídias precisam ser compactadas para não gerar APK gigantesco; o plano offline prevê pacotes baixáveis, verificados e persistidos localmente.

## Exemplo de contrato (estrutura proposta, não dados reais)
```json
{
  "formatVersion": 1,
  "libraryVersion": "2026.10-batch-001",
  "exerciseCount": 1,
  "exercises": [
    {
      "externalId": "ID_CANONICO_EXEMPLO",
      "name": "Nome canônico",
      "muscleGroup": "Grupo canônico",
      "media": {
        "path": "media/ID_CANONICO_EXEMPLO.glb",
        "sha256": "HASH_A_SER_CALCULADO"
      }
    }
  ]
}
```

## Critério para importar
Antes do primeiro lote, confirmar repositório/branch/pasta da biblioteca publicada pelo outro chat, IDs canônicos e formato dos assets. Não presumir que já existem arquivos exportáveis.

## Inventário real consultado em 28/10/2026
- Fonte: `dutrafg/EvoluPersonal`, branch `codex/evolupersonal-media-350`.
- 425 GIFs legados com IDs `e0`–`e424` em `dist/assets/exercises/`.
- A documentação dessa branch registra 295/500 correspondências com a lista MD500 e 205 pendências, com revisão biomecânica ainda necessária.
- Existe acervo adicional em `dist/assets/md500-3d/` e uma pasta `md500/` com 30 GIFs 2D reprovados; não associar itens reprovados.
- Não presumir que 425 GIFs equivalem a 425 exercícios canônicos concluídos.
- O manifesto de origem para a lista oficial é `docs/COMPARACAO_LISTA_500.json` e o inventário é `production/INVENTARIO_MD500.json`.

## Fase de integração 0.1.0-dev
Foi incorporada uma **cópia local apenas dos metadados** da lista MD500 (500 exercícios) como `app/src/main/assets/md500-catalog.json`. A importação Room é idempotente por `externalId` e não altera registros manuais. O arquivo do catálogo diferencia correspondência legada (295), revisão pendente (125) e animação ausente (80). **GIFs reais ainda não foram empacotados nem foram validados biomecanicamente.** Nada é alterado no repositório fonte.
