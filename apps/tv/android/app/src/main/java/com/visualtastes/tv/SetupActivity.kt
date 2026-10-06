package com.visualtastes.tv

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Asistente para el anfitrión o el instalador, no para el huésped:
 *  1. Código de emparejamiento (admin → Guía → apartamento → Pantalla TV). Se comprueba
 *     contra /guide/tv/config/:code, la misma llamada que hace la pantalla.
 *  2. «Mostrar sobre otras apps»: sin él la tele no puede abrir la bienvenida al
 *     encenderse. Google TV lo deja activar desde Ajustes, sin ADB.
 *  3. En TCL, el candado propio «Safety guard», que bloquea el arranque automático.
 */
class SetupActivity : Activity() {

    private val main = Handler(Looper.getMainLooper())
    private lateinit var prefs: Prefs
    private lateinit var codeInput: EditText
    private lateinit var codeStatus: TextView
    private lateinit var checkButton: Button
    private lateinit var permissionStatus: TextView
    private lateinit var startButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)
        prefs = Prefs(this)

        codeInput = findViewById(R.id.code_input)
        codeStatus = findViewById(R.id.code_status)
        checkButton = findViewById(R.id.check_button)
        permissionStatus = findViewById(R.id.permission_status)
        startButton = findViewById(R.id.start_button)

        prefs.pairingCode?.let { codeInput.setText(it) }
        prefs.apartmentName?.let { codeStatus.text = getString(R.string.setup_code_ok, it) }

        codeInput.setOnEditorActionListener { _, actionId, event ->
            val done = actionId == EditorInfo.IME_ACTION_DONE ||
                (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_UP)
            if (done) checkCode()
            done
        }
        checkButton.setOnClickListener { checkCode() }
        findViewById<Button>(R.id.permission_button).setOnClickListener { openOverlaySettings() }
        startButton.setOnClickListener { start() }

        val isTcl = Build.MANUFACTURER.contains("TCL", ignoreCase = true) ||
            Build.BRAND.contains("TCL", ignoreCase = true)
        findViewById<View>(R.id.tcl_block).visibility = if (isTcl) View.VISIBLE else View.GONE

        findViewById<Button>(R.id.app_info_button).setOnClickListener { openAppInfo() }

        (if (prefs.pairingCode == null) codeInput else startButton).requestFocus()

        // Instalación por ADB (scripts/tv-install): el instalador abre esta pantalla con el
        // código ya puesto, y con start=true arranca la bienvenida si el código es válido.
        intent?.getStringExtra(EXTRA_CODE)?.let { code ->
            codeInput.setText(code)
            checkCode(startWhenValid = intent.getBooleanExtra(EXTRA_START, false))
        }
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun refresh() {
        val granted = Welcome.canDrawOverlays(this)
        permissionStatus.text = getString(if (granted) R.string.setup_permission_ok else R.string.setup_permission_missing)
        // Android 15+: si la app se instaló desde un pendrive o un gestor de archivos, el
        // interruptor de «Mostrar sobre otras apps» sale bloqueado hasta permitir los «ajustes
        // restringidos» en la ficha de la app. Instalada por ADB o desde Play no pasa.
        findViewById<View>(R.id.restricted_block).visibility =
            if (!granted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) View.VISIBLE else View.GONE
        startButton.isEnabled = prefs.pairingCode != null
    }

    private fun openAppInfo() {
        try {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        } catch (e: ActivityNotFoundException) {
            permissionStatus.text = getString(R.string.setup_permission_no_settings)
        }
    }

    private fun checkCode(startWhenValid: Boolean = false) {
        val code = Prefs.normalizeCode(codeInput.text.toString())
        if (code.isEmpty()) {
            codeStatus.text = getString(R.string.setup_code_empty)
            return
        }
        codeInput.setText(code)
        codeStatus.text = getString(R.string.setup_code_checking)
        checkButton.isEnabled = false
        Thread {
            val result = fetchApartmentName(code)
            main.post {
                checkButton.isEnabled = true
                when (result) {
                    is Check.Ok -> {
                        prefs.pairingCode = code
                        prefs.apartmentName = result.apartment
                        codeStatus.text = getString(R.string.setup_code_ok, result.apartment)
                        refresh()
                        startButton.requestFocus()
                        if (startWhenValid) start()
                    }
                    Check.NotFound -> codeStatus.text = getString(R.string.setup_code_not_found)
                    Check.Offline -> codeStatus.text = getString(R.string.setup_code_offline)
                }
            }
        }.start()
    }

    private sealed interface Check {
        data class Ok(val apartment: String) : Check
        data object NotFound : Check
        data object Offline : Check
    }

    private fun fetchApartmentName(code: String): Check {
        val url = URL("${BuildConfig.API_URL}/guide/tv/config/${URLEncoder.encode(code, "UTF-8")}?lang=es")
        val connection = url.openConnection() as HttpURLConnection
        return try {
            // El emparejamiento ya deja anotado qué tele es (ver DeviceInfo).
            connection.setRequestProperty("User-Agent", "${System.getProperty("http.agent") ?: "Android"} ${DeviceInfo.stamp}")
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000
            when (connection.responseCode) {
                200 -> {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val name = JSONObject(body).optJSONObject("apartment")?.optString("name").orEmpty()
                    Check.Ok(name.ifBlank { code })
                }
                404 -> Check.NotFound
                else -> Check.Offline
            }
        } catch (e: IOException) {
            Check.Offline
        } catch (e: org.json.JSONException) {
            Check.Offline
        } finally {
            connection.disconnect()
        }
    }

    /**
     * La pantalla exacta del permiso no existe igual en todas las teles: se prueba de la
     * más concreta a la más general hasta que una abra.
     */
    private fun openOverlaySettings() {
        val candidates = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                add(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
                add(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION))
            }
            add(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
            add(Intent(Settings.ACTION_SETTINGS))
        }
        for (intent in candidates) {
            try {
                startActivity(intent)
                return
            } catch (e: ActivityNotFoundException) {
                // Siguiente candidata.
            } catch (e: SecurityException) {
                // Algunos fabricantes protegen su pantalla de ajustes: siguiente candidata.
            }
        }
        permissionStatus.text = getString(R.string.setup_permission_no_settings)
    }

    private fun start() {
        if (prefs.pairingCode == null) return
        WakeService.start(this)
        startActivity(Intent(this, MainActivity::class.java).putExtra(Welcome.EXTRA_REASON, "setup"))
        finish()
    }

    companion object {
        const val EXTRA_CODE = "code"
        const val EXTRA_START = "start"
    }
}
