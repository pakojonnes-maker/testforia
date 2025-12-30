export async function handleDishRequests(request, env) {
    const url = new URL(request.url);
    console.log(`[Dishes] Procesando: ${request.method} ${url.pathname}`);
    // =============================================
    // PLATOS (DISHES)
    // =============================================
    // Endpoint para obtener alérgenos de un plato específico - Query params
    if (request.method === "GET" && url.pathname === "/allergens") {
        console.log("Usando endpoint de alérgenos por query params");
        const params = new URLSearchParams(url.search);
        const dishId = params.get('dish_id');
        if (!dishId) {
            return createResponse({ success: false, message: "Se requiere dish_id" }, 400);
        }
        try {
            return await getAllergensForDish(dishId, env, request);
        } catch (error) {
            console.error("Error al obtener alérgenos:", error);
            return createResponse({
                success: false,
                message: "Error al obtener alérgenos: " + error.message
            }, 500);
        }
    }
    // Endpoint para obtener alérgenos (versión URL path)
    if (request.method === "GET" && url.pathname.includes('/allergens')) {
        try {
            console.log("Detectada solicitud de alérgenos por path:", url.pathname);
            const urlParts = decodeURIComponent(url.pathname).split('/');
            const dishIndex = urlParts.findIndex(part => part === 'dishes') + 1;
            const allergensIndex = urlParts.findIndex(part => part === 'allergens');
            if (dishIndex > 0 && allergensIndex > dishIndex) {
                const dishId = urlParts[dishIndex];
                console.log("ID del plato extraído:", dishId);
                return await getAllergensForDish(dishId, env, request);
            } else {
                console.error("Estructura de URL inválida para alérgenos:", url.pathname);
                return createResponse({
                    success: false,
                    message: "Formato de URL inválido"
                }, 400);
            }
        } catch (error) {
            console.error("Error procesando URL de alérgenos:", error, url.pathname);
            return createResponse({
                success: false,
                message: "Error al procesar la URL: " + error.message
            }, 500);
        }
    }
    // Obtener relaciones entre platos y secciones
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[\w-]+\/dish-section-relations$/)) {
        const restaurantId = url.pathname.split('/')[2];
        try {
            console.log(`[Dishes] Obteniendo relaciones plato-sección para restaurante ${restaurantId}`);
            const relationsData = await env.DB.prepare(`
      SELECT sd.section_id, sd.dish_id, sd.order_index
      FROM section_dishes sd
      JOIN sections s ON sd.section_id = s.id
      JOIN dishes d ON sd.dish_id = d.id
      WHERE s.restaurant_id = ? AND d.restaurant_id = ?
      ORDER BY sd.section_id, sd.order_index
    `).bind(restaurantId, restaurantId).all();
            return createResponse({
                success: true,
                relations: relationsData.results
            });
        } catch (error) {
            console.error("Error obteniendo relaciones plato-sección:", error);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + error.message
            }, 500);
        }
    }
    // Endpoint público RESTful para obtener platos por restaurante y sección
    // MEJORADO: Ahora soporta paginación opcional
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[\w-]+\/dishes$/)) {
        const restaurantId = url.pathname.split('/')[2];
        const params = new URLSearchParams(url.search);
        const sectionId = params.get('section_id');
        // Parámetros de paginación opcionales
        const page = parseInt(params.get('page')) || null;
        const limit = parseInt(params.get('limit')) || null;
        try {
            const result = await getDishesWithMedia(restaurantId, sectionId, env, request, page, limit);
            return createResponse({
                success: true,
                ...result // includes dishes, total, page, limit if pagination is used
            });
        } catch (error) {
            console.error("Error obteniendo platos:", error);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + error.message
            }, 500);
        }
    }
    // Endpoint para obtener platos (endpoint original - mantener por compatibilidad)
    if (request.method === "GET" && url.pathname === "/dishes") {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get('restaurant_id');
        if (!restaurantId) {
            return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
        }
        try {
            const result = await getDishesWithMedia(restaurantId, null, env, request, null, null);
            return createResponse({
                success: true,
                dishes: result.dishes
            });
        } catch (error) {
            console.error("Error obteniendo platos:", error);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + error.message
            }, 500);
        }
    }
    // Endpoint para obtener un plato específico por ID
    if (request.method === "GET" && url.pathname.match(/^\/dishes\/[\w-]+$/)) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const dishId = url.pathname.split('/').pop();
        try {
            // ✅ UPDATED: Added half_price, has_half_portion
            const dish = await env.DB.prepare(`
      SELECT id, restaurant_id, status, price, discount_price, discount_active,
            calories, preparation_time, is_vegetarian, is_vegan, is_gluten_free,
            is_new, is_featured, avg_rating, rating_count, view_count,
            half_price, has_half_portion
      FROM dishes
      WHERE id = ?
    `).bind(dishId).first();
            if (!dish) {
                return createResponse({ success: false, message: "Plato no encontrado" }, 404);
            }
            // Obtener traducciones del plato
            const translations = { name: {}, description: {} };
            const translationData = await env.DB.prepare(`
      SELECT language_code, field, value
      FROM translations
      WHERE entity_id = ? AND entity_type = 'dish'
    `).bind(dishId).all();
            for (const t of translationData.results) {
                if (!translations[t.field]) translations[t.field] = {};
                translations[t.field][t.language_code] = t.value;
            }
            // Obtener secciones
            const sectionIds = await env.DB.prepare(`
      SELECT section_id FROM section_dishes WHERE dish_id = ?
    `).bind(dishId).all();
            // Obtener alérgenos con VERSIÓN OPTIMIZADA
            const allergens = await getAllergensOptimized([dishId], env, request);
            // Obtener medios
            const mediaData = await env.DB.prepare(`
      SELECT id, media_type, content_type, r2_key, width, height, duration, is_primary, display_name
      FROM dish_media
      WHERE dish_id = ?
      ORDER BY is_primary DESC, created_at ASC
    `).bind(dishId).all();
            const origin = request.url.origin || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';
            // MEJORADO: Generar URLs con thumbnail_url para videos
            const media = mediaData.results.map(m => {
                const baseUrl = `${origin}/media/${m.r2_key}`;
                const mediaObj = {
                    id: m.id,
                    type: m.media_type,
                    media_type: m.media_type,
                    content_type: m.content_type,
                    url: baseUrl,
                    width: m.width,
                    height: m.height,
                    duration: m.duration,
                    display_name: m.display_name,
                    is_primary: m.is_primary === 1
                };
                // Si es video, agregar thumbnail_url (asumiendo que existe un thumbnail con sufijo _thumb)
                if (m.media_type === 'video') {
                    // Buscar si existe un thumbnail asociado
                    const thumbKey = m.r2_key.replace(/\.(mp4|mov|avi)$/i, '_thumb.jpg');
                    mediaObj.thumbnail_url = `${origin}/media/${thumbKey}`;
                }
                return mediaObj;
            });
            // NUEVO: Calcular final_price
            const final_price = dish.discount_active && dish.discount_price && dish.discount_price > 0
                ? dish.discount_price
                : dish.price;
            const dishComplete = {
                ...dish,
                discount_active: dish.discount_active === 1,
                is_vegetarian: dish.is_vegetarian === 1,
                is_vegan: dish.is_vegan === 1,
                is_gluten_free: dish.is_gluten_free === 1,
                is_new: dish.is_new === 1,
                is_featured: dish.is_featured === 1,
                has_half_portion: dish.has_half_portion === 1, // ✅ NEW
                half_price: dish.half_price, // ✅ NEW
                final_price, // NUEVO campo
                translations,
                section_ids: sectionIds.results.map(s => s.section_id),
                allergens: allergens[dishId] || [],
                media: media,
                thumbnail_url: media.find(m => m.is_primary)?.url || media[0]?.url || null
            };
            return createResponse({
                success: true,
                dish: dishComplete
            });
        } catch (dbError) {
            console.error("Error de base de datos:", dbError);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + dbError.message
            }, 500);
        }
    }
    // Endpoint para crear/actualizar un plato
    if ((request.method === "POST" || request.method === "PUT") && url.pathname.match(/^\/dishes(\/.+)?$/)) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        try {
            const data = await request.json();
            const isNew = request.method === "POST" || !url.pathname.includes('/');
            const dishId = isNew ? `dish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : url.pathname.split('/').pop();
            const restaurantId = data.restaurant_id;
            if (!restaurantId) {
                return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
            }
            // ✅ UPDATED: Added has_half_portion, half_price
            const {
                status, price, discount_price, discount_active,
                is_vegetarian, is_vegan, is_gluten_free, is_new, is_featured,
                has_half_portion, half_price,
                translations, section_ids, allergen_ids
            } = data;
            try {
                if (isNew) {
                    // ✅ UPDATED: Added has_half_portion, half_price
                    await env.DB.prepare(`
          INSERT INTO dishes (
            id, restaurant_id, status, price, discount_price, discount_active,
            is_vegetarian, is_vegan, is_gluten_free, is_new, is_featured,
            has_half_portion, half_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                        dishId, restaurantId, status || 'active', price || 0,
                        discount_price || null, discount_active || false,
                        is_vegetarian || false, is_vegan || false, is_gluten_free || false,
                        is_new || false, is_featured || false,
                        has_half_portion || false, half_price || null
                    ).run();
                } else {
                    // ✅ UPDATED: Added has_half_portion, half_price
                    await env.DB.prepare(`
          UPDATE dishes SET
            status = ?, price = ?, discount_price = ?, discount_active = ?,
            is_vegetarian = ?, is_vegan = ?, is_gluten_free = ?,
            is_new = ?, is_featured = ?,
            has_half_portion = ?, half_price = ?,
            modified_at = CURRENT_TIMESTAMP
          WHERE id = ? AND restaurant_id = ?
        `).bind(
                        status || 'active', price || 0, discount_price || null, discount_active || false,
                        is_vegetarian || false, is_vegan || false, is_gluten_free || false,
                        is_new || false, is_featured || false,
                        has_half_portion || false, half_price || null,
                        dishId, restaurantId
                    ).run();
                }
                // Guardar traducciones
                if (translations) {
                    await env.DB.prepare(`
          DELETE FROM translations WHERE entity_id = ? AND entity_type = 'dish'
        `).bind(dishId).run();
                    const translationStatements = [];
                    for (const [lang, value] of Object.entries(translations.name || {})) {
                        if (value) {
                            translationStatements.push(
                                env.DB.prepare(`
                INSERT INTO translations (entity_id, entity_type, language_code, field, value)
                VALUES (?, 'dish', ?, 'name', ?)
              `).bind(dishId, lang, value)
                            );
                        }
                    }
                    for (const [lang, value] of Object.entries(translations.description || {})) {
                        if (value) {
                            translationStatements.push(
                                env.DB.prepare(`
                INSERT INTO translations (entity_id, entity_type, language_code, field, value)
                VALUES (?, 'dish', ?, 'description', ?)
              `).bind(dishId, lang, value)
                            );
                        }
                    }
                    for (const [lang, value] of Object.entries(translations.ingredients || {})) {
                        if (value) {
                            translationStatements.push(
                                env.DB.prepare(`
                INSERT INTO translations (entity_id, entity_type, language_code, field, value)
                VALUES (?, 'dish', ?, 'ingredients', ?)
              `).bind(dishId, lang, value)
                            );
                        }
                    }
                    if (translationStatements.length > 0) {
                        await env.DB.batch(translationStatements);
                    }
                }
                // Gestionar secciones
                if (section_ids) {
                    await env.DB.prepare(`
          DELETE FROM section_dishes WHERE dish_id = ?
        `).bind(dishId).run();
                    const sectionStatements = [];
                    for (let i = 0; i < section_ids.length; i++) {
                        sectionStatements.push(
                            env.DB.prepare(`
              INSERT INTO section_dishes (section_id, dish_id, order_index)
              VALUES (?, ?, ?)
            `).bind(section_ids[i], dishId, i + 1)
                        );
                    }
                    if (sectionStatements.length > 0) {
                        await env.DB.batch(sectionStatements);
                    }
                }
                // Gestionar alérgenos
                if (allergen_ids) {
                    await env.DB.prepare(`
          DELETE FROM dish_allergens WHERE dish_id = ?
        `).bind(dishId).run();
                    const allergenStatements = [];
                    for (const allergenId of allergen_ids) {
                        allergenStatements.push(
                            env.DB.prepare(`
              INSERT INTO dish_allergens (dish_id, allergen_id)
              VALUES (?, ?)
            `).bind(dishId, allergenId)
                        );
                    }
                    if (allergenStatements.length > 0) {
                        await env.DB.batch(allergenStatements);
                    }
                }
                return createResponse({
                    success: true,
                    dishId,
                    message: isNew ? "Plato creado correctamente" : "Plato actualizado correctamente"
                });
            } catch (dbError) {
                console.error("Error en operaciones de base de datos:", dbError);
                throw dbError;
            }
        } catch (error) {
            console.error("Error al guardar plato:", error);
            return createResponse({
                success: false,
                message: "Error al guardar plato: " + error.message
            }, 500);
        }
    }
    // Actualizar orden de platos por sección
    if (request.method === "POST" && url.pathname.match(/^\/restaurants\/[\w-]+\/dishes\/order-by-section$/)) {
        try {
            const restaurantId = url.pathname.split('/')[2];
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return createResponse({ success: false, message: "No autorizado" }, 401);
            }
            const body = await request.json();
            const { dishOrders } = body;
            if (!Array.isArray(dishOrders)) {
                return createResponse({
                    success: false,
                    message: "Formato de datos incorrecto. Se espera un array de secciones con platos."
                }, 400);
            }
            console.log(`[Dishes] Actualizando orden de platos por sección para restaurante ${restaurantId}`);
            const statements = [];
            for (const sectionOrder of dishOrders) {
                const { section_id, dish_orders } = sectionOrder;
                if (!section_id || !Array.isArray(dish_orders)) {
                    console.warn(`[Dishes] Formato incorrecto para sección: ${JSON.stringify(sectionOrder)}`);
                    continue;
                }
                const sectionExists = await env.DB.prepare(`
        SELECT id FROM sections WHERE id = ? AND restaurant_id = ?
      `).bind(section_id, restaurantId).first();
                if (!sectionExists) {
                    console.warn(`[Dishes] Sección ${section_id} no encontrada o no pertenece a este restaurante`);
                    continue;
                }
                console.log(`[Dishes] Actualizando ${dish_orders.length} platos para sección ${section_id}`);
                statements.push(
                    env.DB.prepare(`DELETE FROM section_dishes WHERE section_id = ?`).bind(section_id)
                );
                for (const dishOrder of dish_orders) {
                    const { dish_id, order_index } = dishOrder;
                    if (!dish_id) {
                        console.warn(`[Dishes] ID de plato no proporcionado: ${JSON.stringify(dishOrder)}`);
                        continue;
                    }
                    const dishExists = await env.DB.prepare(`
          SELECT id FROM dishes WHERE id = ? AND restaurant_id = ?
        `).bind(dish_id, restaurantId).first();
                    if (!dishExists) {
                        console.warn(`[Dishes] Plato ${dish_id} no encontrado o no pertenece a este restaurante`);
                        continue;
                    }
                    statements.push(
                        env.DB.prepare(`
            INSERT INTO section_dishes (section_id, dish_id, order_index)
            VALUES (?, ?, ?)
          `).bind(section_id, dish_id, order_index)
                    );
                    console.log(`[Dishes] Preparando inserción: sección=${section_id}, plato=${dish_id}, orden=${order_index}`);
                }
            }
            if (statements.length > 0) {
                await env.DB.batch(statements);
                console.log(`[Dishes] Se ejecutaron ${statements.length} operaciones en batch`);
            }
            return createResponse({
                success: true,
                message: `Orden de platos actualizado correctamente. ${statements.length} operaciones realizadas.`
            });
        } catch (error) {
            console.error("[Dishes] Error al actualizar orden de platos por sección:", error);
            return createResponse({
                success: false,
                message: `Error: ${error.message}`
            }, 500);
        }
    }
    // Endpoint para eliminar un plato
    if (request.method === "DELETE" && url.pathname.match(/^\/dishes\/[\w-]+$/)) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const dishId = url.pathname.split('/').pop();
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get('restaurant_id');
        if (!restaurantId) {
            return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
        }
        try {
            const dish = await env.DB.prepare(`
      SELECT id FROM dishes WHERE id = ? AND restaurant_id = ?
    `).bind(dishId, restaurantId).first();
            if (!dish) {
                return createResponse({ success: false, message: "Plato no encontrado o no pertenece a este restaurante" }, 404);
            }
            try {
                // Obtener claves de R2 para eliminar archivos
                const mediaKeys = await env.DB.prepare(`
        SELECT r2_key FROM dish_media WHERE dish_id = ?
      `).bind(dishId).all();
                // CORRECCIÓN: Eliminar TODAS las relaciones de foreign key
                const deleteStatements = [
                    // Traducciones
                    env.DB.prepare(`DELETE FROM translations WHERE entity_id = ? AND entity_type = 'dish'`).bind(dishId),
                    // Relaciones con secciones
                    env.DB.prepare(`DELETE FROM section_dishes WHERE dish_id = ?`).bind(dishId),
                    // Alérgenos
                    env.DB.prepare(`DELETE FROM dish_allergens WHERE dish_id = ?`).bind(dishId),
                    // Ingredientes
                    env.DB.prepare(`DELETE FROM dish_ingredients WHERE dish_id = ?`).bind(dishId),
                    // Mensajes del plato
                    env.DB.prepare(`DELETE FROM dish_messages WHERE dish_id = ?`).bind(dishId),
                    // Favoritos de usuarios
                    env.DB.prepare(`DELETE FROM user_favorites WHERE dish_id = ?`).bind(dishId),
                    // Ratings de usuarios
                    env.DB.prepare(`DELETE FROM user_ratings WHERE dish_id = ?`).bind(dishId),
                    // Métricas diarias del plato
                    env.DB.prepare(`DELETE FROM dish_daily_metrics WHERE dish_id = ?`).bind(dishId),
                    // Medios (tiene CASCADE pero lo eliminamos explícitamente por consistencia)
                    env.DB.prepare(`DELETE FROM dish_media WHERE dish_id = ?`).bind(dishId),
                    // Finalmente, el plato
                    env.DB.prepare(`DELETE FROM dishes WHERE id = ?`).bind(dishId)
                ];
                await env.DB.batch(deleteStatements);
                console.log(`[Dishes] Plato ${dishId} eliminado correctamente con todas sus relaciones`);
                // Eliminar archivos de R2 en background
                if (mediaKeys.results && mediaKeys.results.length > 0) {
                    Promise.all(
                        mediaKeys.results.map(m => env.R2_BUCKET.delete(m.r2_key))
                    ).catch(e => console.error("Error eliminando archivos de R2:", e));
                }
                return createResponse({
                    success: true,
                    message: "Plato eliminado correctamente"
                });
            } catch (dbError) {
                console.error("Error en operaciones de base de datos:", dbError);
                throw dbError;
            }
        } catch (error) {
            console.error("Error al eliminar plato:", error);
            return createResponse({
                success: false,
                message: "Error al eliminar plato: " + error.message
            }, 500);
        }
    }
    return null;
}
// ============================================================================
// FUNCIONES AUXILIARES OPTIMIZADAS
// ============================================================================
/**
* Obtener alérgenos de un plato (versión legacy, usa la optimizada internamente)
*/
async function getAllergensForDish(dishId, env, request) {
    const dish = await env.DB.prepare(`
  SELECT id, restaurant_id FROM dishes WHERE id = ?
`).bind(dishId).first();
    if (!dish) {
        return createResponse({ success: false, message: "Plato no encontrado" }, 404);
    }
    const allergensMap = await getAllergensOptimized([dishId], env, request);
    return createResponse({
        success: true,
        allergens: allergensMap[dishId] || []
    });
}
/**
* NUEVA FUNCIÓN OPTIMIZADA: Obtener alérgenos para múltiples platos en UNA sola query
* Elimina el problema N+1
*/
async function getAllergensOptimized(dishIds, env, request) {
    if (!dishIds || dishIds.length === 0) {
        return {};
    }
    // Una sola query para obtener todos los alérgenos de todos los platos
    const allergenData = await env.DB.prepare(`
  SELECT da.dish_id, a.id, a.icon_url
  FROM dish_allergens da
  JOIN allergens a ON da.allergen_id = a.id
  WHERE da.dish_id IN (${dishIds.map(() => '?').join(',')})
`).bind(...dishIds).all();
    if (!allergenData.results || allergenData.results.length === 0) {
        return {};
    }
    // Obtener IDs únicos de alérgenos
    const allergenIds = [...new Set(allergenData.results.map(a => a.id))];
    // Una sola query para todas las traducciones
    const translationsData = await env.DB.prepare(`
  SELECT entity_id, language_code, value
  FROM translations
  WHERE entity_id IN (${allergenIds.map(() => '?').join(',')})
  AND entity_type = 'allergen' AND field = 'name'
`).bind(...allergenIds).all();
    // Organizar traducciones por allergen_id
    const translationsByAllergen = {};
    for (const t of translationsData.results) {
        if (!translationsByAllergen[t.entity_id]) {
            translationsByAllergen[t.entity_id] = {};
        }
        translationsByAllergen[t.entity_id][t.language_code] = t.value;
    }
    const origin = request.url.origin || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

    // Mapeo de casos especiales para nombres de archivos
    const filenameOverrides = {
        'allergen_crustaceans': 'allergen_crustacean.svg',
        'allergen_lupin': 'allergen_lupins.svg',
        'allergen_sulphites': 'allergen_sulfites.svg',
        'allergen_molluscs': 'allergen_shellfish.svg',
        'allergen_soy': 'allergen_soya.svg'
    };

    // Organizar alérgenos por dish_id
    const allergensByDish = {};
    for (const allergen of allergenData.results) {
        if (!allergensByDish[allergen.dish_id]) {
            allergensByDish[allergen.dish_id] = [];
        }

        let filename;
        if (filenameOverrides[allergen.id]) {
            filename = filenameOverrides[allergen.id];
        } else {
            // Por defecto usar el ID completo (ej. 'allergen_celery.svg', 'allergen_gluten.svg')
            filename = `${allergen.id}.svg`;
        }

        // Usar 'System' con mayúscula como indica el bucket
        const iconUrl = `${origin}/media/System/allergens/${filename}`;

        allergensByDish[allergen.dish_id].push({
            id: allergen.id,
            icon_url: iconUrl,
            translations: {
                name: translationsByAllergen[allergen.id] || {}
            }
        });
    }
    return allergensByDish;
}
/**
* FUNCIÓN OPTIMIZADA: Obtener platos con medios
* Mejoras: final_price, thumbnail_url en medios, paginación opcional, half_price support
*/
async function getDishesWithMedia(restaurantId, sectionId, env, request, page = null, limit = null) {
    try {
        // Calcular offset si hay paginación
        const isPaginated = page !== null && limit !== null && limit > 0;
        const offset = isPaginated ? (page - 1) * limit : 0;
        // ✅ UPDATED: Added half_price, has_half_portion to SELECT
        let query = `
    SELECT d.id, d.status, d.price, d.discount_price, d.discount_active,
           d.is_vegetarian, d.is_vegan, d.is_gluten_free, 
           d.is_featured, d.is_new, d.view_count,
           d.half_price, d.has_half_portion
    FROM dishes d
  `;
        let countQuery = `SELECT COUNT(*) as total FROM dishes d`;
        let bindParams = [];
        if (sectionId) {
            query += `
      JOIN section_dishes sd ON d.id = sd.dish_id
      WHERE d.restaurant_id = ? AND sd.section_id = ?
      ORDER BY sd.order_index ASC
    `;
            countQuery += `
      JOIN section_dishes sd ON d.id = sd.dish_id
      WHERE d.restaurant_id = ? AND sd.section_id = ?
    `;
            bindParams = [restaurantId, sectionId];
            console.log(`[Dishes] Obteniendo platos para restaurante ${restaurantId} y sección ${sectionId}`);
        } else {
            query += `
      WHERE d.restaurant_id = ?
      ORDER BY d.created_at DESC
    `;
            countQuery += ` WHERE d.restaurant_id = ?`;
            bindParams = [restaurantId];
            console.log(`[Dishes] Obteniendo todos los platos para restaurante ${restaurantId}`);
        }
        // Obtener total si es paginado
        let total = null;
        if (isPaginated) {
            const countResult = await env.DB.prepare(countQuery).bind(...bindParams).first();
            total = countResult.total;
        }
        // Agregar LIMIT y OFFSET si es paginado
        if (isPaginated) {
            query += ` LIMIT ? OFFSET ?`;
            bindParams.push(limit, offset);
        }
        const dishes = await env.DB.prepare(query).bind(...bindParams).all();
        if (!dishes.results || dishes.results.length === 0) {
            console.log(`[Dishes] No se encontraron platos para esta consulta`);
            if (isPaginated) {
                return {
                    dishes: [],
                    total: total || 0,
                    page,
                    limit,
                    total_pages: 0
                };
            }
            return { dishes: [] };
        }
        console.log(`[Dishes] Se encontraron ${dishes.results.length} platos`);
        const dishIds = dishes.results.map(d => d.id);
        // Query optimizada para traducciones
        const translations = await env.DB.prepare(`
    SELECT entity_id, language_code, field, value
    FROM translations
    WHERE entity_id IN (${dishIds.map(() => '?').join(',')})
    AND entity_type = 'dish'
  `).bind(...dishIds).all();
        const translationsByDish = {};
        for (const t of translations.results) {
            if (!translationsByDish[t.entity_id]) {
                translationsByDish[t.entity_id] = { name: {}, description: {} };
            }
            if (!translationsByDish[t.entity_id][t.field]) {
                translationsByDish[t.entity_id][t.field] = {};
            }
            translationsByDish[t.entity_id][t.field][t.language_code] = t.value;
        }
        // Query optimizada para medios
        const media = await env.DB.prepare(`
    SELECT dm.dish_id, dm.id, dm.media_type, dm.r2_key, dm.is_primary,
           dm.content_type, dm.width, dm.height, dm.duration
    FROM dish_media dm
    WHERE dm.dish_id IN (${dishIds.map(() => '?').join(',')})
    ORDER BY dm.is_primary DESC, dm.created_at ASC
  `).bind(...dishIds).all();
        console.log(`[Dishes] Se encontraron ${media.results.length} medios para los platos`);
        const origin = request.url.origin || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';
        // Organizar medios por dish_id
        const mediaByDish = {};
        for (const m of media.results) {
            if (!mediaByDish[m.dish_id]) {
                mediaByDish[m.dish_id] = [];
            }
            const publicUrl = `${origin}/media/${m.r2_key}`;
            const mediaObj = {
                id: m.id,
                type: m.media_type,
                media_type: m.media_type,
                content_type: m.content_type,
                url: publicUrl,
                width: m.width,
                height: m.height,
                duration: m.duration,
                is_primary: m.is_primary === 1
            };
            // NUEVO: Agregar thumbnail_url para videos
            if (m.media_type === 'video') {
                const thumbKey = m.r2_key.replace(/\.(mp4|mov|avi)$/i, '_thumb.jpg');
                mediaObj.thumbnail_url = `${origin}/media/${thumbKey}`;
            }
            mediaByDish[m.dish_id].push(mediaObj);
        }
        // Query para secciones
        const sectionRelations = await env.DB.prepare(`
    SELECT dish_id, section_id, order_index
    FROM section_dishes
    WHERE dish_id IN (${dishIds.map(() => '?').join(',')})
  `).bind(...dishIds).all();
        const sectionsByDish = {};
        const sectionOrdersByDish = {};
        for (const relation of sectionRelations.results) {
            const { dish_id, section_id, order_index } = relation;
            if (!sectionsByDish[dish_id]) {
                sectionsByDish[dish_id] = [];
            }
            sectionsByDish[dish_id].push(section_id);
            if (!sectionOrdersByDish[dish_id]) {
                sectionOrdersByDish[dish_id] = {};
            }
            sectionOrdersByDish[dish_id][section_id] = order_index;
        }
        // NUEVO: Obtener alérgenos con función optimizada
        const allergensByDish = await getAllergensOptimized(dishIds, env, request);
        // Incrementar view count en background
        const updateViewStatements = dishIds.map(id =>
            env.DB.prepare(`UPDATE dishes SET view_count = view_count + 1 WHERE id = ?`).bind(id)
        );
        env.DB.batch(updateViewStatements).catch(e =>
            console.error("Error updating view counts:", e)
        );
        // Combinar toda la información
        const enrichedDishes = dishes.results.map(dish => {
            const dishMedia = mediaByDish[dish.id] || [];
            const primaryMedia = dishMedia.find(m => m.is_primary) || dishMedia[0];
            // NUEVO: Calcular final_price
            const final_price = dish.discount_active && dish.discount_price && dish.discount_price > 0
                ? dish.discount_price
                : dish.price;
            return {
                ...dish,
                discount_active: dish.discount_active === 1,
                is_vegetarian: dish.is_vegetarian === 1,
                is_vegan: dish.is_vegan === 1,
                is_gluten_free: dish.is_gluten_free === 1,
                is_new: dish.is_new === 1,
                is_featured: dish.is_featured === 1,
                has_half_portion: dish.has_half_portion === 1, // ✅ NEW
                half_price: dish.half_price, // ✅ NEW
                final_price, // NUEVO campo
                translations: translationsByDish[dish.id] || { name: {}, description: {} },
                section_ids: sectionsByDish[dish.id] || [],
                section_orders: sectionOrdersByDish[dish.id] || {},
                allergens: allergensByDish[dish.id] || [], // NUEVO: alérgenos optimizados
                thumbnail_url: primaryMedia?.url || null,
                media: dishMedia
            };
        });
        // Retornar con o sin paginación
        if (isPaginated) {
            return {
                dishes: enrichedDishes,
                total: total || 0,
                page,
                limit,
                total_pages: Math.ceil((total || 0) / limit)
            };
        }
        return { dishes: enrichedDishes };
    } catch (dbError) {
        console.error("Error de base de datos:", dbError);
        throw dbError;
    }
}
/**
* Función auxiliar para crear respuestas
*/
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
