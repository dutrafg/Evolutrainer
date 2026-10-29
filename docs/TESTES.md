# Plano de validação 0.1.0-dev

## Automáticos
- `WorkoutMathTest`: limites, carga não finita, contagem e volume.
- GitHub Actions: Gradle 8.13, JDK 17, SDK 36, testes unitários e `assembleDebug`.
- O teste de UI em aparelho físico ainda é necessário.

## Manual — ao obter APK
1. Instalar e navegar pelas cinco abas.
2. Cadastrar dois exercícios, reiniciar: registros persistem.
3. Criar treino e adicionar exercícios; bloquear duplicação.
4. Impedir iniciar treino sem exercícios.
5. Iniciar, registrar série, encerrar app e retomar: manter sessão.
6. Validar 0 repetições, cargas negativas, RIR fora de 0-10.
7. Registrar carga 0 (peso corporal).
8. Impedir concluir sessão sem séries; concluir com séries e conferir histórico.
9. Conferir cálculos de volume, data e número de séries.
10. Alternar temas e salvar nome; reiniciar e conferir persistência.
11. Testar teclado, navegação do sistema, rotação e tela compacta.

## Biblioteca
Importação incremental será exclusivamente por IDs externos canônicos, sem confiar no nome do exercício como chave. Ver `docs/IMPORTACAO-BIBLIOTECA.md`.

## Publicação
Não mesclar na `main` sem autorização. Não publicar APK como estável sem QA real.
