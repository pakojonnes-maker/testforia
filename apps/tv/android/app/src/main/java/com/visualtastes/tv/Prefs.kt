package com.visualtastes.tv

import android.content.Context

/** Lo único que la tele recuerda entre encendidos: con qué alojamiento está emparejada. */
class Prefs(context: Context) {
    private val prefs = context.getSharedPreferences("visualtaste_tv", Context.MODE_PRIVATE)

    var pairingCode: String?
        get() = prefs.getString(KEY_CODE, null)?.takeIf { it.isNotBlank() }
        set(value) = prefs.edit().putString(KEY_CODE, value?.let(::normalizeCode)).apply()

    /** Nombre del alojamiento, solo para enseñarlo en el asistente. */
    var apartmentName: String?
        get() = prefs.getString(KEY_NAME, null)
        set(value) = prefs.edit().putString(KEY_NAME, value).apply()

    companion object {
        private const val KEY_CODE = "pairing_code"
        private const val KEY_NAME = "apartment_name"

        /** Los códigos del admin son mayúsculas y cifras; el QR los trae tras un «#». */
        fun normalizeCode(raw: String): String =
            raw.trim().removePrefix("#").uppercase().filter { it.isLetterOrDigit() }
    }
}
