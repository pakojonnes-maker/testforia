
export async function handleAllergensRequests(request, env) {
    const url = new URL(request.url);
    const origin = request.url.origin || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

    // =============================================
    // OBTENER ALÉRGENOS
    // =============================================
    if (request.method === "GET" && url.pathname === "/allergens") {
        try {
            // Mapeo de casos especiales para nombres de archivos
            // 'allergen_id' -> 'filename.svg'
            const filenameOverrides = {
                'allergen_crustaceans': 'allergen_crustacean.svg',
                'allergen_lupin': 'allergen_lupins.svg',
                'allergen_sulphites': 'allergen_sulfites.svg',
                'allergen_molluscs': 'allergen_shellfish.svg',
                'allergen_soy': 'allergen_soya.svg'
            };

            // OPTIMIZACIÓN: Una sola consulta JOIN para traer alérgenos y sus traducciones
            const results = await env.DB.prepare(`
                SELECT a.id, t.language_code, t.value as translated_name
                FROM allergens a
                LEFT JOIN translations t ON 
                    a.id = t.entity_id AND 
                    t.entity_type = 'allergen' AND 
                    t.field = 'name'
                ORDER BY a.id
            `).all();

            if (!results.results) {
                return createResponse({ success: true, allergens: [] });
            }

            // Procesar resultados para agrupar traducciones
            const allergensMap = new Map();

            for (const row of results.results) {
                if (!allergensMap.has(row.id)) {
                    // Determinar nombre del archivo
                    let filename;
                    if (filenameOverrides[row.id]) {
                        filename = filenameOverrides[row.id];
                    } else {
                        // Por defecto usar el ID completo (ej. 'allergen_celery.svg')
                        filename = `${row.id}.svg`;
                    }

                    allergensMap.set(row.id, {
                        id: row.id,
                        icon_url: `${origin}/media/System/allergens/${filename}`,
                        translations: { name: {} }
                    });
                }

                if (row.language_code && row.translated_name) {
                    const allergen = allergensMap.get(row.id);
                    allergen.translations.name[row.language_code] = row.translated_name;
                }
            }

            // Convertir mapa a array
            const allergensList = Array.from(allergensMap.values());

            return createResponse({
                success: true,
                allergens: allergensList
            }, 200, {
                // Cachear por 24 horas en el navegador
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
            });

        } catch (error) {
            console.error("[Allergens] Error:", error);
            return createResponse({
                success: false,
                message: "Error al obtener alérgenos: " + error.message
            }, 500);
        }
    }

    return null;
}

// Función auxiliar mejorada para respuestas
function createResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            ...extraHeaders
        },
    });
}
