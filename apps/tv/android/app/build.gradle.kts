import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// La interfaz es el build web de apps/tv (Mirador), hecho con `npm run build:apk -w apps/tv`,
// que escribe en apps/tv/dist-apk. Se copia dentro del APK en assets/web: la tele arranca
// sin red y solo los datos (/guide/tv/config/:code) van por la red (CLAUDE.md §2).
val webDist = rootProject.file("../dist-apk")
val webAssets = layout.buildDirectory.dir("generated/web-assets")

// Firma de release. La clave vive en la bóveda local (SECRETS.md §TV), nunca en el repo.
// Sin una firma FIJA, cada APK nuevo se rechaza al instalarlo encima del anterior
// («App no instalada») y habría que desinstalar —y repetir el asistente— en cada tele.
val signingProps = Properties()
val signingFile = file(
    System.getenv("VT_TV_SIGNING") ?: "${System.getProperty("user.home")}/.visualtaste/tv-signing.properties",
)
if (signingFile.isFile) signingFile.inputStream().use { stream -> signingProps.load(stream) }

val copyWeb by tasks.registering(Sync::class) {
    from(webDist)
    into(webAssets.map { it.dir("web") })
    doFirst {
        check(webDist.resolve("index.html").isFile) {
            "Falta ${webDist.path}/index.html. Ejecuta antes, desde la raíz del repo: npm run build:apk -w apps/tv"
        }
    }
}

android {
    namespace = "com.visualtastes.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.visualtastes.tv"
        // Android 7: cubre las teles Android TV de 2017 en adelante. Por debajo, el WebView
        // ni siquiera ejecuta el JS que genera Vite.
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        // La misma API que usa apps/tv/src/lib/api.ts por defecto. El asistente de
        // configuración la usa para comprobar el código de emparejamiento.
        buildConfigField("String", "API_URL", "\"https://visualtasteworker.franciscotortosaestudios.workers.dev\"")
        // Origen bajo el que se sirve la interfaz empaquetada. Es el de producción de la TV,
        // que ya está en ALLOWED_ORIGINS (workerCors.js): así el APK no necesita tocar el CORS.
        buildConfigField("String", "WEB_HOST", "\"tv.visualtastes.com\"")
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (signingProps.getProperty("storeFile") != null) {
            create("release") {
                storeFile = File(signingProps.getProperty("storeFile"))
                storePassword = signingProps.getProperty("storePassword")
                keyAlias = signingProps.getProperty("keyAlias")
                keyPassword = signingProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Sin la bóveda, el APK de release sale sin firmar (no instalable): mejor eso que
            // firmarlo con otra clave y romper las actualizaciones de las teles ya instaladas.
            signingConfig = signingConfigs.findByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets["main"].assets.srcDir(webAssets)
}

// Toda tarea que lea los assets (merge, lint, empaquetado) tiene que ir después de la copia.
tasks.configureEach {
    if (name.contains("Assets") || name.contains("lint", ignoreCase = true)) dependsOn(copyWeb)
}
