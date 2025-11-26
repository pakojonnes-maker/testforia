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
    const method = request.method;
    const path = url.pathname;

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // =============================================
        // MENÚS (MENUS)
        // =============================================

        // GET /restaurants/:id/menus
        if (method === "GET" && path.match(/^\/restaurants\/[\w-]+\/menus$/)) {
            const restaurantId = path.split('/')[2];

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
        }

        // =============================================
        // SECCIONES (SECTIONS)
        // =============================================

        // GET /restaurants/:id/sections
        if (method === "GET" && path.match(/^\/restaurants\/[\w-]+\/sections$/)) {
            const restaurantId = path.split('/')[2];
            return await getSectionsForRestaurant(restaurantId, env);
        }

        // GET /sections?restaurant_id=... (Legacy)
        if (method === "GET" && path === "/sections") {
            const params = new URLSearchParams(url.search);
            const restaurantId = params.get('restaurant_id');
            if (!restaurantId) return createResponse({ success: false, message: "Restaurant ID required" }, 400);
            return await getSectionsForRestaurant(restaurantId, env);
        }

        // PROTECTED ROUTES
        const userData = await authenticateRequest(request);
        if (!userData) {
            return createResponse({ success: false, message: "Unauthorized" }, 401);
        }

        // POST /sections (Create)
        if (method === "POST" && path === "/sections") {
            const data = await request.json();
            const { restaurant_id, menu_id, translations, order_index, icon_url, bg_color } = data;

            if (!restaurant_id || !menu_id) {
                return createResponse({ success: false, message: "Missing required fields" }, 400);
            }

            const sectionId = `sect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            // Get max order if not provided
            let finalOrderIndex = order_index;
            if (finalOrderIndex === undefined) {
                const maxOrder = await env.DB.prepare(`
          SELECT MAX(order_index) as max_order FROM sections WHERE menu_id = ?
        `).bind(menu_id).first();
                finalOrderIndex = (maxOrder?.max_order || 0) + 1;
            }

            await env.DB.prepare(`
        INSERT INTO sections (id, restaurant_id, menu_id, order_index, icon_url, bg_color)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(sectionId, restaurant_id, menu_id, finalOrderIndex, icon_url || null, bg_color || null).run();

            // Handle translations
            if (translations) {
                const stmt = env.DB.prepare(`
          INSERT INTO translations (entity_id, entity_type, language_code, field, value)
          VALUES (?, 'section', ?, ?, ?)
        `);

                const batch = [];
                if (translations.name) {
                    for (const [lang, val] of Object.entries(translations.name)) {
                        if (val) batch.push(stmt.bind(sectionId, lang, 'name', val));
                    }
                }
                if (translations.description) {
                    for (const [lang, val] of Object.entries(translations.description)) {
                        if (val) batch.push(stmt.bind(sectionId, lang, 'description', val));
                    }
                }
                if (batch.length > 0) await env.DB.batch(batch);
            }

            return createResponse({ success: true, sectionId, message: "Section created" });
        }

        // PUT /sections/:id (Update)
        if (method === "PUT" && path.match(/^\/sections\/[^/]+$/)) {
            const sectionId = path.split('/')[2];
            const data = await request.json();
            const { menu_id, order_index, icon_url, bg_color, translations, restaurant_id } = data;

            await env.DB.prepare(`
        UPDATE sections SET menu_id = ?, order_index = ?, icon_url = ?, bg_color = ?, modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(menu_id, order_index, icon_url, bg_color, sectionId).run();

            // Update translations
            if (translations) {
                // Delete old
                await env.DB.prepare("DELETE FROM translations WHERE entity_id = ? AND entity_type = 'section'").bind(sectionId).run();

                const stmt = env.DB.prepare(`
          INSERT INTO translations (entity_id, entity_type, language_code, field, value)
          VALUES (?, 'section', ?, ?, ?)
        `);

                const batch = [];
                if (translations.name) {
                    for (const [lang, val] of Object.entries(translations.name)) {
                        if (val) batch.push(stmt.bind(sectionId, lang, 'name', val));
                    }
                }
                if (translations.description) {
                    for (const [lang, val] of Object.entries(translations.description)) {
                        if (val) batch.push(stmt.bind(sectionId, lang, 'description', val));
                    }
                }
                if (batch.length > 0) await env.DB.batch(batch);
            }

            return createResponse({ success: true, message: "Section updated" });
        }

        // DELETE /sections/:id
        if (method === "DELETE" && path.match(/^\/sections\/[^/]+$/)) {
            const sectionId = path.split('/')[2];

            // Check for dishes
            const dishCount = await env.DB.prepare("SELECT COUNT(*) as count FROM section_dishes WHERE section_id = ?").bind(sectionId).first();
            if (dishCount.count > 0) {
                return createResponse({ success: false, message: "Cannot delete section with dishes" }, 400);
            }

            await env.DB.prepare("DELETE FROM translations WHERE entity_id = ? AND entity_type = 'section'").bind(sectionId).run();
            await env.DB.prepare("DELETE FROM sections WHERE id = ?").bind(sectionId).run();

            return createResponse({ success: true, message: "Section deleted" });
        }

        // PUT /restaurants/:id/sections/order (Update Order)
        if (method === "PUT" && path.match(/^\/restaurants\/[^/]+\/sections\/order$/)) {
            const data = await request.json();
            const { section_ids } = data;

            if (Array.isArray(section_ids)) {
                const stmt = env.DB.prepare("UPDATE sections SET order_index = ? WHERE id = ?");
                const batch = section_ids.map((id, index) => stmt.bind(index + 1, id));
                await env.DB.batch(batch);
            }

            return createResponse({ success: true, message: "Order updated" });
        }

    } catch (error) {
        console.error('[Sections] Error:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }

    return null;
}

// Helper to get sections with full details
async function getSectionsForRestaurant(restaurantId, env) {
    const sectionsData = await env.DB.prepare(`
    SELECT s.id, s.menu_id, s.order_index, s.icon_url, s.bg_color
    FROM sections s
    WHERE s.restaurant_id = ?
    ORDER BY s.order_index ASC
  `).bind(restaurantId).all();

    const sections = sectionsData.results || [];

    const sectionsWithDetails = await Promise.all(sections.map(async (section) => {
        // Get Menu Name
        const menu = await env.DB.prepare("SELECT name FROM menus WHERE id = ?").bind(section.menu_id).first();

        // Get Translations
        const translations = { name: {}, description: {} };
        const transRows = await env.DB.prepare(`
      SELECT language_code, field, value 
      FROM translations 
      WHERE entity_id = ? AND entity_type = 'section'
    `).bind(section.id).all();

        if (transRows.results) {
            transRows.results.forEach(row => {
                if (translations[row.field]) {
                    translations[row.field][row.language_code] = row.value;
                }
            });
        }

        // Get Dish Count
        const dishCount = await env.DB.prepare("SELECT COUNT(*) as count FROM section_dishes WHERE section_id = ?").bind(section.id).first();

        return {
            ...section,
            menu_name: menu?.name || "Unknown Menu",
            translations,
            dish_count: dishCount?.count || 0
        };
    }));

    return createResponse({ success: true, sections: sectionsWithDetails });
}
