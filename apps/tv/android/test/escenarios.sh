#!/usr/bin/env bash
# Batería de pruebas de VisualTaste TV contra lo que queremos conseguir:
#   1) aparece al encender  2) se salta fácil con el mando  3) vuelve tras apagar / apagado solo / reinicio
# Requiere: emulador arrancado, APK instalado, permiso concedido y código de prueba guardado.
ADB="$(cygpath -u "$LOCALAPPDATA")/Android/Sdk/platform-tools/adb.exe"
OUT="${1:-.}"; mkdir -p "$OUT"
PKG=com.visualtastes.tv
pass=0; fail=0

top() { "$ADB" shell "dumpsys activity activities | grep -m1 topResumedActivity" 2>/dev/null | sed 's/.*u0 //; s/[ }].*//'; }
awake() { "$ADB" shell dumpsys power | grep -m1 -o 'mWakefulness=[A-Za-z]*' | cut -d= -f2; }
wait_s() { "$ADB" shell sleep "$1"; }
check() { # nombre, esperado (subcadena de la actividad delante)
  local got; got="$(top)"
  if [[ "$got" == *"$2"* ]]; then echo "PASA  | $1 | $got"; pass=$((pass+1)); else echo "FALLA | $1 | esperado *$2*, delante: $got"; fail=$((fail+1)); fi
}
home() { "$ADB" shell input keyevent KEYCODE_HOME; wait_s 2; }
sleep_wake() { "$ADB" shell input keyevent KEYCODE_SLEEP; wait_s 3; "$ADB" shell input keyevent KEYCODE_WAKEUP; wait_s 5; }
LAUNCHER="$(home; top)"
echo "Inicio de esta tele: $LAUNCHER"; echo

echo "== 1. Aparece al encender (3 veces seguidas, con el inicio delante)"
for i in 1 2 3; do
  home; "$ADB" shell input keyevent KEYCODE_BACK; wait_s 1   # por si la bienvenida quedó delante
  home; sleep_wake; check "encendido $i con el inicio delante" "$PKG/.MainActivity"
  "$ADB" exec-out screencap -p > "$OUT/encendido-$i.png"
done

echo "== 2. Se salta fácil con el mando"
check "la bienvenida está delante" "$PKG/.MainActivity"
"$ADB" shell input keyevent KEYCODE_DPAD_CENTER; wait_s 2
check "OK entra en una sección (sigue en la app)" "$PKG/.MainActivity"
"$ADB" shell input keyevent KEYCODE_BACK; wait_s 2
check "Atrás desde una sección vuelve al inicio de la app" "$PKG/.MainActivity"
"$ADB" shell input keyevent KEYCODE_BACK; wait_s 2
check "Atrás en el inicio sale a la tele" "${LAUNCHER%%/*}"
sleep_wake; check "vuelve a salir al encender" "$PKG/.MainActivity"
"$ADB" shell input keyevent KEYCODE_CHANNEL_UP; wait_s 2
check "Canal+ sale a la tele a la primera" "${LAUNCHER%%/*}"
sleep_wake; "$ADB" shell input keyevent KEYCODE_5; wait_s 2
check "un número sale a la tele a la primera" "${LAUNCHER%%/*}"

echo "== 3a. Encender con otra app abierta: aparece encima y Atrás devuelve a ella"
"$ADB" shell am start -a android.settings.SETTINGS >/dev/null; wait_s 3
OTHER="$(top)"
sleep_wake; check "aparece encima de $OTHER" "$PKG/.MainActivity"
"$ADB" shell input keyevent KEYCODE_BACK; wait_s 2
check "Atrás devuelve a lo que había" "${OTHER%%/*}"

echo "== 3b. La tele se apaga sola por inactividad y al encenderla vuelve"
# En una tele Android el apagado por inactividad es `sleep_timeout` (secure), no screen_off_timeout.
# El emulador además trae «mantener encendida mientras está enchufada» (stay_on_while_plugged_in=1),
# que una tele real no tiene: sin quitarlo, nunca se apaga sola.
OLD_SLEEP="$("$ADB" shell settings get secure sleep_timeout | tr -d '\r')"
OLD_STAYON="$("$ADB" shell settings get global stay_on_while_plugged_in | tr -d '\r')"
"$ADB" shell settings put global stay_on_while_plugged_in 0
"$ADB" shell settings put secure sleep_timeout 15000
home; wait_s 25
state="$(awake)"; echo "      estado tras 25 s sin tocar el mando: $state"
if [ "$state" != "Awake" ]; then echo "PASA  | la tele se apagó sola"; pass=$((pass+1)); else echo "FALLA | la tele no se apagó sola"; fail=$((fail+1)); fi
"$ADB" shell input keyevent KEYCODE_WAKEUP; wait_s 5
check "tras apagarse sola, al encender aparece" "$PKG/.MainActivity"
echo "      (bienvenida delante y sin tocar nada, ¿se apaga sola también?)"; wait_s 25
state="$(awake)"; echo "      estado: $state"
if [ "$state" != "Awake" ]; then echo "PASA  | con la bienvenida delante la tele también se apaga sola (no bloquea el ahorro)"; pass=$((pass+1)); else echo "FALLA | la bienvenida impide que la tele se apague"; fail=$((fail+1)); fi
"$ADB" shell input keyevent KEYCODE_WAKEUP; wait_s 5
check "y al encender, vuelve a estar" "$PKG/.MainActivity"
"$ADB" shell settings put secure sleep_timeout "${OLD_SLEEP:-1200000}"
"$ADB" shell settings put global stay_on_while_plugged_in "${OLD_STAYON:-1}"

echo "== 3c. Reinicio (ordenado, como Ajustes > Reiniciar o un mando que reinicia)"
"$ADB" logcat -c
"$ADB" shell svc power reboot; "$ADB" wait-for-disconnect 2>/dev/null
timeout 400 "$ADB" wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
wait_s 15
check "tras reiniciar aparece sola" "$PKG/.MainActivity"
"$ADB" exec-out screencap -p > "$OUT/tras-reinicio.png"

echo; echo "Resultado: $pass pasan, $fail fallan"
echo "Log de la app:"; "$ADB" logcat -d -s VisualTasteTV | grep -v '^---' | tail -8
