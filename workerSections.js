import { verifyJWT, JWT_SECRET } from './workerAuthentication.js';

// ===========================================================================
// CLOUDFLARE WORKER - SECTIONS API
// ===========================================================================

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function createResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders
        }
    });
}

async function authenticateRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return await verifyJWT(token, JWT_SECRET);
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
        return await getSectionsForRestaurant(restaurantId, env);
    }

    // Endpoint original para obtener secciones (mantener por compatibilidad)
    if (request.method === "GET" && url.pathname === "/sections") {
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get('restaurant_id');

        if (!restaurantId) {
            return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
        }

        return await getSectionsForRestaurant(restaurantId, env);
    }

    // Endpoint para manejar secciones (crear/actualizar) - REQUIERE AUTENTICACIÓN
    if ((request.method === "POST" || request.method === "PUT") && url.pathname.match(/^\/sections(\/. +)?$/)) {
        // ✅ Verificar autenticación
        const userData = await authenticateRequest(request);
        if (!userData) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }

        try {
            const data = await request.json();
            const isNew = request.method === "POST" || !url.pathname.includes('/');
            const sectionId = isNew ? `sect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : url.pathname.split('/').pop();
            const { restaurant_id, menu_id, translations, order_index, icon_url, bg_color } = data;

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
              id, restaurant_id, menu_id, order_index, icon_url, bg_color
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
                        sectionId,
                        restaurant_id,
                        menu_id,
                        order_index || maxOrder,
                        icon_url || null,
                        bg_color || null
                    ).run();
                } else {
                    await env.DB.prepare(`
            UPDATE sections SET
              menu_id = ?,
              order_index = ?,
              icon_url = ?,
              bg_color = ?,
              modified_at = CURRENT_TIMESTAMP
            WHERE id = ? AND restaurant_id = ?
          `).bind(
                        menu_id,
                        order_index,
                        icon_url || null,
                        bg_color || null,
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

async function getSectionsForRestaurant(restaurantId, env) {
    try {
        const sectionsData = await env.DB.prepare(`
      SELECT s.id, s.menu_id, s.order_index, s.icon_url, s.bg_color
      FROM sections s
      WHERE s.restaurant_id = ?
      ORDER BY s.order_index ASC
    `).bind(restaurantId).all();

        if (!sectionsData.results || sectionsData.results.length === 0) {
            return createResponse({ success: true, sections: [] });
        }

        const sectionsWithDetails = await Promise.all(sectionsData.results.map(async (section) => {
            const menuData = await env.DB.prepare(`
        SELECT name FROM menus WHERE id = ?
      `).bind(section.menu_id).first();

            const translations = { name: {}, description: {} };

            const nameES = await env.DB.prepare(
                `SELECT value FROM translations WHERE entity_id = ? AND entity_type = 'section' AND field = 'name' AND language_code = 'es'`
            ).bind(section.id).first();

            if (nameES) translations.name.es = nameES.value;

            const nameEN = await env.DB.prepare(
                `SELECT value FROM translations WHERE entity_id = ? AND entity_type = 'section' AND field = 'name' AND language_code = 'en'`
            ).bind(section.id).first();

            if (nameEN) translations.name.en = nameEN.value;

            const descES = await env.DB.prepare(
                `SELECT value FROM translations WHERE entity_id = ? AND entity_type = 'section' AND field = 'description' AND language_code = 'es'`
            ).bind(section.id).first();

            if (descES) translations.description.es = descES.value;

            const descEN = await env.DB.prepare(
                `SELECT value FROM translations WHERE entity_id = ? AND entity_type = 'section' AND field = 'description' AND language_code = 'en'`
            ).bind(section.id).first();

            if (descEN) translations.description.en = descEN.value;

            const dishCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM section_dishes WHERE section_id = ?
      `).bind(section.id).first();

            return {
                ...section,
                translations,
                menu_name: menuData?.name || "Menú sin nombre",
                dish_count: dishCount?.count || 0
            };
        }));

        return createResponse({
            success: true,
            sections: sectionsWithDetails
        });

    } catch (dbError) {
        console.error("[Sections] Error de base de datos:", dbError);
        return createResponse({
            success: false,
            message: "Error en el servidor: " + dbError.message
        }, 500);
    }
}

export function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
