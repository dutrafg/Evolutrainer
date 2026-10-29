package br.com.evolupersonal.core

/** Database values are always kilograms. One international pound is exactly 0.45359237 kg. */
object WeightUnits {
    fun toKg(value: Double, unit: String): Double {
        require(unit in setOf("kg", "lb"))
        return if (unit == "lb") value * 0.45359237 else value
    }
    fun fromKg(value: Double, unit: String): Double {
        require(unit in setOf("kg", "lb"))
        return if (unit == "lb") value / 0.45359237 else value
    }
}
