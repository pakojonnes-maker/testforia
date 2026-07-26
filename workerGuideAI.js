// workerGuideAI.js — Guidebook AI Assistant
// =====================================================
// Endpoint: POST /guide/ai/chat
// Uses Workers AI (Llama) with RAG context from D1
// Returns: SSE stream of tokens
// =====================================================

function errorResponse(message, status = 400) {
    return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Builds the RAG context string from the apartment's D1 data
 */
async function buildContext(env, apartmentId, lang = 'es') {
    try {
        // Load apartment basic info
        const apartment = await env.DB.prepare(`
            SELECT a.name, a.address, z.name AS zone_name, z.region
            FROM guide_apartments a
            JOIN guide_zones z ON a.zone_id = z.id
            WHERE a.id = ?
        `).bind(apartmentId).first();

        if (!apartment) return null;

        // Load info items (wifi, rules, checkout, etc.)
        const infoItems = await env.DB.prepare(`
            SELECT ai.info_key,
                   t_title.value AS title,
                   t_content.value AS content
            FROM guide_apartment_info ai
            LEFT JOIN translations t_title ON ai.id = t_title.entity_id
                AND t_title.entity_type = 'apartment_info'
                AND t_title.field = 'title'
                AND t_title.language_code = ?
            LEFT JOIN translations t_content ON ai.id = t_content.entity_id
                AND t_content.entity_type = 'apartment_info'
                AND t_content.field = 'content'
                AND t_content.language_code = ?
            WHERE ai.apartment_id = ?
            ORDER BY ai.order_index ASC
        `).bind(lang, lang, apartmentId).all();

        // Load experiences for the zone
        const aptZone = await env.DB.prepare(`
            SELECT zone_id FROM guide_apartments WHERE id = ?
        `).bind(apartmentId).first();

        let experiences = { results: [] };
        if (aptZone?.zone_id) {
            experiences = await env.DB.prepare(`
                SELECT
                    t_name.value AS name,
                    e.price_display,
                    e.action_type,
                    e.action_data,
                    e.action_prefilled_message,
                    t_desc.value AS description
                FROM guide_pois e
                LEFT JOIN translations t_name ON e.id = t_name.entity_id
                    AND t_name.entity_type = 'poi'
                    AND t_name.field = 'name'
                    AND t_name.language_code = ?
                LEFT JOIN translations t_desc ON e.id = t_desc.entity_id
                    AND t_desc.entity_type = 'poi'
                    AND t_desc.field = 'description'
                    AND t_desc.language_code = ?
                WHERE e.zone_id = ? AND e.is_active = TRUE AND e.is_bookable = TRUE
                ORDER BY e.is_featured DESC, e.order_index ASC
                LIMIT 10
            `).bind(lang, lang, aptZone.zone_id).all();
        }

        // Build context string
        let ctx = `PROPIEDAD: ${apartment.name}\nUBICACIÓN: ${apartment.address || ''}, ${apartment.zone_name}${apartment.region ? ', ' + apartment.region : ''}\n\n`;

        if (infoItems.results?.length > 0) {
            ctx += 'INFORMACIÓN DE LA PROPIEDAD:\n';
            for (const item of infoItems.results) {
                if (item.title && item.content) {
                    ctx += `- ${item.title}: ${item.content}\n`;
                }
            }
            ctx += '\n';
        }

        if (experiences.results?.length > 0) {
            ctx += 'EXPERIENCIAS Y ACTIVIDADES DISPONIBLES:\n';
            for (const exp of experiences.results) {
                if (exp.name) {
                    let line = `- ${exp.name}`;
                    if (exp.price_display) line += ` (${exp.price_display})`;
                    if (exp.description) line += `: ${exp.description}`;
                    if (exp.action_type === 'WHATSAPP' && exp.action_data) {
                        line += ` — Reservar por WhatsApp: ${exp.action_data}`;
                    } else if (exp.action_type === 'URL' && exp.action_data) {
                        line += ` — Más info: ${exp.action_data}`;
                    } else if (exp.action_type === 'PHONE' && exp.action_data) {
                        line += ` — Tel: ${exp.action_data}`;
                    }
                    ctx += line + '\n';
                }
            }
        }

        return { context: ctx, apartmentName: apartment.name };
    } catch (err) {
        console.error('[GuideAI] Error building context:', err);
        return null;
    }
}

/**
 * Main AI chat handler
 * POST /guide/ai/chat
 * Body: { apartmentId, sessionId?, message, history? }
 */
export async function handleGuideAI(request, env) {
    if (request.method !== 'POST') return null;

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/guide/ai/')) return null;

    // Check AI binding
    if (!env.AI) {
        return errorResponse('AI service not configured', 503);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Invalid JSON body');
    }

    const { apartmentId, message, history = [] } = body;

    if (!apartmentId || !message?.trim()) {
        return errorResponse('apartmentId and message are required');
    }

    // Get language from history context or default
    const lang = body.lang || 'es';

    // Build RAG context
    const contextData = await buildContext(env, apartmentId, lang);

    if (!contextData) {
        return errorResponse('Apartment not found', 404);
    }

    // Build system prompt
    const systemPrompt = `Eres el asistente virtual de "${contextData.apartmentName}", una propiedad de alquiler vacacional.
Tu misión es ayudar al huésped durante su estancia de forma amable, concisa y útil.

${contextData.context}

REGLAS IMPORTANTES:
- Responde ÚNICAMENTE con información que esté en el contexto anterior.
- Si no tienes la información, di educadamente que no tienes ese dato y sugiere contactar al anfitrión.
- Sé breve y directo. Máximo 3-4 frases por respuesta.
- Responde siempre en el mismo idioma que el usuario.
- Para reservas o consultas específicas, proporciona los datos de contacto cuando estén disponibles.
- No inventes precios, horarios ni datos que no estén en el contexto.`;

    // Build messages array for the model
    // Keep max 10 history messages to stay within context limits
    const recentHistory = history.slice(-10);
    const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message.trim() }
    ];

    try {
        // Use Workers AI streaming
        const response = await env.AI.run(
            '@cf/meta/llama-3.1-8b-instruct-fp8',
            {
                messages,
                stream: true,
                max_tokens: 512,
                temperature: 0.7,
            }
        );

        // Return the SSE stream directly with proper headers
        return new Response(response, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (err) {
        console.error('[GuideAI] Workers AI error:', err);
        return errorResponse('AI service error: ' + err.message, 500);
    }
}
