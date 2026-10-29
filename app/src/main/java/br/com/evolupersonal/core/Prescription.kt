package br.com.evolupersonal.core

/** Explicit prescription; no load is changed automatically. */
data class Prescription(
    val sets: Int = 3, val repsMin: Int = 10, val repsMax: Int = 10,
    val loadKg: Double? = null, val rir: Int? = null, val rpe: Int? = null,
    val restSeconds: Int = 90, val cadence: String = "", val durationSeconds: Int = 0,
    val notes: String = "", val method: String = "NORMAL", val block: String = "",
    val rounds: Int = 1, val workSeconds: Int = 30, val intervalSeconds: Int = 15
) {
    fun validate() {
        require(sets in 1..15 && repsMin in 1..1000 && repsMax in repsMin..1000)
        require(loadKg == null || loadKg.isFinite() && loadKg in 0.0..1000.0)
        require(rir == null || rir in 0..10); require(rpe == null || rpe in 1..10)
        require(restSeconds in 0..3600 && durationSeconds in 0..7200)
        require(cadence.length <= 30 && notes.length <= 1000 && block.length <= 30)
        require(method in methods.keys && rounds in 1..100 && workSeconds in 1..3600 && intervalSeconds in 0..3600)
        require(method != "EMOM" || workSeconds + intervalSeconds == 60) { "EMOM deve totalizar 60 segundos por rodada." }
        require(method != "AMRAP" || durationSeconds > 0) { "Defina a duração do AMRAP." }
        require(method !in setOf("SUPER", "BI", "TRI", "CIRCUIT") || block.isNotBlank()) { "Informe o bloco que une os exercícios." }
    }
    companion object {
        val methods = linkedMapOf("NORMAL" to "Tradicional", "SUPER" to "Supersérie", "BI" to "Bi-set", "TRI" to "Tri-set", "DROP" to "Dropset", "REST_PAUSE" to "Rest-pause", "CLUSTER" to "Cluster", "CIRCUIT" to "Circuito", "HIIT" to "HIIT", "EMOM" to "EMOM", "AMRAP" to "AMRAP")
    }
}

/** Timer derived from a persisted deadline, including after process recreation. */
object IntervalClock {
    data class Phase(val label: String, val remaining: Int, val round: Int, val finished: Boolean)
    fun phase(start: Long, now: Long, work: Int, rest: Int, rounds: Int): Phase {
        require(work > 0 && rest >= 0 && rounds > 0)
        val elapsed = ((now - start).coerceAtLeast(0) / 1000)
        val cycle = work.toLong() + rest
        val total = cycle * rounds - rest
        if (elapsed >= total) return Phase("Concluído", 0, rounds, true)
        val offset = elapsed % cycle
        return Phase(if (offset < work) "Execução" else "Intervalo", (if (offset < work) work - offset else cycle - offset).toInt(), (elapsed / cycle).toInt() + 1, false)
    }
}
