// security_audit_log de mentira para los D1 simulados de las suites.
//
// Los límites de intentos de las rutas públicas (login, Google, PIN de sellos) cuentan los fallos
// que se escriben en esa tabla (recentEventsByIp en workerAudit.js), así que un D1 simulado que
// tire los INSERT y devuelva [] a todo deja esos límites sin probar: nunca saltarían.
//
// Uso, dentro del `prepare(sql)` de cada suite:
//   run():  if (s.startsWith('INSERT INTO security_audit_log')) audit.insert(args);
//   all():  if (s.includes('FROM security_audit_log')) return { results: audit.select(args) };

/** Mismo formato que CURRENT_TIMESTAMP en SQLite: 'YYYY-MM-DD HH:MM:SS', UTC. */
const stamp = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

export function makeAuditLog() {
    const rows = [];
    return {
        rows,
        /** `args` en el orden del INSERT de logSecurityEvent. `at` permite sembrar eventos antiguos. */
        insert(args, at = Date.now()) {
            const [, event_type, user_id, , restaurant_id, ip, , detail] = args;
            rows.push({ event_type, user_id, restaurant_id, ip, detail, created_at: stamp(at) });
        },
        /** Atajo para sembrar: seed('login_failed', '192.0.2.1', { email }, { at, restaurantId }). */
        seed(type, ip, detail = null, { at = Date.now(), restaurantId = null } = {}) {
            this.insert([null, type, null, null, restaurantId, ip, null, detail ? JSON.stringify(detail) : null], at);
        },
        /** El SELECT de recentEventsByIp: bind(ip, desde, ...tipos), lo más nuevo primero, 200 como mucho. */
        select(args) {
            const [ip, since, ...types] = args;
            return rows
                .filter((r) => r.ip === ip && r.created_at > since && types.includes(r.event_type))
                .reverse()
                .slice(0, 200);
        },
    };
}
