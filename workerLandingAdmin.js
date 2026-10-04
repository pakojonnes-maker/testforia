// workers/workerLandingAdmin.js
export async function handleLandingAdminRequests(request, env) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  // Verificar autorización
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse({ success: false, message: "No autorizado" }, 401);
  }

  // ===== GET /admin/landing/sections?restaurant_id=X =====
  if (request.method === "GET" && url.pathname === "/admin/landing/sections") {
    const restaurantId = params.get('restaurant_id');
    
    if (!restaurantId) {
      return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
    }

    try {
      const result = await env.DB.prepare(`
        SELECT 
          rls.id,
          rls.section_key,
          rls.order_index,
          rls.is_active,
          rls.variant,
          rls.config_data,
          rls.created_at,
          rls.modified_at,
          lsl.name as section_name,
          lsl.description,
          lsl.icon_name,
          lsl.category,
          lsl.available_variants,
          lsl.customizable_props
        FROM restaurant_landing_sections rls
        JOIN landing_section_library lsl ON rls.section_key = lsl.section_key
        WHERE rls.restaurant_id = ?
        ORDER BY rls.order_index ASC
      `).bind(restaurantId).all();

      const sections = result.results.map(section => ({
        ...section,
        config_data: JSON.parse(section.config_data || '{}'),
        available_variants: JSON.parse(section.available_variants || '[]'),
        customizable_props: JSON.parse(section.customizable_props || '[]'),
      }));

      console.log(`[LandingAdmin] Found ${sections.length} sections for ${restaurantId}`);
      return createResponse({ success: true, data: sections });

    } catch (error) {
      console.error("[LandingAdmin] Error getting sections:", error);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + error.message 
      }, 500);
    }
  }

  // ===== GET /admin/landing/library =====
  if (request.method === "GET" && url.pathname === "/admin/landing/library") {
    try {
      const result = await env.DB.prepare(`
        SELECT *
        FROM landing_section_library
        WHERE is_active = TRUE
        ORDER BY display_order ASC
      `).all();

      const library = result.results.map(section => ({
        ...section,
        available_variants: JSON.parse(section.available_variants || '[]'),
        customizable_props: JSON.parse(section.customizable_props || '[]'),
        default_config: JSON.parse(section.default_config || '{}'),
      }));

      return createResponse({ success: true, data: library });

    } catch (error) {
      console.error("[LandingAdmin] Error getting library:", error);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + error.message 
      }, 500);
    }
  }

  // ===== POST /admin/landing/sections =====
  if (request.method === "POST" && url.pathname === "/admin/landing/sections") {
    try {
      const body = await request.json();
      const { restaurant_id, section_key, variant, config_data } = body;

      // Verificar si ya existe
      const existing = await env.DB.prepare(`
        SELECT id FROM restaurant_landing_sections
        WHERE restaurant_id = ? AND section_key = ?
      `).bind(restaurant_id, section_key).first();

      if (existing) {
        return createResponse({ success: false, message: 'La sección ya existe' }, 400);
      }

      // Obtener el siguiente order_index
      const maxOrder = await env.DB.prepare(`
        SELECT COALESCE(MAX(order_index), 0) as max_order
        FROM restaurant_landing_sections
        WHERE restaurant_id = ?
      `).bind(restaurant_id).first();

      const newOrderIndex = (maxOrder?.max_order || 0) + 1;

      // Obtener config por defecto
      const librarySection = await env.DB.prepare(`
        SELECT default_config FROM landing_section_library
        WHERE section_key = ?
      `).bind(section_key).first();

      const defaultConfig = librarySection ? JSON.parse(librarySection.default_config || '{}') : {};
      const finalConfig = { ...defaultConfig, ...config_data };

      // Insertar
      const id = `rls_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO restaurant_landing_sections 
        (id, restaurant_id, section_key, order_index, is_active, variant, config_data, created_at, modified_at)
        VALUES (?, ?, ?, ?, TRUE, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        id,
        restaurant_id,
        section_key,
        newOrderIndex,
        variant || 'default',
        JSON.stringify(finalConfig)
      ).run();

      return createResponse({ success: true, data: { id, order_index: newOrderIndex } });

    } catch (error) {
      console.error("[LandingAdmin] Error adding section:", error);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + error.message 
      }, 500);
    }
  }

  // ===== PUT /admin/landing/sections/:id =====
  if (request.method === "PUT" && url.pathname.startsWith("/admin/landing/sections/") && !url.pathname.includes('/reorder')) {
    try {
      const sectionId = url.pathname.split('/')[4];
      const body = await request.json();
      const { variant, config_data, is_active } = body;

      const updates = [];
      const params = [];

      if (variant !== undefined) {
        updates.push('variant = ?');
        params.push(variant);
      }

      if (config_data !== undefined) {
        updates.push('config_data = ?');
        params.push(JSON.stringify(config_data));
      }

      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }

      updates.push('modified_at = CURRENT_TIMESTAMP');
      params.push(sectionId);

      await env.DB.prepare(`
        UPDATE restaurant_landing_sections
        SET ${updates.join(', ')}
        WHERE id = ?
      `).bind(...params).run();

      return createResponse({ success: true, message: 'Sección actualizada' });

    } catch (error) {
      console.error("[LandingAdmin] Error updating section:", error);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + error.message 
      }, 500);
    }
  }
// PUT /admin/landing/sections/reorder — con offset, por el UNIQUE de order_index
if (request.method === "PUT" && url.pathname === "/admin/landing/sections/reorder") {
  try {
    const body = await request.json();
    const { restaurant_id, sections } = body;

    if (!restaurant_id || !sections || !Array.isArray(sections)
        || !sections.every(s => typeof s?.id === 'string' && Number.isInteger(s?.order_index))) {
      return createResponse({
        success: false,
        message: 'restaurant_id y sections son requeridos'
      }, 400);
    }

    // Paso 1: sumar un offset grande (10000) para no chocar con el UNIQUE de
    // order_index; paso 2: dejar los valores finales. Todo en un batch: una
    // sola ida a D1 y en una transacción (antes eran 2N consultas sueltas y un
    // fallo a mitad dejaba la landing con órdenes de 10000).
    const update = (orderIndex, section, touch) => env.DB.prepare(`
        UPDATE restaurant_landing_sections
        SET order_index = ?${touch ? ', modified_at = CURRENT_TIMESTAMP' : ''}
        WHERE id = ? AND restaurant_id = ?
      `).bind(orderIndex, section.id, restaurant_id);
    await env.DB.batch([
      ...sections.map(section => update(section.order_index + 10000, section, false)),
      ...sections.map(section => update(section.order_index, section, true)),
    ]);

    return createResponse({ success: true, message: 'Orden actualizado' });

  } catch (error) {
    console.error("[LandingAdmin] Error reordering sections:", error);
    console.error("[LandingAdmin] Error stack:", error.stack);
    return createResponse({ 
      success: false, 
      message: "Error en el servidor: " + error.message 
    }, 500);
  }
}



  // ===== DELETE /admin/landing/sections/:id =====
  if (request.method === "DELETE" && url.pathname.startsWith("/admin/landing/sections/")) {
    try {
      const sectionId = url.pathname.split('/')[4];

      await env.DB.prepare(`
        DELETE FROM restaurant_landing_sections
        WHERE id = ?
      `).bind(sectionId).run();

      return createResponse({ success: true, message: 'Sección eliminada' });

    } catch (error) {
      console.error("[LandingAdmin] Error deleting section:", error);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + error.message 
      }, 500);
    }
  }

  // ===== POST /admin/landing/sections/:id/toggle =====
  if (request.method === "POST" && url.pathname.includes('/toggle')) {
    try {
      const sectionId = url.pathname.split('/')[4];

      await env.DB.prepare(`
        UPDATE restaurant_landing_sections
        SET is_active = NOT is_active, modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(sectionId).run();

      return createResponse({ success: true, message: 'Estado actualizado' });

    } catch (error) {
      console.error("[LandingAdmin] Error toggling section:", error);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + error.message 
      }, 500);
    }
  }

  // Si no coincide ninguna ruta, devolver null
  return null;
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
