# VisualTaste TV — APK de Android TV

Envoltorio nativo (Kotlin, sin dependencias) de la app de la TV (`apps/tv`, Mirador) para teles
Google TV / Android TV (Sony, TCL, Xiaomi, Philips…) y cajas Google TV (Xiaomi TV Box,
Chromecast con Google TV, Google TV Streamer). La investigación que lleva a este diseño está en
`ANALISIS_TV_INSTALACION.md` (raíz, solo en local).

## Qué hace

- **Aparece al encender la tele**:
  - `WakeService`, un servicio en primer plano, escucha `SCREEN_ON`. Cuando una tele Android se
    enciende con el mando no hay `BOOT_COMPLETED`, solo `SCREEN_ON`, y ese aviso no llega a
    receptores declarados en el manifiesto.
  - `BootReceiver` cubre el arranque en frío.
  - Se espera 2,5 s tras encender y 8 s tras arrancar.
- **Se quita con el mando**:
  - Atrás vuelve atrás dentro de Mirador (`window.vtTvBack()`) y en el inicio sale a la tele.
  - Canal±, números, TV, Fuente y Guía salen a la primera.
  - Al salir, la actividad termina: el siguiente encendido abre la bienvenida desde cero.
- **La interfaz va dentro del APK**: `WebAssets` sirve `assets/web` (el build de
  `npm run build:apk`) bajo `https://tv.visualtastes.com`, que ya está en `ALLOWED_ORIGINS`.
  Arranca sin red y no hay que tocar el CORS del worker. Solo los datos van por la red
  (`/guide/tv/config/:code`).
- **Asistente para el anfitrión** (`SetupActivity`): pide el código de emparejamiento (lo
  comprueba contra la API), lleva a «Mostrar sobre otras apps» y, en TCL, explica el candado
  Safety guard. Se vuelve a él manteniendo Atrás 3 s en la bienvenida.

## Compilar

Requisitos: JDK 17 y el SDK de Android (plataforma 35). En la máquina de Francisco:
`%USERPROFILE%\.jdks\jdk-17*` y `%LOCALAPPDATA%\Android\Sdk`.

```bash
npm run build:apk -w apps/tv          # → apps/tv/dist-apk (NO toca apps/tv/dist, que es lo de Pages)
cd apps/tv/android
./gradlew assembleDebug               # → app/build/outputs/apk/debug/app-debug.apk
```

Gradle copia `apps/tv/dist-apk` dentro del APK. Si falta, la compilación falla diciendo qué
ejecutar.

## Qué tele es cada pantalla

`DeviceInfo.kt` añade al User-Agent `VisualTasteTV/<versión> (<fabricante>; <modelo>; Android <x>; API <n>)`,
tanto en el WebView como en la comprobación del asistente. `workerTvScreen.js` lo guarda en
`guide_tv_devices` (migración 0104), y el admin lo enseña en cada tele y en «Estado de las
pantallas», con un recuento por marca: la mezcla real de los pilotos, para saber cuántas teles
funcionan sin caja. El formato es un contrato con `TV_APP_UA` del worker.

## Firma

