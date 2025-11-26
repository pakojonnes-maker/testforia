import { verifyJWT, JWT_SECRET } from './workerAuthentication.js';

// ===========================================================================
// CLOUDFLARE WORKER - DISHES API
// ===========================================================================

// Helper for CORS headers
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

export async function handleDishRequests(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // OPTIONS handled in main worker, but good to have fallback
    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // GET /restaurants/:id/dishes
        if (method === "GET" && path.match(/^\/restaurants\/[^/]+\/dishes$/)) {
            const restaurantId = path.split('/')[2];

            // Optional: Check auth if this is an admin endpoint (assuming public for now for menu view, but admin needs auth)
            // For now, we'll allow public access to GET dishes for the menu, but we might want to filter hidden ones if not admin
            // Let's check auth to see if we should show all or only active
            const userData = await authenticateRequest(request);
            const isAdmin = !!userData;

            let query = `
        SELECT d.*, 
               t_name.value as name, 
               t_desc.value as description
        FROM dishes d
        LEFT JOIN translations t_name ON d.id = t_name.entity_id AND t_name.entity_type = 'dish' AND t_name.field = 'name' AND t_name.language_code = 'es'
        LEFT JOIN translations t_desc ON d.id = t_desc.entity_id AND t_desc.entity_type = 'dish' AND t_desc.field = 'description' AND t_desc.language_code = 'es'
        WHERE d.restaurant_id = ?
      `;

            if (!isAdmin) {
                query += " AND d.status = 'active'";
            }

            query += " ORDER BY d.created_at DESC";

            const dishes = await env.DB.prepare(query).bind(restaurantId).all();

            // Get media for each dish (simplified)
            // In a real app, you might want to do this more efficiently or load media separately
            const dishesWithMedia = await Promise.all(dishes.results.map(async (dish) => {
                const media = await env.DB.prepare(`
          SELECT * FROM dish_media WHERE dish_id = ? ORDER BY is_primary DESC, order_index ASC LIMIT 1
        `).bind(dish.id).first();
                return { ...dish, thumbnail: media ? media.r2_key : null };
            }));

            return createResponse({ success: true, dishes: dishesWithMedia });
        }

        // GET /dishes/:id
        if (method === "GET" && path.match(/^\/dishes\/[^/]+$/)) {
            const dishId = path.split('/')[2];

            const dish = await env.DB.prepare(`
        SELECT d.*, 
               t_name.value as name, 
               t_desc.value as description
        FROM dishes d
        LEFT JOIN translations t_name ON d.id = t_name.entity_id AND t_name.entity_type = 'dish' AND t_name.field = 'name' AND t_name.language_code = 'es'
        LEFT JOIN translations t_desc ON d.id = t_desc.entity_id AND t_desc.entity_type = 'dish' AND t_desc.field = 'description' AND t_desc.language_code = 'es'
        WHERE d.id = ?
      `).bind(dishId).first();

            if (!dish) return createResponse({ success: false, message: "Dish not found" }, 404);

            // Get all media
            const media = await env.DB.prepare(`
        SELECT * FROM dish_media WHERE dish_id = ? ORDER BY order_index ASC
      `).bind(dishId).all();

            // Get allergens
            const allergens = await env.DB.prepare(`
        SELECT a.id, a.icon_url 
        FROM dish_allergens da
        JOIN allergens a ON da.allergen_id = a.id
        WHERE da.dish_id = ?
      `).bind(dishId).all();

            return createResponse({
                success: true,
                dish: {
                    ...dish,
                    media: media.results,
                    allergens: allergens.results.map(a => a.id)
                }
            });
        }

        // PROTECTED ROUTES BELOW
        const userData = await authenticateRequest(request);
        if (!userData) {
            return createResponse({ success: false, message: "Unauthorized" }, 401);
        }

        // POST /restaurants/:id/dishes (Create)
        if (method === "POST" && path.match(/^\/restaurants\/[^/]+\/dishes$/)) {
            const restaurantId = path.split('/')[2];
            const data = await request.json();

            const dishId = `dish_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Insert dish
            await env.DB.prepare(`
        INSERT INTO dishes (id, restaurant_id, price, status, is_vegetarian, is_vegan, is_gluten_free)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
                dishId,
                restaurantId,
                data.price || 0,
                data.status || 'active',
                data.is_vegetarian ? 1 : 0,
                data.is_vegan ? 1 : 0,
                data.is_gluten_free ? 1 : 0
            ).run();

            // Insert translations
            if (data.name) {
                await env.DB.prepare(`
          INSERT INTO translations (entity_id, entity_type, language_code, field, value)
          VALUES (?, 'dish', 'es', 'name', ?)
        `).bind(dishId, data.name).run();
            }

            if (data.description) {
                await env.DB.prepare(`
          INSERT INTO translations (entity_id, entity_type, language_code, field, value)
          VALUES (?, 'dish', 'es', 'description', ?)
        `).bind(dishId, data.description).run();
            }

            // Handle allergens if provided
            if (data.allergens && Array.isArray(data.allergens)) {
                for (const allergenId of data.allergens) {
                    await env.DB.prepare(`
            INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (?, ?)
          `).bind(dishId, allergenId).run();
                }
            }

            return createResponse({ success: true, dish: { id: dishId, ...data } }, 201);
        }

        // PUT /dishes/:id (Update)
        if (method === "PUT" && path.match(/^\/dishes\/[^/]+$/)) {
            const dishId = path.split('/')[2];
            const data = await request.json();

            // Update main dish fields
            await env.DB.prepare(`
        UPDATE dishes 
        SET price = ?, status = ?, is_vegetarian = ?, is_vegan = ?, is_gluten_free = ?, modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
                data.price,
                data.status,
                data.is_vegetarian ? 1 : 0,
                data.is_vegan ? 1 : 0,
                data.is_gluten_free ? 1 : 0,
                dishId
            ).run();

            // Update translations (upsert logic simplified)
            if (data.name) {
                // Delete old and insert new (simpler than upsert in some SQLites)
                await env.DB.prepare("DELETE FROM translations WHERE entity_id = ? AND field = 'name' AND language_code = 'es'").bind(dishId).run();
                await env.DB.prepare(`
          INSERT INTO translations (entity_id, entity_type, language_code, field, value)
          VALUES (?, 'dish', 'es', 'name', ?)
        `).bind(dishId, data.name).run();
            }

            if (data.description) {
                await env.DB.prepare("DELETE FROM translations WHERE entity_id = ? AND field = 'description' AND language_code = 'es'").bind(dishId).run();
                await env.DB.prepare(`
          INSERT INTO translations (entity_id, entity_type, language_code, field, value)
          VALUES (?, 'dish', 'es', 'description', ?)
        `).bind(dishId, data.description).run();
            }

            // Update allergens
            if (data.allergens && Array.isArray(data.allergens)) {
                await env.DB.prepare("DELETE FROM dish_allergens WHERE dish_id = ?").bind(dishId).run();
                for (const allergenId of data.allergens) {
                    await env.DB.prepare(`
            INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (?, ?)
          `).bind(dishId, allergenId).run();
                }
            }

            return createResponse({ success: true, message: "Dish updated" });
        }

        // DELETE /dishes/:id
        if (method === "DELETE" && path.match(/^\/dishes\/[^/]+$/)) {
            const dishId = path.split('/')[2];

            // Delete related data (cascading usually handles this, but good to be safe)
            await env.DB.prepare("DELETE FROM dish_allergens WHERE dish_id = ?").bind(dishId).run();
            await env.DB.prepare("DELETE FROM translations WHERE entity_id = ?").bind(dishId).run();
            await env.DB.prepare("DELETE FROM dishes WHERE id = ?").bind(dishId).run();

            return createResponse({ success: true, message: "Dish deleted" });
        }

    } catch (error) {
        console.error('[Dishes] Error:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }

    return null;
}
