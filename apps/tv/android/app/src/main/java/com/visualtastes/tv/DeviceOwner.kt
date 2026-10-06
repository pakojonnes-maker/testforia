package com.visualtastes.tv

import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import java.io.File

/**
 * Lo que la app puede hacer cuando es «dueña del dispositivo» (prueba de viabilidad, oct-2026).
 *
 *  · Instalar su propia actualización sin que nadie confirme nada en la tele.
 *  · Borrar los datos de las apps de streaming en el check-out (sesiones de Netflix, YouTube…).
 *  · Ser la pantalla de inicio: la tecla Home lleva a la bienvenida, sin desactivar la de Google TV.
 *
 * Solo se puede activar en una tele sin cuentas; para dejar de serlo, `release()` o reset de fábrica.
 */
object DeviceOwner {
    private const val TAG = Welcome.TAG

    private fun dpm(context: Context) = context.getSystemService(DevicePolicyManager::class.java)

    fun isOwner(context: Context): Boolean = dpm(context).isDeviceOwnerApp(context.packageName)

    /** Borra todos los datos de otra app (como «Borrar almacenamiento»). Android 9+. */
    fun clearAppData(context: Context, pkg: String, done: (Boolean) -> Unit) {
        if (!isOwner(context) || Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return done(false)
        dpm(context).clearApplicationUserData(AdminReceiver.component(context), pkg, context.mainExecutor) { p, ok ->
            Log.i(TAG, "Datos de $p borrados: $ok")
            done(ok)
        }
    }

    /** Instala un APK (normalmente una versión nueva de esta misma app) sin pedir confirmación. */
    fun installSilently(context: Context, apk: File) {
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            session.openWrite("app.apk", 0, apk.length()).use { out -> apk.inputStream().use { it.copyTo(out) } }
            val callback = PendingIntent.getBroadcast(
                context, sessionId, Intent(ACTION_INSTALL_RESULT).setPackage(context.packageName),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            session.commit(callback.intentSender)
        }
        Log.i(TAG, "Instalación silenciosa enviada (sesión $sessionId, ${apk.length()} bytes)")
    }

    /**
     * La bienvenida pasa a ser la pantalla de inicio (tecla Home y arranque), sin desinstalar
     * ni desactivar la de Google TV. `enabled = false` lo deshace.
     */
    fun setAsHome(context: Context, enabled: Boolean) {
        val admin = AdminReceiver.component(context)
        val home = ComponentName(context, "${context.packageName}.HomeAlias")
        context.packageManager.setComponentEnabledSetting(
            home,
            if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val filter = IntentFilter(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addCategory(Intent.CATEGORY_DEFAULT)
        }
        if (enabled) dpm(context).addPersistentPreferredActivity(admin, filter, home)
        else dpm(context).clearPackagePersistentPreferredActivities(admin, context.packageName)
        Log.i(TAG, "Pantalla de inicio propia: $enabled")
    }

    /** La pantalla de inicio de la tele (la de Google TV / Android TV), sin contar la nuestra. */
    fun systemHome(context: Context): Intent? {
        val query = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val other = context.packageManager.queryIntentActivities(query, 0)
            .firstOrNull { it.activityInfo.packageName != context.packageName } ?: return null
        return Intent(query).setClassName(other.activityInfo.packageName, other.activityInfo.name)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    /** Deja de ser dueña del dispositivo (para devolver la tele a su estado normal). */
    fun release(context: Context) {
        if (!isOwner(context)) return
        setAsHome(context, false)
        @Suppress("DEPRECATION")
        dpm(context).clearDeviceOwnerApp(context.packageName)
        Log.i(TAG, "Ya no es dueña del dispositivo")
    }

    const val ACTION_INSTALL_RESULT = "com.visualtastes.tv.INSTALL_RESULT"
}
