// Test del guardia de autorización por tenant (workerAuthz.js).
// Ejecutar:  npm run test:authz
//
// El repo no declara "type": "module", así que Node interpretaría workerAuthz.js
// como CommonJS y fallaría al leer sus exports. Wrangler sí lo bundlea como ESM.
// Para no tocar la configuración del repo por un test, lo cargamos como módulo
// ESM vía data: URL. Funciona porque workerAuthz.js no importa nada.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../workerAuthz.js', import.meta.url), 'utf8');
const { checkRestaurantScope, requireRole } = await import(
    'data:text/javascript;base64,' + Buffer.from(src).toString('base64')
);

// --- D1 simulado -----------------------------------------------------------
// Dos restaurantes. Ana es owner de A. Beto es staff de B.
const DB_ROWS = {
    restaurants: [
        { id: 'rest_A', slug: 'casa-ana' },
        { id: 'rest_B', slug: 'bar-beto' },
    ],
    restaurant_staff: [
        { restaurant_id: 'rest_A', user_id: 'u_ana', role: 'owner', is_active: 1 },
        { restaurant_id: 'rest_A', user_id: 'u_cocina', role: 'staff', is_active: 1 },
        { restaurant_id: 'rest_B', user_id: 'u_beto', role: 'owner', is_active: 1 },
        { restaurant_id: 'rest_A', user_id: 'u_ex', role: 'staff', is_active: 0 }, // despedido
    ],
    dishes: [{ id: 'dish_A1', restaurant_id: 'rest_A' }],
    menus: [{ id: 'menu_B1', restaurant_id: 'rest_B' }],
    dish_media: [{ id: 'med_A1', dish_id: 'dish_A1' }],
    marketing_campaigns: [{ id: 'camp_B1', restaurant_id: 'rest_B' }],
    reservations: [{ id: 'resv_A1', restaurant_id: 'rest_A' }],
};

let queryCount = 0;
const env = {
    DB: {
        prepare(sql) {
            return {
                bind(...args) {
                    return {
                        async first() {
                            queryCount++;
                            const s = sql.replace(/\s+/g, ' ');
                            // getRestaurantAccess: una sola consulta con LEFT JOIN.
                            // bind(userId, slugOrId, slugOrId)
                            if (s.includes('FROM restaurants r')) {
                                const [userId, ref] = args;
                                const rest = DB_ROWS.restaurants.find(
                                    (x) => x.id === ref || x.slug === ref
                                );
                                if (!rest) return null;
                                const staff = DB_ROWS.restaurant_staff.find(
                                    (x) => x.restaurant_id === rest.id && x.user_id === userId && x.is_active
                                );
                                return { restaurant_id: rest.id, role: staff ? staff.role : null };
                            }
                            if (s.includes('FROM dish_media')) {
                                const m = DB_ROWS.dish_media.find((x) => x.id === args[0]);
                                if (!m) return null;
                                const d = DB_ROWS.dishes.find((x) => x.id === m.dish_id);
                                return d ? { restaurant_id: d.restaurant_id } : null;
                            }
                            for (const t of ['dishes', 'menus', 'marketing_campaigns', 'reservations']) {
                                if (s.includes(`FROM ${t}`)) {
                                    const r = DB_ROWS[t].find((x) => x.id === args[0]);
                                    return r ? { restaurant_id: r.restaurant_id } : null;
                                }
                            }
                            return null;
                        },
                    };
                },
            };
        },
    },
};

const ANA = { userId: 'u_ana', is_superadmin: false };
const COCINA = { userId: 'u_cocina', is_superadmin: false };
const BETO = { userId: 'u_beto', is_superadmin: false };
const EX = { userId: 'u_ex', is_superadmin: false };
const ROOT = { userId: 'u_root', is_superadmin: true };

let pass = 0, fail = 0;

