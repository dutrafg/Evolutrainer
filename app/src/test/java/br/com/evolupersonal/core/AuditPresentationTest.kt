package br.com.evolupersonal.core

import br.com.evolupersonal.data.SnapshotExercise
import org.junit.Assert.*
import org.junit.Test
import java.util.Locale

class AuditPresentationTest {
    @Test fun formatsNumericEventsAndPreservesLegacyText() {
        val formatted = AuditPresentation.event("1000 · Pausa", Locale.forLanguageTag("pt-BR"))
        assertFalse(formatted.startsWith("1000 ·"))
        assertTrue(formatted.endsWith(" · Pausa"))
        assertEquals("Observação antiga", AuditPresentation.event("Observação antiga"))
    }
    @Test fun distinguishesPlannedSubstituteAndUnknownLegacyOrigin() {
        val exercise = SnapshotExercise(1, "Remada", "Costas", Prescription())
        assertEquals("Planejado", AuditPresentation.origin(exercise))
        assertEquals("Substituto", AuditPresentation.origin(exercise.copy(source = "SUBSTITUTE")))
        assertEquals("Registro legado: origem não identificada", AuditPresentation.origin(exercise.copy(source = null)))
    }
}
