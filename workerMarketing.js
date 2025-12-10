// workers/workerMarketing.js
export async function handleMarketingRequests(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
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

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // ============================================
    // LEADS ENDPOINTS
    // ============================================

    if (method === "POST" && pathname === "/api/leads") {
        try {
            const data = await request.json();
            const { restaurant_id, campaign_id, type, contact_value, name, consent_given, source, metadata } = data;

            if (!restaurant_id || !type || !contact_value) {
                return createResponse({ success: false, message: "Missing required fields" }, 400);
            }

            if (!['email', 'phone'].includes(type)) {
                return createResponse({ success: false, message: "Invalid type" }, 400);
            }

            const id = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO marketing_leads (id, restaurant_id, campaign_id, type, contact_value, source, consent_given, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                id,
                restaurant_id,
                campaign_id || null,
                type,
                contact_value,
                source || 'welcome_modal',
                consent_given ? 1 : 0,
                metadata ? JSON.stringify(metadata) : null
            ).run();

            return createResponse({ success: true, message: "Lead saved successfully" });

        } catch (error) {
            console.error("Error saving lead:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // ============================================
    // CAMPAIGNS ENDPOINTS (Admin)
    // ============================================

    // Get campaigns for a restaurant
    if (method === "GET" && pathname.match(/^\/api\/restaurants\/[^/]+\/campaigns$/)) {
        const restaurantId = pathname.split('/')[3];
        try {
            const campaigns = await env.DB.prepare(
                `SELECT * FROM marketing_campaigns WHERE restaurant_id = ? ORDER BY created_at DESC`
            ).bind(restaurantId).all();

            const results = (campaigns.results || []).map(c => ({
                ...c,
                content: c.content ? JSON.parse(c.content) : {},
                settings: c.settings ? JSON.parse(c.settings) : {},
                is_active: !!c.is_active
            }));

            return createResponse({ success: true, campaigns: results });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Create a new campaign
    if (method === "POST" && pathname === "/api/campaigns") {
        try {
            const data = await request.json();
            const { restaurant_id, name, type, content, settings, start_date, end_date } = data;

            const id = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO marketing_campaigns (id, restaurant_id, name, type, is_active, content, settings, start_date, end_date)
                 VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
            ).bind(
                id,
                restaurant_id,
                name,
                type || 'welcome_modal',
                JSON.stringify(content || {}),
                JSON.stringify(settings || {}),
                start_date || null,
                end_date || null
            ).run();

            return createResponse({ success: true, id, message: "Campaign created" });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Update a campaign
    if (method === "PUT" && pathname.match(/^\/api\/campaigns\/[^/]+$/)) {
        const id = pathname.split('/').pop();
        try {
            const data = await request.json();
            // Dynamic update builder could go here, for now simple full update
            await env.DB.prepare(
                `UPDATE marketing_campaigns 
                 SET name = COALESCE(?, name), 
                     content = COALESCE(?, content), 
                     settings = COALESCE(?, settings), 
                     is_active = COALESCE(?, is_active),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`
            ).bind(
                data.name,
                data.content ? JSON.stringify(data.content) : null,
                data.settings ? JSON.stringify(data.settings) : null,
                data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
                id
            ).run();

            return createResponse({ success: true, message: "Campaign updated" });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    return null;
}