`./gradlew assembleRelease` firma con la clave de la bóveda (`%USERPROFILE%\.visualtaste\`,
SECRETS.md). **Para teles de clientes, siempre el APK de release.** El de depuración va firmado con
otra clave, así que pasar de uno a otro exige desinstalar y repetir el asistente. El instalador lo
detecta (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) y lo explica.

## Instalar en una tele

### 1. Por ADB con el instalador (recomendado)

```bash
node scripts/tv-install/instalar-tv.mjs --ip <ip-de-la-tele> --code <código>
```

En la tele, una vez: *Ajustes → Sistema → Información*, pulsar OK 7 veces sobre «Compilación del
SO de Android TV»; después *Opciones de desarrollador → Depuración* (USB y por red / inalámbrica).
Con Android 11+ y depuración inalámbrica: `--pair ip:puerto --pair-code 123456`.

Por qué es la vía buena:
- **No necesita cuenta de Google ni gestor de archivos.** Muchas teles de alquiler están en modo
  básico, sin Play.
- **Concede el permiso y lo guarda en disco al momento** (`appops write-settings`). Concedido a
  mano, Android tarda hasta 30 min en guardarlo y un corte de luz antes lo pierde: comprobado en el
  emulador, y con el instalador sobrevive a un reinicio brusco.
- **Android 15+ no la marca como «ajustes restringidos»**: ADB no cuenta como origen desconocido.
- **Queda fuera de la verificación de desarrolladores de Google**, que obligará a registrar las
  apps instaladas fuera de Play en teles certificadas a partir de 2027. ADB está exento.
- La saca del ahorro de batería y deja la tele emparejada (`--code`).
- En TCL recuerda el candado de Safety guard.

### 2. Con un pendrive

Copiar `app-release.apk` a un pendrive FAT32/exFAT y abrirlo en la tele con un gestor de archivos.
Muchas TCL traen uno; si no, hay que instalar uno desde Play, lo que exige cuenta de Google. Hay que
permitir «Instalar apps desconocidas» a ese gestor (en Google TV: Opciones de desarrollador o
*Privacidad → Seguridad*). Después, el asistente de la app guía el permiso.
- En Android 15+ el interruptor sale bloqueado: el asistente lo detecta y lleva a la ficha de la
  app para «Permitir ajustes restringidos». **Sin verificar**: no se pudo reproducir en el emulador,
  porque la consola no puede actuar como gestor de archivos.
- Play Protect puede avisar de «app desconocida» → «Instalar de todas formas».
- Riesgo de los 30 min: el asistente lo avisa.

### 3. Google Play (más adelante)

Actualizaciones automáticas, pero solo en teles con cuenta de Google y con la app publicada (ficha,
revisión, justificar el servicio `specialUse`). Para el registro de desarrollador de 2027 hará falta
igualmente la huella de la clave de firma (SECRETS.md).

## Batería automática (`test/escenarios.sh`)

Repite lo que queremos conseguir en un emulador ya preparado: APK instalado, permiso concedido y
código de prueba guardado.
1. Aparece al encender, 3 veces seguidas.
2. Se salta con el mando: OK, Atrás dentro de la app, Atrás en el inicio, Canal+, un número.
3. Vuelve a salir:
   - encima de otra app abierta, y Atrás devuelve a ella;
   - cuando la tele se apaga sola por inactividad (y la bienvenida no impide ese apagado);
   - tras un reinicio.

```bash
bash test/escenarios.sh <carpeta-para-capturas>
```

Para simular el apagado por inactividad, el script quita «mantener encendida mientras está
enchufada» (el emulador lo trae activado y una tele no) y baja `sleep_timeout`, que es el apagado
por inactividad de Android TV, no `screen_off_timeout`. Al acabar deja los dos como estaban.

**Google TV 13 (API 33, WebView 101), oct-2026: 17 de 17.** Es la versión típica de las TCL, Sony
y Xiaomi de 2022-2024. Mirador se ve igual con ese motor web de 2022. La prueba encontró un fallo
ya corregido: el teclado de Google TV se abría solo en el asistente y se quedaba con las flechas
del mando (`stateHidden`).

## Probado a mano en el emulador (Android TV 14, 1920×1080, oct-2026)

- Asistente: código inexistente → «no existe» contra la API real; botón de ajustes → abre
  «Allow display over other apps» y el permiso se concede con el mando, sin ADB.
- Bienvenida: Mirador carga desde el APK, con fuentes e imágenes.
- OK entra en una sección, Atrás vuelve, Atrás en el inicio sale a la tele.
- Apagar y encender con el inicio de Android TV delante → aparece. Con los Ajustes abiertos →
  aparece encima, y Atrás devuelve a los Ajustes. Canal+ → sale.
- Reinicio ordenado → aparece sola a los 8 s.

**Google TV 16 (API 36, WebView 143), oct-2026:** el instalador instala, concede y guarda el
permiso y abre el asistente. **Android TV 14:** el instalador rechaza con un mensaje claro un APK
firmado con otra clave, y el permiso sobrevive a un `adb reboot` justo después de instalar.

## Modo «dueño del dispositivo» (prueba de viabilidad, Google TV 16, oct-2026)

`DeviceOwner.kt` + `AdminReceiver`. Las órdenes de prueba (`DebugOwnerReceiver`) solo existen en
la versión de depuración. Se activa por ADB en una tele **sin cuentas de Google**:
`adb shell dpm set-device-owner com.visualtastes.tv/.AdminReceiver`.

| Capacidad | Resultado |
|---|---|
| Activarlo en Google TV en modo básico (0 cuentas) | ✅ |
| **Borrar los datos de otra app** (sesiones de Netflix/YouTube en el check-out) | ✅ `clearApplicationUserData` → true |
| **Actualizarse sola** | ⚠️ **Play Protect la para**: «Unsafe app blocked: no ha visto apps de este desarrollador». Hay «Install anyway», pero alguien tiene que pulsarlo en la tele. Haría falta que Google conozca la app (verificación de desarrollador / Play) |
| Sigue siendo dueña y conserva el permiso tras actualizarse | ✅ |
| **Ser la pantalla de inicio** | ⚠️ El rol de inicio pasa a la app, pero **Google TV intercepta la tecla Home** y abre su lanzador igualmente. Solo funciona desactivando el lanzador de Google TV, y entonces la app necesita su propia rejilla de apps (el modelo de GuestBox/Hostary) |
| Dejar de ser dueña (`release()`) | ✅ La tele vuelve a su estado normal |

Encaja en **nuestra propia caja** (Google TV certificada sin cuenta). En la tele de un cliente con
cuenta de Google no se puede activar.

## Trampas del emulador

- Al crear el AVD con `avdmanager` sale `hw.keyboard = no`: ni el teclado del PC ni el mando del
  panel llegan a Android. Hay que poner `hw.keyboard = yes` en
  `~/.android/avd/<nombre>.avd/config.ini`.
- Aun así, con el emulador 37.2 y estas imágenes de tele, `adb emu event send` no llega ni al
  núcleo (`getevent` no ve nada): para probar teclas, `adb shell input keyevent`.
- **«Forzar detención»** (o `am force-stop`) deja la app detenida, y Android no le entrega el
  arranque hasta que alguien la abre a mano: la bienvenida deja de salir. Pasa igual en una tele
  real si alguien toca ese botón en los ajustes.

## Sin probar todavía

- **Mantener Atrás 3 s**: la herramienta `input` del emulador no puede mantener una tecla, y
  la consola del emulador no hace llegar teclas a esta imagen. Hay que probarlo con un mando real.
- **Teles reales**: TCL (Safety guard), Sony, Xiaomi, y despertar tras horas de reposo.
- **Encendidos de terceros**: si alguien enciende la tele mandando Netflix desde el móvil o con
  una consola por CEC, hoy la bienvenida se pone encima y el huésped tiene que pulsar Atrás.
- **Firma de release y Google Play**: la keystore es un secreto (fuera del repo, ver SECRETS.md),
  y Play pedirá justificar el servicio `specialUse`. El texto está en el manifiesto.

## Probar en el emulador

```bash
emulator -avd vt_tv -no-snapshot -no-audio -gpu swiftshader_indirect
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell input keyevent KEYCODE_SLEEP; adb shell input keyevent KEYCODE_WAKEUP
adb logcat -s VisualTasteTV
```

Un código de prueba sin pasar por la API (solo en la versión de depuración):
`adb shell "run-as com.visualtastes.tv sh -c 'cat > shared_prefs/visualtaste_tv.xml'" < prefs.xml`.

Con un código real, cada consulta de la pantalla actualiza el `last_seen_at` de esa tele en
producción.
