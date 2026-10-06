package com.visualtastes.tv

import android.os.Build

/**
 * Sello con el que la app se identifica ante la API, al final del User-Agent:
 *   VisualTasteTV/0.1.0 (TCL; 55C745; Android 12; API 31)
 * workerTvScreen.js lo guarda en guide_tv_devices (migración 0104) para saber qué teles
 * hay en los pisos. Solo describe el aparato. El formato es un contrato con TV_APP_UA del
 * worker: si cambia aquí, cambia allí.
 */
object DeviceInfo {
    private fun clean(value: String?): String =
        (value ?: "?").replace(Regex("[;()\\r\\n]"), " ").replace(Regex("\\s+"), " ").trim().take(60).ifEmpty { "?" }

    val stamp: String by lazy {
        "VisualTasteTV/${BuildConfig.VERSION_NAME} " +
            "(${clean(Build.MANUFACTURER)}; ${clean(Build.MODEL)}; Android ${clean(Build.VERSION.RELEASE)}; API ${Build.VERSION.SDK_INT})"
    }
}
