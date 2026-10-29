package br.com.evolupersonal.data

import com.google.gson.Gson

data class SessionSnapshot(val title: String, val studentName: String, val exercises: List<SnapshotExercise>)
data class SnapshotExercise(val exerciseId: Long, val name: String, val muscle: String, val prescription: br.com.evolupersonal.core.Prescription)
fun WorkoutSessionEntity.snapshot(): SessionSnapshot? = if (snapshotJson.isBlank()) null else Gson().fromJson(snapshotJson, SessionSnapshot::class.java)
