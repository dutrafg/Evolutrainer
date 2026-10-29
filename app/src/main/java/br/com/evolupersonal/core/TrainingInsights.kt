package br.com.evolupersonal.core

import kotlin.math.roundToInt

/**
 * Heurísticas transparentes e conservadoras, não prescrição automática.
 * A decisão final sobre a carga é do profissional ou do praticante.
 */
object TrainingInsights {
    fun estimatedOneRepMax(loadKg: Double, repetitions: Int): Double? =
        if (!loadKg.isFinite() || loadKg <= 0 || repetitions !in 1..10) null
        else loadKg * (1.0 + repetitions / 30.0)

    fun progressionSuggestion(
        lastLoadKg: Double,
        lastReps: Int,
        targetReps: Int,
        lastRir: Int?
    ): String {
        if (lastLoadKg <= 0 || !lastLoadKg.isFinite() || targetReps !in 1..1000 ||
            lastReps !in 1..1000 || lastRir == null || lastRir !in 0..10
        ) return "Registre mais dados antes de avaliar a progressão."
        return when {
            lastReps >= targetReps && lastRir >= 2 ->
                "Desempenho consistente: considere aumento conservador de 2–5%, mantendo a técnica."
            lastReps < targetReps || lastRir <= 1 ->
                "Priorize manter a carga e consolidar as repetições com boa técnica."
            else -> "Mantenha a carga e reavalie na próxima sessão."
        }
    }

    /** Apenas séries normais (sem aquecimento) contam para séries de trabalho. */
    fun workSetCount(types: Iterable<String>): Int =
        types.count { it in setOf("NORMAL", "BACKOFF", "DROP", "FALHA") }

    /** Volume é carga externa × repetições; não é gasto energético. */
    fun volumeKg(repetitions: Int, loadKg: Double): Double =
        WorkoutMath.volumeKg(repetitions, loadKg)
}
