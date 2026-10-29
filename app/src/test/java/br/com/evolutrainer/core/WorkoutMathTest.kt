package br.com.evolutrainer.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutMathTest {
    @Test fun acceptsZeroWeightForBodyweightExercise() {
        assertTrue(WorkoutMath.isValid(TrainingSetInput(12, 0.0, null)))
    }

    @Test fun rejectsNonFiniteLoadAndInvalidRir() {
        assertFalse(WorkoutMath.isValid(TrainingSetInput(10, Double.NaN, 2)))
        assertFalse(WorkoutMath.isValid(TrainingSetInput(10, Double.POSITIVE_INFINITY, 2)))
        assertFalse(WorkoutMath.isValid(TrainingSetInput(10, 40.0, 11)))
        assertFalse(WorkoutMath.isValid(TrainingSetInput(0, 40.0, 2)))
    }

    @Test fun computesVolumeAcrossSets() {
        val result = WorkoutMath.totalVolumeKg(
            listOf(TrainingSetInput(10, 30.0, 2), TrainingSetInput(8, 35.0, 1))
        )
        assertEquals(580.0, result, 0.0001)
    }

    @Test fun countsDistinctExercises() {
        assertEquals(2, WorkoutMath.completedExerciseCount(listOf(7, 7, 8)))
    }
}
