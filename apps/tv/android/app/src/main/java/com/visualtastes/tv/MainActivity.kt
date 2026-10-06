package com.visualtastes.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * La pantalla de bienvenida: un WebView a pantalla completa con Mirador (apps/tv).
 *
 * Salir es lo importante: el huésped tiene que poder ver la tele normal sin pensar.
 *  · Atrás: si Mirador está en una pantalla interior, vuelve atrás dentro de la app;
 *    en el inicio, la cierra (window.vtTvBack() devuelve false, ver MirApp.tsx).
 *  · Canal arriba/abajo, números, TV, Fuente, Guía: cierran a la primera. La siguiente
 *    pulsación ya le llega a la tele.
 *  · Atrás mantenido 3 s: abre el asistente de configuración (para el anfitrión).
 *
 * Al cerrar o al dejar de verse (Home, apagar) la actividad termina: el siguiente
 * encendido la vuelve a abrir desde cero, en el inicio y con los datos al día.
 */
class MainActivity : Activity() {

    private var web: WebView? = null
    private lateinit var assets: WebAssets
    /** La pulsación de Atrás en curso ya hizo algo (abrir el asistente): el UP no cuenta. */
    private var backConsumed = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val code = Prefs(this).pairingCode
        val fromLauncher = intent?.action == Intent.ACTION_MAIN
        if (code == null || (fromLauncher && !Welcome.canDrawOverlays(this))) {
            openSetup()
            return
        }
        WakeService.start(this)
        Log.i(Welcome.TAG, "Identificación ante la API: ${DeviceInfo.stamp}")
        assets = WebAssets(this)

        val view = try {
            WebView(this)
        } catch (e: RuntimeException) {
            // El WebView del sistema se está actualizando o falta: mejor no tapar la tele.
            Log.e(Welcome.TAG, "WebView no disponible", e)
            finish()
            return
        }
        configure(view)
        setContentView(view)
        web = view
        view.loadUrl("https://${BuildConfig.WEB_HOST}/#$code")
        view.requestFocus()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configure(view: WebView) {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        view.setBackgroundColor(Color.WHITE)
        view.isFocusable = true
        view.isFocusableInTouchMode = true
        view.overScrollMode = View.OVER_SCROLL_NEVER
        view.isVerticalScrollBarEnabled = false
        view.isHorizontalScrollBarEnabled = false
        with(view.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            // El lienzo de Mirador va a píxeles exactos: el tamaño de letra del sistema
            // (accesibilidad) lo desbordaría.
            textZoom = 100
            // Qué tele es (fabricante, modelo, Android), para el admin. Ver DeviceInfo.
            userAgentString = "$userAgentString ${DeviceInfo.stamp}"
        }
        view.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                if (assets.handles(request.url)) assets.respond(request.url) else null

            // La pantalla no navega a ningún sitio: los enlaces de la guía van por QR al móvil.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                !assets.handles(request.url)

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                Log.w(Welcome.TAG, "El proceso del WebView se cayó; se cierra la bienvenida")
                web = null
                view.destroy()
                finish()
                return true
            }
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val key = event.keyCode
        if (key == KeyEvent.KEYCODE_BACK) {
            val heldMs = event.eventTime - event.downTime
            when (event.action) {
                // Un mando que se mantiene pulsado repite ACTION_DOWN: el asistente se abre
                // en cuanto se cumplen los 3 s, sin esperar a soltar. Los que no repiten
                // llegan con un único ACTION_UP tardío, y eso también cuenta.
                KeyEvent.ACTION_DOWN -> {
                    if (event.repeatCount == 0) backConsumed = false
                    else if (!backConsumed && heldMs >= SETUP_HOLD_MS) {
                        backConsumed = true
                        openSetup()
                    }
                }
                KeyEvent.ACTION_UP -> if (!backConsumed && !event.isCanceled) {
                    backConsumed = true
                    if (heldMs >= SETUP_HOLD_MS) openSetup() else goBack()
                }
            }
            return true
        }
        if (key in LEAVE_KEYS) {
            if (event.action == KeyEvent.ACTION_UP) leave("tecla ${KeyEvent.keyCodeToString(key)}")
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    private fun goBack() {
        val view = web ?: return leave("atrás")
        view.evaluateJavascript(
            "(function(){return typeof window.vtTvBack==='function'?window.vtTvBack():false})()",
        ) { result -> if (result != "true") leave("atrás en el inicio") }
    }

    private fun leave(reason: String) {
        Log.i(Welcome.TAG, "El huésped sale a la tele ($reason)")
        // Si somos la pantalla de inicio (modo dueño), cerrar sin más devolvería a... nosotros:
        // se abre la de Google TV de forma explícita.
        if (intent?.hasCategory(Intent.CATEGORY_HOME) == true) {
            DeviceOwner.systemHome(this)?.let { startActivity(it) }
        }
        finish()
    }

    private fun openSetup() {
        startActivity(Intent(this, SetupActivity::class.java))
        finish()
    }

    override fun onResume() {
        super.onResume()
        isShowing = true
        web?.onResume()
    }

    override fun onPause() {
        isShowing = false
        web?.onPause()
        super.onPause()
    }

    override fun onStop() {
        super.onStop()
        if (!isChangingConfigurations && !isFinishing) finish()
    }

    override fun onDestroy() {
        web?.destroy()
        web = null
        super.onDestroy()
    }

    companion object {
        /** Lo lee Welcome para no abrirse encima de sí misma. Mismo proceso que el servicio. */
        @Volatile
        var isShowing = false
            private set

        private const val SETUP_HOLD_MS = 3_000L

        private val LEAVE_KEYS = setOf(
            KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_CHANNEL_DOWN, KeyEvent.KEYCODE_LAST_CHANNEL,
            KeyEvent.KEYCODE_TV, KeyEvent.KEYCODE_TV_INPUT, KeyEvent.KEYCODE_GUIDE,
            KeyEvent.KEYCODE_TV_INPUT_HDMI_1, KeyEvent.KEYCODE_TV_INPUT_HDMI_2,
            KeyEvent.KEYCODE_TV_INPUT_HDMI_3, KeyEvent.KEYCODE_TV_INPUT_HDMI_4,
            KeyEvent.KEYCODE_TV_ANTENNA_CABLE, KeyEvent.KEYCODE_TV_TERRESTRIAL_DIGITAL,
            KeyEvent.KEYCODE_0, KeyEvent.KEYCODE_1, KeyEvent.KEYCODE_2, KeyEvent.KEYCODE_3,
            KeyEvent.KEYCODE_4, KeyEvent.KEYCODE_5, KeyEvent.KEYCODE_6, KeyEvent.KEYCODE_7,
            KeyEvent.KEYCODE_8, KeyEvent.KEYCODE_9,
        )
    }
}
