package com.visualtastes.tv

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.IOException

/**
 * Sirve el build web empaquetado (assets/web) como si viniera de https://tv.visualtastes.com.
 *
 * Por qué no file:///android_asset/: con file:// el origen es «null» y el worker rechaza
 * las peticiones por CORS. Con el origen de producción de la TV, que ya está en
 * ALLOWED_ORIGINS, la interfaz habla con la API igual que en el navegador, y la red
 * nunca llega a pedir estos ficheros: salen del APK aunque no haya WiFi.
 */
class WebAssets(private val context: Context) {

    fun handles(uri: Uri): Boolean = uri.scheme == "https" && uri.host == BuildConfig.WEB_HOST

    fun respond(uri: Uri): WebResourceResponse {
        // "/" y "" son la app; cualquier otra ruta es un fichero del build (assets/…).
        // Nunca se sirve index.html para rutas desconocidas: useGuidebook leería la ruta
        // como si fuera el slug de un apartamento.
        val path = uri.path.orEmpty().trimStart('/').ifEmpty { "index.html" }
        if (path.split('/').any { it == ".." }) return notFound()
        return try {
            val stream = context.assets.open("web/$path")
            WebResourceResponse(mimeType(path), if (isText(path)) "utf-8" else null, stream).apply {
                responseHeaders = mapOf("Cache-Control" to "no-cache")
            }
        } catch (e: IOException) {
            notFound()
        }
    }

    private fun notFound() = WebResourceResponse(
        "text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)),
    )

    private fun isText(path: String) = mimeType(path).let { it.startsWith("text/") || it.endsWith("json") || it.endsWith("svg+xml") }

    private fun mimeType(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json", "webmanifest" -> "application/json"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "webp" -> "image/webp"
        "avif" -> "image/avif"
        "gif" -> "image/gif"
        "ico" -> "image/x-icon"
        "woff2" -> "font/woff2"
        "woff" -> "font/woff"
        "ttf" -> "font/ttf"
        "txt" -> "text/plain"
        else -> "application/octet-stream"
    }
}
