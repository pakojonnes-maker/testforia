-- 0108 — Índice por IP en security_audit_log
--
-- Los límites de intentos de las rutas públicas (login con contraseña, login con
-- Google, PIN de sellos) dejan de contar en KV y pasan a contar los fallos que ya
-- se escriben en esta tabla: recentEventsByIp() en workerAudit.js pide, en cada
-- intento, los eventos de UNA IP en la última hora.
--
-- Sin este índice esa consulta entra por idx_audit_created y lee todos los
-- eventos de la última hora, de cualquier IP. Con la tabla tranquila da igual;
-- bajo un ataque repartido entre muchas IPs, cada intento leería miles de filas
-- y el cupo diario de lecturas de D1 (plan Free) se iría en protegerse.
--
-- No cambia datos. El worker funciona igual antes y después de aplicarla.

CREATE INDEX IF NOT EXISTS idx_audit_ip_created ON security_audit_log(ip, created_at);
