import { verifyJWT, JWT_SECRET } from './workerAuthentication.js';

// ===========================================================================
// CLOUDFLARE WORKER - RESTAURANTS API
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

export async function handleRestaurantRequests(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // GET /restaurants/:id (Public info)
        if (method === "GET" && path.match(/^\/restaurants\/[^/]+$/)) {
            const restaurantId = path.split('/')[2];

            const restaurant = await env.DB.prepare(`
        SELECT * FROM restaurants WHERE id = ?
      `).bind(restaurantId).first();

            if (!restaurant) return createResponse({ success: false, message: "Restaurant not found" }, 404);

            return createResponse(restaurant);
        }

        // GET /restaurants/:id/styling
        if (method === "GET" && path.match(/^\/restaurants\/[^/]+\/styling$/)) {
            const restaurantId = path.split('/')[2];

            // Get theme or config overrides
            // Assuming we use web_customizations or themes table
            // For simplicity, let's check web_customizations first
            const customization = await env.DB.prepare(`
        SELECT override_colors FROM web_customizations WHERE restaurant_id = ?
      `).bind(restaurantId).first();

            let colors = {};
            if (customization && customization.override_colors) {
                colors = JSON.parse(customization.override_colors);
            }

            return createResponse(colors);
        }

        // PROTECTED ROUTES
        const userData = await authenticateRequest(request);
        if (!userData) {
            return createResponse({ success: false, message: "Unauthorized" }, 401);
        }

        // PUT /restaurants/:id (Update basic info)
        if (method === "PUT" && path.match(/^\/restaurants\/[^/]+$/)) {
            const restaurantId = path.split('/')[2];
            const data = await request.json();

            await env.DB.prepare(`
        UPDATE restaurants 
        SET name = ?, description = ?, phone = ?, email = ?, modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(data.name, data.description, data.phone, data.email, restaurantId).run();

            return createResponse({ success: true, message: "Restaurant updated" });
        }

        // PUT /restaurants/:id/styling (Update colors)
        if (method === "PUT" && path.match(/^\/restaurants\/[^/]+\/styling$/)) {
            const restaurantId = path.split('/')[2];
            const data = await request.json(); // { primary_color, secondary_color, ... }

            // Check if customization exists
            const exists = await env.DB.prepare("SELECT id FROM web_customizations WHERE restaurant_id = ?").bind(restaurantId).first();

            const colorsJson = JSON.stringify(data);

            if (exists) {
                await env.DB.prepare(`
          UPDATE web_customizations 
          SET override_colors = ?, modified_at = CURRENT_TIMESTAMP
          WHERE restaurant_id = ?
        `).bind(colorsJson, restaurantId).run();
            } else {
                const id = `custom_${Date.now()}`;
                await env.DB.prepare(`
          INSERT INTO web_customizations (id, restaurant_id, override_colors)
          VALUES (?, ?, ?)
        `).bind(id, restaurantId, colorsJson).run();
            }

            return createResponse({ success: true, message: "Styling updated" });
        }

    } catch (error) {
        console.error('[Restaurants] Error:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }

    return null;
}
