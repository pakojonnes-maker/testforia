#!/usr/bin/env node
/**
 * Instala VisualTaste TV en una tele Google TV / Android TV (o caja) por ADB, de una vez.
 *
 * Por qué ADB y no un pendrive o Play:
 *  · Muchas teles de alquiler están en «modo básico», sin cuenta de Google: no hay Play.
 *  · Muchas no traen gestor de archivos: el APK de un pendrive no se puede abrir.
 *  · Android 15+ bloquea «Mostrar sobre otras apps» a lo instalado desde un pendrive
 *    («ajustes restringidos»); lo instalado por ADB no tiene ese bloqueo.
 *  · La verificación obligatoria de desarrolladores de Google (teles: desde 2027) deja ADB
 *    fuera, igual que ahora.
 *  · Concede el permiso y lo guarda en disco al momento (`appops write-settings`). Concedido a
 *    mano, Android tarda hasta 30 min en guardarlo y un corte de luz antes lo pierde.
 *
 * En la tele, una vez: Ajustes → Sistema → Información → pulsar 7 veces «Compilación del SO
 * de Android TV»; luego Opciones de desarrollador → «Depuración por USB» y «Depuración
 * inalámbrica» (o «Depuración por red»).
 *
 * Uso (desde la raíz del repo):
 *   node scripts/tv-install/instalar-tv.mjs --ip 192.168.1.40 --code ABC123
 *   node scripts/tv-install/instalar-tv.mjs --pair 192.168.1.40:37123 --pair-code 482913 --ip 192.168.1.40:41235 --code ABC123
 *   node scripts/tv-install/instalar-tv.mjs --serial emulator-5554 --code ABC123
 *
 *   --ip         IP de la tele (puerto 5555 si no se indica). Sin --ip ni --serial, la única conectada.
 *   --pair       Android 11+: «Vincular dispositivo con código» muestra IP:puerto y un código de 6 cifras.
 *   --pair-code  Ese código de 6 cifras.
 *   --code       Código de emparejamiento de VisualTaste (admin → Guía → apartamento → Pantalla TV).
 *   --apk        APK a instalar. Por defecto, el de release si existe; si no, el de depuración.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PKG = 'com.visualtastes.tv'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function findAdb() {
  const candidates = [
    process.env.ADB,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
  ].filter(Boolean)
  return candidates.find(p => fs.existsSync(p)) ?? 'adb'
}

function findApk() {
  const given = arg('apk')
  if (given) return path.resolve(given)
  const out = path.join(ROOT, 'apps/tv/android/app/build/outputs/apk')
  const release = path.join(out, 'release/app-release.apk')
  const debug = path.join(out, 'debug/app-debug.apk')
  if (fs.existsSync(release)) return release
  if (fs.existsSync(debug)) {
    console.warn('AVISO: se instala el APK de DEPURACIÓN. Para una tele de cliente usa el de release (./gradlew assembleRelease).')
    return debug
  }
  throw new Error('No hay APK. Compílalo: npm run build:apk -w apps/tv && cd apps/tv/android && ./gradlew assembleRelease')
}

const ADB = findAdb()
let serial = arg('serial')

function adb(args, { allowFail = false } = {}) {
  const full = serial ? ['-s', serial, ...args] : args
  try {
    return execFileSync(ADB, full, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (e) {
    if (allowFail) return (e.stdout ?? '') + (e.stderr ?? '')
    throw new Error(`adb ${full.join(' ')}\n${e.stderr || e.stdout || e.message}`)
  }
}
const shell = (cmd, opts) => adb(['shell', cmd], opts)
const wait = ms => new Promise(r => setTimeout(r, ms))
const step = msg => console.log(`\n▸ ${msg}`)

async function main() {
  const apk = findApk()
  const code = arg('code')

  const pair = arg('pair')
  if (pair) {
    step(`Vinculando con ${pair}`)
    const out = adb(['pair', pair, arg('pair-code') ?? ''], { allowFail: true })
    console.log(`  ${out}`)
    if (!/Successfully paired/i.test(out)) throw new Error('No se pudo vincular. Revisa el código de 6 cifras y el puerto (cambian cada vez).')
  }

  const ip = arg('ip')
  if (ip) {
    const target = ip.includes(':') ? ip : `${ip}:5555`
    step(`Conectando con ${target}`)
    const out = adb(['connect', target], { allowFail: true })
    console.log(`  ${out}`)
    if (!/connected to/i.test(out)) throw new Error('No conecta. ¿Está activada la depuración en la tele? La primera vez la tele pide aceptar este ordenador: acepta y repite.')
    serial = target
  }

  const state = adb(['get-state'], { allowFail: true })
  if (state !== 'device') throw new Error(`La tele no está lista (${state}). Si pide autorizar el ordenador, acéptalo en la tele.`)

  step('La tele')
  const prop = k => shell(`getprop ${k}`)
  const sdk = Number(prop('ro.build.version.sdk'))
  const maker = prop('ro.product.manufacturer')
  console.log(`  ${maker} ${prop('ro.product.model')} · Android ${prop('ro.build.version.release')} (API ${sdk})`)
  const isTv = /android\.software\.leanback/.test(shell('pm list features', { allowFail: true }))
  if (!isTv) console.warn('  AVISO: no se declara como tele (leanback). Se instala igual.')
  if (sdk < 24) throw new Error('Android anterior a 7: la app no funciona en esta tele. Necesita una caja Google TV.')
  const isFire = /amazon/i.test(maker)
  if (isFire) {
    console.log(`  Fire TV (Fire OS ${prop('ro.build.version.name') || '?'}). No tiene ajuste para «Mostrar sobre otras apps»:`)
    console.log('  este instalador es la única forma de concederlo. Amazon puede recortar apps instaladas a mano en una actualización.')
  }

  step(`Instalando ${path.relative(ROOT, apk)}`)
  const install = adb(['install', '-r', apk], { allowFail: true })
  if (!/Success/.test(install)) {
    if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE/.test(install)) {
      throw new Error('La tele tiene una versión firmada con otra clave (p. ej. la de depuración). Desinstálala: adb uninstall com.visualtastes.tv — y habrá que repetir el asistente.')
    }
    if (/INSTALL_FAILED_VERSION_DOWNGRADE/.test(install)) {
      throw new Error('La tele ya tiene una versión MÁS NUEVA que este APK.')
    }
    throw new Error(`Instalación fallida:\n${install}`)
  }
  console.log('  Instalada')

  step('Permiso «Mostrar sobre otras apps»')
  shell(`appops set ${PKG} SYSTEM_ALERT_WINDOW allow`)
  // Fire OS 8 no tiene pantalla para este permiso; las apps de cartelería lo conceden además
  // con pm grant. En Android/Google TV da error («not a changeable permission»): se ignora.
  shell(`pm grant ${PKG} android.permission.SYSTEM_ALERT_WINDOW`, { allowFail: true })
  // Sin esto Android lo guarda hasta 30 min después: un corte de luz antes lo perdería.
  shell('cmd appops write-settings', { allowFail: true })
  const granted = /allow/.test(shell(`appops get ${PKG} SYSTEM_ALERT_WINDOW`))
  console.log(granted ? '  Concedido y guardado' : '  NO se pudo conceder: hazlo desde el asistente de la app')

  step('Fuera del ahorro de batería (que no le corten el servicio de encendido)')
  console.log(`  ${shell(`dumpsys deviceidle whitelist +${PKG}`, { allowFail: true }) || 'hecho'}`)

  step(code ? `Emparejando con el código ${code}` : 'Abriendo el asistente (sin --code: el código se mete con el mando)')
  const extras = code ? ['--es', 'code', code, '--ez', 'start', 'true'] : []
  adb(['shell', 'am', 'start', '-n', `${PKG}/.SetupActivity`, ...extras])
  await wait(code ? 9000 : 3000)

  const top = shell('dumpsys activity activities', { allowFail: true }).match(/topResumedActivity=.*?\{[^ ]+ [^ ]+ ([^ }]+)/)?.[1] ?? '?'
  const ok = top.endsWith('.MainActivity')
  console.log(`  Delante: ${top}`)

  console.log('\n' + '─'.repeat(60))
  if (code && ok) console.log('LISTO: la bienvenida está en pantalla y saldrá cada vez que se encienda la tele.')
  else if (code) console.log('El código no se validó (¿sin internet en la tele, o código inexistente?). Revísalo en la pantalla de la tele.')
  else console.log('Instalada. Termina en la tele: código de emparejamiento y «Empezar».')
  if (/tcl/i.test(maker)) {
    console.log('\nTCL: abre Safety guard → Permission shield → Auto launch permission,')
    console.log('desactiva «Auto manager» y activa VisualTaste TV. Sin esto, TCL no la deja abrirse sola.')
  }
  console.log('Por seguridad, puedes desactivar la depuración en Opciones de desarrollador.')
}

main().catch(e => {
  console.error(`\nERROR: ${e.message}`)
  process.exit(1)
})
