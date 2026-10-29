package br.com.evolupersonal.core

import org.junit.Assert.*
import org.junit.Test

class WeightUnitsTest {
    @Test fun poundsRoundTripWithoutChangingCanonicalHistory() {
        assertEquals(45.359237, WeightUnits.toKg(100.0, "lb"), 0.00000001)
        assertEquals(100.0, WeightUnits.fromKg(WeightUnits.toKg(100.0, "lb"), "lb"), 0.00000001)
        assertEquals(50.0, WeightUnits.toKg(50.0, "kg"), 0.0)
    }
    @Test fun invalidUnitIsRejected() {
        assertThrows(IllegalArgumentException::class.java) { WeightUnits.toKg(100.0, "other") }
    }
}