/** Construye una Request equivalente a la que llegaría al worker. */
function req(path, { method = 'GET', body = null } = {}) {
    return new Request('https://api.visualtastes.com' + path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
}

async function check(label, path, user, expect, opts) {
    const r = await checkRestaurantScope(req(path, opts), env, user);
    const got = r.denied ? 'DENY' : r.scoped ? 'ALLOW' : 'SKIP';
    const ok = got === expect;
    ok ? pass++ : fail++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(52)} ${got.padEnd(5)} (esperado ${expect})`);
}

console.log('\n--- Capa 1: restaurante en la ruta ---');
await check('Ana entra en su restaurante (por id)', '/restaurants/rest_A/menus', ANA, 'ALLOW');
await check('Ana entra en su restaurante (por slug)', '/restaurants/casa-ana/menus', ANA, 'ALLOW');
await check('Ana intenta entrar en el de Beto', '/restaurants/rest_B/menus', ANA, 'DENY');
await check('Ana lista el staff ajeno', '/restaurants/rest_B/users', ANA, 'DENY');
await check('Ana resetea la contraseña de Beto', '/restaurants/rest_B/users/u_beto/reset-password', ANA, 'DENY');
await check('Beto se autoañade al restaurante de Ana', '/restaurants/rest_A/users', BETO, 'DENY');
await check('Ex-empleado (is_active=0) vuelve a entrar', '/restaurants/rest_A/menus', EX, 'DENY');
await check('Superadmin entra en cualquiera', '/restaurants/rest_B/users', ROOT, 'ALLOW');
await check('Restaurante inexistente', '/restaurants/rest_ZZZ/menus', ANA, 'DENY');
await check('/restaurants/by-slug no es un tenant', '/restaurants/by-slug/casa-ana', ANA, 'SKIP');
await check('/api/restaurants/{id}/... también cubierto', '/api/restaurants/rest_B/notifications/send', ANA, 'DENY');

console.log('\n--- Capa 2: recurso hijo sin restaurante en la ruta ---');
await check('Ana edita su propio plato', '/dishes/dish_A1', ANA, 'ALLOW');
await check('Beto edita el plato de Ana', '/dishes/dish_A1', BETO, 'DENY');
await check('Ana borra el menú de Beto', '/menus/menu_B1', ANA, 'DENY');
await check('Beto borra media del plato de Ana', '/media/med_A1', BETO, 'DENY');
await check('Ana toca la campaña de Beto', '/api/campaigns/camp_B1', ANA, 'DENY');
await check('Beto lee la reserva de Ana', '/reservations/resv_A1', BETO, 'DENY');
await check('Superadmin toca cualquier recurso', '/menus/menu_B1', ROOT, 'ALLOW');
await check('Ruta no-recurso: /reservations/availability', '/reservations/availability', ANA, 'SKIP');
await check('Ruta no-recurso: /reservations/admin/list', '/reservations/admin/list', ANA, 'SKIP');
await check('Ruta no-recurso: /media/upload', '/media/upload', ANA, 'SKIP');
await check('Ruta sin tenant: /allergens', '/allergens', ANA, 'SKIP');

console.log('\n--- Capa 3: restaurante en la query ---');
await check('Ana lee su analítica', '/analytics?restaurant_id=rest_A', ANA, 'ALLOW');
await check('Ana lee la analítica de Beto', '/analytics?restaurant_id=rest_B', ANA, 'DENY');
await check('Beto lee los platos top de Ana', '/analytics/dishes?restaurant_id=rest_A', BETO, 'DENY');
await check('Superadmin lee cualquier analítica', '/analytics?restaurant_id=rest_B', ROOT, 'ALLOW');

console.log('\n--- Capa 4: restaurante en el body ---');
await check('Ana crea un plato en su restaurante', '/dishes', ANA, 'ALLOW',
    { method: 'POST', body: { restaurant_id: 'rest_A', price: 10 } });
await check('Ana crea un plato en el de Beto', '/dishes', ANA, 'DENY',
    { method: 'POST', body: { restaurant_id: 'rest_B', price: 10 } });
await check('Ana notifica a los clientes de Beto', '/api/notifications/send', ANA, 'DENY',
    { method: 'POST', body: { restaurant_id: 'rest_B', title: 'spam' } });
await check('Body sin restaurant_id no bloquea', '/dishes', ANA, 'SKIP',
    { method: 'POST', body: { price: 10 } });
await check('Body no-JSON no rompe la request', '/dishes', ANA, 'SKIP', { method: 'POST' });

console.log('\n--- Elevación de rol (gestión de staff exige owner) ---');
function checkRole(label, user, expectDenied) {
    return checkRestaurantScope(req('/restaurants/rest_A/users'), env, user).then((r) => {
        const denial = r.denied ? 'sin acceso al tenant' : requireRole(r.access, 'owner');
        const ok = !!denial === expectDenied;
        ok ? pass++ : fail++;
        console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(52)} ${denial ? 'DENY' : 'ALLOW'}`);
    });
}
await checkRole('Ana (owner) gestiona staff de su restaurante', ANA, false);
await checkRole('Cocina (staff) intenta gestionar staff', COCINA, true);
await checkRole('Beto (owner de otro) gestiona staff de Ana', BETO, true);

console.log(`\n${pass} ok, ${fail} fail  (${queryCount} consultas D1 simuladas)`);
process.exit(fail ? 1 : 0);
