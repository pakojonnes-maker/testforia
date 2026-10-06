# Pruebas físicas pendientes: TCL y Fire TV

Lo que el emulador no puede probar. Cada prueba dice qué hacer y qué resultado esperar. Si algo
falla, guarda el registro de la app:

```bash
adb logcat -d -s VisualTasteTV
```

## Antes de empezar (las dos)

1. Compilar el APK de release: `npm run build:apk -w apps/tv` y
   `cd apps/tv/android && ./gradlew assembleRelease`.
2. Un código de emparejamiento **real** del admin, de un apartamento de pruebas.
3. El portátil en el mismo WiFi que la tele.

## TCL (Google TV)

**Preparar**
- [ ] *Ajustes → Sistema → Información*: apunta el modelo y la versión de Android TV.
- [ ] Pulsar OK 7 veces sobre «Compilación del SO» → *Opciones de desarrollador* →
      activar la depuración (USB y por red / inalámbrica).
- [ ] `node scripts/tv-install/instalar-tv.mjs --ip <ip> --code <código>`: debe acabar en «LISTO».
- [ ] **Safety guard → Permission shield → Auto launch permission**: desactivar «Auto manager» y
      activar VisualTaste TV. Si no existe, anótalo.

**Lo que queremos conseguir**
- [ ] Apagar y encender con el mando 3 veces → la bienvenida sale las 3. *¿Cuántos segundos tarda?*
- [ ] Atrás en la bienvenida → sale a la tele. Canal+ / un número → sale a la primera.
- [ ] **Mantener Atrás 3 s** → abre el asistente (no se pudo probar en el emulador).
- [ ] Dejar la tele apagada **más de 1 hora** y encender → sale.
- [ ] **Desenchufar** la tele y volver a enchufar → sale (arranque en frío, unos 8 s tras el inicio).
- [ ] Apagado por inactividad (*Ajustes → Sistema → Energía*: el mínimo que permita) → al encender, sale.
- [ ] Con la **TDT** delante al apagar → al encender, la bienvenida sale encima y Atrás devuelve a la TDT.
- [ ] Con una **entrada HDMI** delante → lo mismo.
- [ ] *Ajustes → Sistema → Energía → Comportamiento al encender*: probar «Inicio de Google TV» y
      «Última entrada». ¿Cambia algo?
- [ ] Encender la tele **mandando un vídeo desde el móvil** (YouTube, si hay Chromecast integrado) →
      ¿la bienvenida tapa el vídeo? (esperado hoy: sí; Atrás lo quita).
- [ ] Usar la tele un rato (Netflix, YouTube) y comprobar que la bienvenida **no aparece sola** sin apagar.

## Fire TV

**Preparar**
- [ ] *Ajustes → Mi Fire TV → Acerca de*: ¿**Fire OS** (7/8) o **Vega OS**? **Si es Vega OS, para
      aquí**: no instala APK de ninguna forma.
- [ ] Pulsar 7 veces sobre el nombre del dispositivo → *Opciones de desarrollador* → **Depuración ADB**.
- [ ] `node scripts/tv-install/instalar-tv.mjs --ip <ip> --code <código>`. Fire OS 8 no tiene
      pantalla para el permiso: el instalador lo concede (`appops` + `pm grant`).

**Lo que queremos conseguir** (las mismas pruebas que la TCL, más estas)
- [ ] Al encender, ¿sale la bienvenida o el inicio de Fire TV la tapa?
- [ ] ¿Pide confirmación Amazon al instalar o al abrir («app bloqueada»)? Anota el texto exacto.

**El Fire TV como «caja» para teles que no son Android** (lo que haríamos en Samsung o LG)
- [ ] Conectar el Fire TV por HDMI a la TCL, **alimentado con su cargador, no del USB de la tele**.
- [ ] Encender la tele con **su** mando → ¿se enciende el Fire TV y la tele cambia sola a su entrada (CEC)?
- [ ] Si no cambia sola: ¿y con el mando del Fire TV?
- [ ] Con la tele en la TDT, apagar y encender → ¿vuelve a la entrada del Fire TV o se queda en la TDT?
- [ ] ¿Se maneja la bienvenida con las flechas del mando de la **tele** (CEC)?
