package br.com.evolupersonal.data

import android.content.Context
import androidx.room.withTransaction
import org.json.JSONObject

/** Carrega somente metadados aprovados como membros da lista MD500; mídia não incluída. */
object LibrarySeeder {
    suspend fun seed(context: Context, db: TrainerDatabase) {
        val dao = db.trainerDao()
        if (dao.countLibraryExercises() >= 500) return
        val raw = context.assets.open("md500-catalog.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
        val doc = JSONObject(raw)
        require(doc.getInt("formatVersion") == 1)
        val array = doc.getJSONArray("exercises")
        require(array.length() == 500)
        val seen = HashSet<String>()
        val entities = (0 until array.length()).map { idx ->
            val item = array.getJSONObject(idx)
            val id = item.getString("externalId")
            require(seen.add(id) && id.matches(Regex("md500-\\d{3}")))
            val name = item.getString("name").trim()
            val group = item.getString("muscleGroup").trim()
            require(name.isNotEmpty() && group.isNotEmpty())
            val path = item.optString("animationPath", "").takeIf { it.isNotBlank() && it != "null" }
            ExerciseEntity(
                name = name,
                muscleGroup = group,
                origin = "LIBRARY",
                externalId = id,
                animationPath = path,
                mediaReviewStatus = item.getString("mediaReviewStatus")
            )
        }
        db.withTransaction { dao.insertLibraryExercises(entities) }
    }
}
