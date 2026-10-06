package com.visualtastes.tv

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * Decide si la pantalla de bienvenida se pone delante y la abre.
 *
 * Se llama al arrancar la tele y cada vez que la pantalla se enciende. La regla es
 * enseñarse SIEMPRE que se pueda: el huésped la quita con Atrás o una tecla de canal
 * (MainActivity), y al siguiente encendido vuelve.
 */
object Welcome {
    const val TAG = "VisualTasteTV"
    const val EXTRA_REASON = "reason"

    /** Si no se puede enseñar, el motivo (para el log); null si se puede. */
    fun blockedReason(context: Context): String? {
        if (Prefs(context).pairingCode == null) return "sin emparejar"
        if (MainActivity.isShowing) return "ya está delante"
        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!power.isInteractive) return "pantalla apagada"
        // Sin «Mostrar sobre otras apps», Android 10+ bloquea abrir una actividad desde
        // segundo plano; el intento no da error, simplemente no aparece nada.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !canDrawOverlays(context)) {
            return "falta el permiso «Mostrar sobre otras apps»"
        }
        return null
    }

    fun canDrawOverlays(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

    fun showIfAppropriate(context: Context, reason: String) {
        val blocked = blockedReason(context)
        if (blocked != null) {
            Log.i(TAG, "No se enseña ($reason): $blocked")
            return
        }
        Log.i(TAG, "Se enseña la bienvenida ($reason)")
        val intent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(EXTRA_REASON, reason)
        try {
            context.startActivity(intent)
        } catch (e: RuntimeException) {
            Log.w(TAG, "Android no dejó abrir la bienvenida", e)
        }
    }
}
