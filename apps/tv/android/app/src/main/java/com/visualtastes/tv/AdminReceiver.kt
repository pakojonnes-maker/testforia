package com.visualtastes.tv

import android.app.admin.DeviceAdminReceiver
import android.content.ComponentName
import android.content.Context

/**
 * Receptor de administración. Solo hace algo si la app es «dueña del dispositivo», que se
 * activa por ADB en una tele SIN cuentas de Google (modo básico, lo normal en un piso):
 *   adb shell dpm set-device-owner com.visualtastes.tv/.AdminReceiver
 * Ver DeviceOwner.kt. En una tele normal no se activa nunca y no cambia nada.
 */
class AdminReceiver : DeviceAdminReceiver() {
    companion object {
        fun component(context: Context) = ComponentName(context, AdminReceiver::class.java)
    }
}
