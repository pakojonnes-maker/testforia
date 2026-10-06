package com.visualtastes.tv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

/**
 * Mantiene vivo el receptor de «pantalla encendida».
 *
 * Al apagar con el mando, una tele Android no se reinicia: se duerme. Al encenderla no
 * hay BOOT_COMPLETED, solo ACTION_SCREEN_ON, y Android solo entrega ese aviso a un
 * receptor registrado por un proceso que esté vivo; en el manifiesto no llega. Por eso
 * hace falta un servicio en primer plano. En la tele no se ve ninguna notificación.
 */
class WakeService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var pendingReason = "wake"
    private val show = Runnable { Welcome.showIfAppropriate(this, pendingReason) }

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_SCREEN_ON -> schedule(WAKE_DELAY_MS, "wake")
                Intent.ACTION_SCREEN_OFF -> handler.removeCallbacks(show)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        goForeground()
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
        }
        // Son avisos protegidos del sistema: ninguna otra app puede mandarlos.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
        Log.i(Welcome.TAG, "Servicio de encendido activo")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.getBooleanExtra(EXTRA_SHOW_AFTER_BOOT, false) == true) {
            schedule(BOOT_DELAY_MS, "boot")
        }
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(show)
        unregisterReceiver(screenReceiver)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * Se espera unos segundos tras encender: justo al despertar, la tele aún está
     * reconectando el WiFi y redibujando su inicio, y una actividad abierta en ese
     * momento puede quedar debajo o no abrirse.
     */
    private fun schedule(delayMs: Long, reason: String) {
        pendingReason = reason
        handler.removeCallbacks(show)
        handler.postDelayed(show, delayMs)
    }

    private fun goForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, getString(R.string.service_channel), NotificationManager.IMPORTANCE_MIN),
            )
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        val notification = builder
            .setSmallIcon(R.drawable.ic_service)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.service_text))
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        private const val CHANNEL_ID = "wake"
        private const val NOTIFICATION_ID = 1
        private const val EXTRA_SHOW_AFTER_BOOT = "show_after_boot"
        private const val WAKE_DELAY_MS = 2_500L
        private const val BOOT_DELAY_MS = 8_000L

        fun start(context: Context, showAfterBoot: Boolean = false) {
            val intent = Intent(context, WakeService::class.java)
                .putExtra(EXTRA_SHOW_AFTER_BOOT, showAfterBoot)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: RuntimeException) {
                // Android 12+ prohíbe arrancar servicios en primer plano desde segundo plano
                // salvo excepciones (arranque, «Mostrar sobre otras apps»…). Se reintentará
                // la próxima vez que se abra la app.
                Log.w(Welcome.TAG, "No se pudo arrancar el servicio", e)
            }
        }
    }
}
