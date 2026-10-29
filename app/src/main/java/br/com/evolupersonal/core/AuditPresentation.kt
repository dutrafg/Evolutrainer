package br.com.evolupersonal.core

import br.com.evolupersonal.data.SnapshotExercise
import java.text.DateFormat
import java.util.Date
import java.util.Locale

object AuditPresentation {
    fun origin(exercise: SnapshotExercise): String = when (exercise.source) {
        "PLANNED" -> "Planejado"
        "SUBSTITUTE" -> "Substituto"
        else -> "Registro legado: origem não identificada"
    }
    fun event(raw: String, locale: Locale = Locale.getDefault()): String {
        val prefix = raw.substringBefore(" · ")
        val timestamp = prefix.toLongOrNull() ?: return raw
        if (timestamp < 0 || !raw.contains(" · ")) return raw
        return DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.MEDIUM, locale).format(Date(timestamp)) + " · " + raw.substringAfter(" · ")
    }
}
