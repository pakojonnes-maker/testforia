import { verifyJWT } from './workerAuthentication.js';

// ===========================================================================
// CLOUDFLARE WORKER - SECTIONS API
// ===========================================================================

// CORS - Dominios permitidos
const ALLOWED_ORIGINS = [
    'https://admin.visualtastes.com',
    'https://menu.visualtastes.com',
    'https://visualtastes.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://menu.localhost:5173',
    'http://admin.localhost:5174'
];

function getCorsHeaders(request) {
    const origin = request?.headers?.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

function createResponse(body, status = 200, request = null) {
    return new Response(JSON.stringify(body), {
        status,
        headers: getCorsHeaders(request)
    });
}

async function authenticateRequest(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return await verifyJWT(token, env.JWT_SECRET);
}

export async function handleSectionRequests(request, env) {
    const url = new URL(request.url);
    console.log(`[Sections] Procesando: ${request.method} ${url.pathname}`);

    // =============================================
    // ICONOS DEL SISTEMA
    // =============================================

    // GET /system/icons - Listar iconos disponibles (público)
    if (request.method === "GET" && url.pathname === "/system/icons") {
        try {
            console.log('[Sections] Listando iconos del sistema desde R2');

            const iconsList = await env.R2_BUCKET.list({
                prefix: 'System/icons/',
                delimiter: ''
            });

            const icons = (iconsList.objects || []).map(obj => ({
                filename: obj.key.replace('System/icons/', ''),
                url: `${url.origin}/media/${obj.key}`,
                size: obj.size
            }));

            console.log(`[Sections] Se encontraron ${icons.length} iconos`);

            return createResponse({
                success: true,
                icons: icons
            });
        } catch (error) {
            console.error("[Sections] Error al listar iconos:", error);
            return createResponse({
                success: false,
                message: "Error al obtener iconos: " + error.message
            }, 500);
        }
    }

    // =============================================
    // MENÚS (MENUS)
    // =============================================

    // Endpoint para obtener menús por restaurante (RESTful)
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[\w-]+\/menus$/)) {
        const restaurantId = url.pathname.split('/')[2];

        try {
            console.log(`[Sections] Obteniendo menús para restaurante ${restaurantId}`);

            const menusData = await env.DB.prepare(`
        SELECT id, name, is_default, description
        FROM menus
        WHERE restaurant_id = ?
        ORDER BY is_default DESC, id ASC
      `).bind(restaurantId).all();

            console.log(`[Sections] Se encontraron ${menusData.results?.length || 0} menús`);

            return createResponse({
                success: true,
                menus: menusData.results || []
            });
        } catch (error) {
            console.error("[Sections] Error al obtener menús:", error);
            return createResponse({
                success: false,
                message: "Error al obtener menús: " + error.message
            }, 500);
        }
    }

    // Endpoint tradicional para obtener menús (compatibilidad)
    if (request.method === "GET" && url.pathname === "/menus") {
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get('restaurant_id');

        if (!restaurantId) {
            return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
        }

        try {
            console.log(`[Sections] Obteniendo menús para restaurante ${restaurantId} (ruta legacy)`);

            const menusData = await env.DB.prepare(`
        SELECT id, name, is_default, description
        FROM menus
        WHERE restaurant_id = ?
        ORDER BY is_default DESC, id ASC
      `).bind(restaurantId).all();

            return createResponse({
                success: true,
                menus: menusData.results || []
            });
        } catch (error) {
            console.error("[Sections] Error al obtener menús:", error);
            return createResponse({
                success: false,
                message: "Error al obtener menús: " + error.message
            }, 500);
        }
    }

    // =============================================
    // SECCIONES (SECTIONS)
    // =============================================

    // Endpoint público RESTful para obtener secciones por restaurante
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[\w-]+\/sections$/)) {
        const restaurantId = url.pathname.split('/')[2];
        const includeDishes = url.searchParams.get('include_dishes') === 'true';
        // ✅ Detectar si es contexto admin (tiene JWT válido)
        const userData = await authenticateRequest(request);
        const isAdmin = !!userData;
        return await getSectionsForRestaurant(restaurantId, env, includeDishes, isAdmin);
    }

    // Endpoint original para obtener secciones (mantener por compatibilidad)
    if (request.method === "GET" && url.pathname === "/sections") {
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get('restaurant_id');
        const includeDishes = params.get('include_dishes') === 'true';

        if (!restaurantId) {
            return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
        }

        // ✅ Detectar si es contexto admin (tiene JWT válido)
        const userData = await authenticateRequest(request);
        const isAdmin = !!userData;
        return await getSectionsForRestaurant(restaurantId, env, includeDishes, isAdmin);
    }

    // Endpoint para manejar secciones (crear/actualizar) - REQUIERE AUTENTICACIÓN
    if ((request.method === "POST" || request.method === "PUT") && url.pathname.match(/^\/sections(\/[\w_-]+)?$/)) {
        // ✅ Verificar autenticación
        const userData = await authenticateRequest(request);
        if (!userData) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }

        try {
            const data = await request.json();
            const isNew = request.method === "POST" || !url.pathname.includes('/');
            const sectionId = isNew ? `sect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : url.pathname.split('/').pop();
            const { restaurant_id, menu_id, translations, order_index, icon_url, bg_color, is_visible } = data;

            if (!restaurant_id) {
                return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
            }

            if (!menu_id) {
                return createResponse({ success: false, message: "Menu ID requerido" }, 400);
            }

            // Verificar que el menú existe
            const menuExists = await env.DB.prepare(`
        SELECT id FROM menus WHERE id = ? AND restaurant_id = ?
      `).bind(menu_id, restaurant_id).first();

            if (!menuExists) {
                return createResponse({
                    success: false,
                    message: "El menú especificado no existe. Por favor, crea primero un menú."
                }, 400);
            }

            try {
                // Obtener el orden máximo actual para insertar al final si es necesario
                let maxOrder = 1;
                if (isNew) {
                    const orderResult = await env.DB.prepare(`
            SELECT MAX(order_index) as max_order FROM sections WHERE menu_id = ?
          `).bind(menu_id).first();
                    maxOrder = (orderResult?.max_order || 0) + 1;
                }

                // Insertar o actualizar la sección
                if (isNew) {
                    await env.DB.prepare(`
            INSERT INTO sections (
              id, restaurant_id, menu_id, order_index, icon_url, bg_color, is_visible
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
                        sectionId,
                        restaurant_id,
                        menu_id,
                        order_index || maxOrder,
                        icon_url || null,
                        bg_color || null,
                        is_visible ?? true
                    ).run();
                } else {
                    await env.DB.prepare(`
            UPDATE sections SET
              menu_id = ?,
              order_index = ?,
              icon_url = ?,
              bg_color = ?,
              is_visible = COALESCE(?, is_visible),
              modified_at = CURRENT_TIMESTAMP
            WHERE id = ? AND restaurant_id = ?
          `).bind(
                        menu_id,
                        order_index,
                        icon_url || null,
                        bg_color || null,
                        is_visible !== undefined ? is_visible : null,
                        sectionId,
                        restaurant_id
                    ).run();
                }

                // Guardar traducciones
                if (translations) {
                    // Eliminar traducciones anteriores
                    await env.DB.prepare(`
            DELETE FROM translations 
            WHERE entity_id = ? AND entity_type = 'section'
          `).bind(sectionId).run();

                    const translationStatements = [];

                    // Guardar nombres en todos los idiomas
                    for (const [lang, value] of Object.entries(translations.name || {})) {
                        if (value) {
                            translationStatements.push(
                                env.DB.prepare(`
                  INSERT INTO translations (entity_id, entity_type, language_code, field, value)
                  VALUES (?, 'section', ?, 'name', ?)
                `).bind(sectionId, lang, value)
                            );
                        }
                    }

                    // Guardar descripciones si existen
                    for (const [lang, value] of Object.entries(translations.description || {})) {
                        if (value) {
                            translationStatements.push(
                                env.DB.prepare(`
                  INSERT INTO translations (entity_id, entity_type, language_code, field, value)
                  VALUES (?, 'section', ?, 'description', ?)
                `).bind(sectionId, lang, value)
                            );
                        }
                    }

                    if (translationStatements.length > 0) {
                        await env.DB.batch(translationStatements);
                    }
                }

                return createResponse({
                    success: true,
                    sectionId,
                    message: isNew ? "Sección creada correctamente" : "Sección actualizada correctamente"
                });

            } catch (dbError) {
                console.error("[Sections] Error en operaciones de base de datos:", dbError);
                throw dbError;
            }

        } catch (error) {
            console.error("[Sections] Error al guardar sección:", error);
            return createResponse({
                success: false,
                message: "Error al guardar sección: " + error.message
            }, 500);
        }
    }

    // Endpoint para eliminar una sección - REQUIERE AUTENTICACIÓN
    if (request.method === "DELETE" && url.pathname.match(/^\/sections\/[\w-]+$/)) {
        // ✅ Verificar autenticación
        const userData = await authenticateRequest(request);
        if (!userData) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }

        const sectionId = url.pathname.split('/').pop();
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get('restaurant_id');

        if (!restaurantId) {
            return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
        }

        try {
            // Verificar que la sección pertenece al restaurante
            const section = await env.DB.prepare(`
        SELECT id FROM sections WHERE id = ? AND restaurant_id = ?
      `).bind(sectionId, restaurantId).first();

            if (!section) {
                return createResponse({ success: false, message: "Sección no encontrada o no pertenece a este restaurante" }, 404);
            }

            // Verificar si hay platos asociados
            const dishCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM section_dishes WHERE section_id = ?
      `).bind(sectionId).first();

            if (dishCount && dishCount.count > 0) {
                return createResponse({
                    success: false,
                    message: "No se puede eliminar la sección porque tiene platos asociados. Mueva los platos a otra sección primero."
                }, 400);
            }

            try {
                const deleteStatements = [
                    env.DB.prepare(`DELETE FROM translations WHERE entity_id = ? AND entity_type = 'section'`).bind(sectionId),
                    env.DB.prepare(`DELETE FROM sections WHERE id = ?`).bind(sectionId)
                ];

                await env.DB.batch(deleteStatements);

                return createResponse({
                    success: true,
                    message: "Sección eliminada correctamente"
                });

            } catch (dbError) {
                console.error("[Sections] Error en operaciones de base de datos:", dbError);
                throw dbError;
            }

        } catch (error) {
            console.error("[Sections] Error al eliminar sección:", error);
            return createResponse({
                success: false,
                message: "Error al eliminar sección: " + error.message
            }, 500);
        }
    }

    return null;
}

// ===========================================================================
// FUNCIONES AUXILIARES
// ===========================================================================

async function getSectionsForRestaurant(restaurantId, env, includeDishes = false, isAdmin = false) {
    try {
        // ✅ OPTIMIZADO: Query única con GROUP_CONCAT para traducciones
        // ✅ isAdmin: Si es admin, muestra todas las secciones con is_visible; si no, filtra solo visibles
        const visibilityFilter = isAdmin ? '' : 'AND s.is_visible = TRUE';

        const sectionsData = await env.DB.prepare(`
            SELECT 
                s.id, s.menu_id, s.order_index, s.icon_url, s.bg_color,
                ${isAdmin ? 's.is_visible,' : ''}
                m.name as menu_name,
                COUNT(DISTINCT sd.dish_id) as dish_count,
                GROUP_CONCAT(
                    CASE 
                        WHEN t.field = 'name' AND t.language_code IN ('es', 'en') THEN 
                            t.language_code || ':name:' || t.value
                        WHEN t.field = 'description' AND t.language_code IN ('es', 'en') THEN 
                            t.language_code || ':description:' || t.value
                    END, '|||'
                ) as translations_data
            FROM sections s
            LEFT JOIN menus m ON s.menu_id = m.id
            LEFT JOIN section_dishes sd ON s.id = sd.section_id
            LEFT JOIN translations t ON t.entity_id = s.id 
                AND t.entity_type = 'section'
                AND t.language_code IN ('es', 'en')
                AND t.field IN ('name', 'description')
            WHERE s.restaurant_id = ? ${visibilityFilter}
            GROUP BY s.id, s.menu_id, s.order_index, s.icon_url, s.bg_color, m.name
            ORDER BY s.order_index ASC
        `).bind(restaurantId).all();

        if (!sectionsData.results || sectionsData.results.length === 0) {
            return createResponse({ success: true, sections: [] });
        }

        // ✅ OPTIMIZADO: Procesar traducciones en memoria (sin queries adicionales)
        const sections = sectionsData.results.map(section => {
            const translations = { name: {}, description: {} };

            // Parsear translations_data
            if (section.translations_data) {
                const parts = section.translations_data.split('|||').filter(Boolean);
                parts.forEach(part => {
                    if (!part) return;
                    const [lang, field, ...valueParts] = part.split(':');
                    const value = valueParts.join(':'); // Por si el valor contiene ':'

                    if (lang && field && value) {
                        translations[field][lang] = value;
                    }
                });
            }

            return {
                id: section.id,
                menu_id: section.menu_id,
                order_index: section.order_index,
                icon_url: section.icon_url,
                bg_color: section.bg_color,
                // ✅ Incluir is_visible solo si está presente (contexto admin)
                ...(section.is_visible !== undefined && { is_visible: !!section.is_visible }),
                translations,
                menu_name: section.menu_name || "Menú sin nombre",
                dish_count: section.dish_count || 0,
                dishes: [] // Inicializar array de platos
            };
        });

        // ✅ SI SE SOLICITAN PLATOS: Buscar platos activos ordenados por sección
        if (includeDishes) {
            console.log(`[Sections] Fetching dishes for restaurant ${restaurantId}`);
            const dishesData = await env.DB.prepare(`
                SELECT 
                    sd.section_id, 
                    d.id, d.price, d.status,
                    COALESCE(t_name.value, 'Sin nombre') as name,
                    t_desc.value as description
                FROM section_dishes sd
                JOIN dishes d ON sd.dish_id = d.id
                JOIN sections s ON sd.section_id = s.id
                LEFT JOIN translations t_name ON d.id = t_name.entity_id AND t_name.entity_type = 'dish' AND t_name.field = 'name' AND t_name.language_code = 'es'
                LEFT JOIN translations t_desc ON d.id = t_desc.entity_id AND t_desc.entity_type = 'dish' AND t_desc.field = 'description' AND t_desc.language_code = 'es'
                WHERE s.restaurant_id = ? AND d.status = 'active'
                ORDER BY sd.section_id, sd.order_index
            `).bind(restaurantId).all();

            // Agrupar platos por sección
            const dishesBySection = {};
            if (dishesData.results) {
                dishesData.results.forEach(dish => {
                    if (!dishesBySection[dish.section_id]) {
                        dishesBySection[dish.section_id] = [];
                    }
                    dishesBySection[dish.section_id].push(dish);
                });
            }

            // Asignar platos a sus secciones
            sections.forEach(section => {
                section.dishes = dishesBySection[section.id] || [];
            });
        }

        console.log(`[Sections] ✅ Optimized: ${sections.length} sections loaded (Dishes included: ${includeDishes})`);

        return createResponse({
            success: true,
            sections
        });

    } catch (dbError) {
        console.error("[Sections] Error de base de datos:", dbError);
        return createResponse({
            success: false,
            message: "Error en el servidor: " + dbError.message
        }, 500);
    }
}

export function createResponse(data, status = 200, request = null) {
    return new Response(JSON.stringify(data), {
        status,
        headers: getCorsHeaders(request),
    });
}
