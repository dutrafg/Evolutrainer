package br.com.evolupersonal.core

import org.junit.Assert.*
import org.junit.Test

class TrainingInsightsTest {
    @Test fun conservativeEstimateLimitedToTenRepetitions() {
        assertEquals(100.0, TrainingInsights.estimatedOneRepMax(75.0, 10)!!, 0.0001)
        assertNull(TrainingInsights.estimatedOneRepMax(75.0, 11))
        assertNull(TrainingInsights.estimatedOneRepMax(0.0, 1))
    }

    @Test fun suggestionsNeverApplyChanges() {
        assertTrue(TrainingInsights.progressionSuggestion(50.0, 10, 10, 3).contains("2–5%"))
        assertTrue(TrainingInsights.progressionSuggestion(50.0, 8, 10, 1).contains("manter"))
        assertTrue(TrainingInsights.progressionSuggestion(50.0, 10, 10, null).contains("mais dados"))
    }

    @Test fun warmsAreNotCountedAsWorkingSets() {
        assertEquals(3, TrainingInsights.workSetCount(listOf("AQUECIMENTO", "NORMAL", "BACKOFF", "DROP")))
    }
}
