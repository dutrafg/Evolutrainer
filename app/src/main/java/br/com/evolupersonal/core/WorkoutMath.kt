package br.com.evolupersonal.core

data class TrainingSetInput(
    val repetitions: Int,
    val loadKg: Double,
    val rir: Int?
)

object WorkoutMath {
    fun isValid(set: TrainingSetInput): Boolean =
        set.repetitions in 1..1000 &&
            set.loadKg.isFinite() &&
            set.loadKg >= 0.0 &&
            set.loadKg <= 1000.0 &&
            (set.rir == null || set.rir in 0..10)

    fun volumeKg(repetitions: Int, loadKg: Double): Double =
        if (repetitions <= 0 || !loadKg.isFinite() || loadKg < 0.0) 0.0
        else repetitions * loadKg

    fun totalVolumeKg(sets: Iterable<TrainingSetInput>): Double =
        sets.sumOf { volumeKg(it.repetitions, it.loadKg) }

    fun completedExerciseCount(exerciseIds: Iterable<Long>): Int =
        exerciseIds.toSet().size
}
