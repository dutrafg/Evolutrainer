package br.com.evolupersonal.core

import br.com.evolupersonal.data.*

object PerformanceAnalysis {
    data class Point(val sessionId: Long, val at: Long, val volume: Double, val bestLoad: Double, val reps: Int, val estimated1Rm: Double?)
    data class WeeklySummary(val sessions: Int, val sets: Int, val volumeKg: Double)
    fun weeklySummary(sessions: List<WorkoutSessionEntity>, sets: List<WorkoutSetEntity>, now: Long): WeeklySummary {
        val ids = sessions.filter { it.finishedAt != null && it.finishedAt in (now - 7L * 24 * 60 * 60 * 1000)..now }.map { it.id }.toSet()
        val work = sets.filter { it.sessionId in ids && it.setType != "AQUECIMENTO" }
        return WeeklySummary(ids.size, work.size, work.sumOf { it.repetitions * it.loadKg })
    }
    data class Suggestion(val action: String, val reason: String, val loadKg: Double? = null)
    fun points(sessions: List<WorkoutSessionEntity>, sets: List<WorkoutSetEntity>, exerciseId: Long): List<Point> = sessions.filter { it.finishedAt != null }.sortedBy { it.finishedAt }.mapNotNull { session ->
        val work = sets.filter { it.sessionId == session.id && it.exerciseId == exerciseId && it.setType != "AQUECIMENTO" }
        if (work.isEmpty()) null else Point(session.id, session.finishedAt!!, work.sumOf { it.repetitions * it.loadKg }, work.maxOf { it.loadKg }, work.sumOf { it.repetitions }, work.mapNotNull { TrainingInsights.estimatedOneRepMax(it.loadKg, it.repetitions) }.maxOrNull())
    }
    fun progression(sessions: List<WorkoutSessionEntity>, sets: List<WorkoutSetEntity>, exerciseId: Long): Suggestion {
        val recent = sessions.filter { it.finishedAt != null && sets.any { s -> s.sessionId == it.id && s.exerciseId == exerciseId && s.setType == "NORMAL" } }.sortedByDescending { it.finishedAt }.take(3)
        if (recent.size < 3) return Suggestion("Dados insuficientes", "São necessárias três sessões concluídas comparáveis com séries tradicionais e prescrição registrada.")
        if (recent.map { it.studentId }.distinct().size != 1) return Suggestion("Revisar manualmente", "Selecione apenas um aluno para avaliar a progressão.")
        val prescriptions = recent.map { it.snapshot()?.exercises?.firstOrNull { e -> e.exerciseId == exerciseId }?.prescription }
        if (prescriptions.any { it == null || it.method != "NORMAL" }) return Suggestion("Revisar manualmente", "Há sessão sem prescrição histórica ou com método diferente do tradicional.")
        val p = prescriptions.filterNotNull()
        if (p.any { it.repsMin != p[0].repsMin || it.repsMax != p[0].repsMax || it.sets != p[0].sets || it.restSeconds != p[0].restSeconds || it.cadence != p[0].cadence }) return Suggestion("Revisar manualmente", "A faixa, séries, descanso ou cadência mudou entre as sessões.")
        if (sets.any { it.sessionId in recent.map { s -> s.id } && it.exerciseId == exerciseId && it.setType !in setOf("NORMAL", "AQUECIMENTO") }) return Suggestion("Revisar manualmente", "As sessões incluem séries especiais; não se recomenda progressão automática por comparação simples.")
        val groups = recent.map { session -> sets.filter { it.sessionId == session.id && it.exerciseId == exerciseId && it.setType == "NORMAL" } }
        if (groups.any { it.size != p[0].sets || it.any { s -> s.rir == null } }) return Suggestion("Dados insuficientes", "Complete as séries previstas e registre RIR em todas as séries tradicionais.")
        val loads = groups.flatten().map { it.loadKg }.distinct()
        if (loads.size != 1 || loads[0] <= 0) return Suggestion("Revisar manualmente", "As cargas variam ou são zero; compare séries equivalentes antes de decidir.")
        val load = loads[0]
        return when {
            groups.all { it.all { s -> s.repetitions >= p[0].repsMax && s.rir!! >= 2 } } -> Suggestion("Considerar aumento", "Três sessões na mesma carga: todas as séries atingiram o limite superior com RIR ≥2. Sugestão conservadora de 2%, sujeita à revisão profissional.", (load * 1.02).coerceAtMost(1000.0))
            groups.take(2).all { it.all { s -> s.repetitions < p[0].repsMin || s.rir == 0 } } -> Suggestion("Considerar redução", "Duas sessões recentes abaixo da faixa ou sem repetições em reserva em todas as séries. Sugestão de redução de 5%, sujeita à revisão profissional.", load * 0.95)
            else -> Suggestion("Manter e observar", "Os critérios de aumento ou redução não foram atingidos de forma consistente nas três sessões comparáveis.", load)
        }
    }
}
