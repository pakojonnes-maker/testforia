package com.visualtastes.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import java.io.File

/**
 * Solo depuración. Desde ADB:
 *   am broadcast -n com.visualtastes.tv/.DebugOwnerReceiver -a com.visualtastes.tv.debug.CLEAR --es pkg <paquete>
 *   am broadcast -n com.visualtastes.tv/.DebugOwnerReceiver -a com.visualtastes.tv.debug.INSTALL --es file <fichero en files/>
 *   am broadcast -n com.visualtastes.tv/.DebugOwnerReceiver -a com.visualtastes.tv.debug.HOME --ez on true|false
 *   am broadcast -n com.visualtastes.tv/.DebugOwnerReceiver -a com.visualtastes.tv.debug.RELEASE
 */
class DebugOwnerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val tag = Welcome.TAG
        Log.i(tag, "Prueba ${intent.action}; dueña del dispositivo: ${DeviceOwner.isOwner(context)}")
        when (intent.action) {
            "com.visualtastes.tv.debug.CLEAR" -> {
                val pending = goAsync()
                DeviceOwner.clearAppData(context, intent.getStringExtra("pkg").orEmpty()) { pending.finish() }
            }
            "com.visualtastes.tv.debug.INSTALL" ->
                DeviceOwner.installSilently(context, File(context.filesDir, intent.getStringExtra("file").orEmpty()))
            "com.visualtastes.tv.debug.HOME" -> DeviceOwner.setAsHome(context, intent.getBooleanExtra("on", true))
            "com.visualtastes.tv.debug.RELEASE" -> DeviceOwner.release(context)
            DeviceOwner.ACTION_INSTALL_RESULT -> {
                val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)
                Log.i(tag, "Resultado de la instalación: $status ${intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)}" +
                    if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) " (PIDE CONFIRMACIÓN al usuario)" else "")
            }
        }
    }
}
