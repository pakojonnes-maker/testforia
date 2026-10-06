-- 0104 — Qué tele es cada pantalla emparejada.
--
-- El APK de la TV (apps/tv/android) se identifica en el User-Agent con
-- «VisualTasteTV/<versión> (<fabricante>; <modelo>; Android <x>; API <n>)», y
-- workerTvScreen.js lo guarda aquí cada vez que la tele pide su configuración.
-- Sirve para saber la mezcla real de marcas de los pilotos (¿cuántas teles
-- funcionan sin caja?) y qué versión de la app lleva cada tele.
--
-- Solo describe el aparato: nada del huésped. Una tele abierta en un navegador
-- (tv.visualtastes.com) no lleva ese sello y deja las columnas como estaban.
--
-- Orden de despliegue: ESTA migración primero, luego el worker. El worker
-- escribe en una sentencia aparte con try/catch (no rompe la config de la tele),
-- pero los listados del admin (fleet, devices) sí leen estas columnas.

ALTER TABLE guide_tv_devices ADD COLUMN device_manufacturer TEXT;
ALTER TABLE guide_tv_devices ADD COLUMN device_model TEXT;
ALTER TABLE guide_tv_devices ADD COLUMN os_version TEXT;
ALTER TABLE guide_tv_devices ADD COLUMN app_version TEXT;
