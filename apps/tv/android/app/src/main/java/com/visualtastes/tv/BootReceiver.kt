package com.visualtastes.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Arranque en frío (tele desenchufada, corte de luz) y actualización de la app. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val afterBoot = intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        Log.i(Welcome.TAG, "Recibido ${intent.action}")
        if (Prefs(context).pairingCode == null) return
        WakeService.start(context, showAfterBoot = afterBoot)
    }
}
