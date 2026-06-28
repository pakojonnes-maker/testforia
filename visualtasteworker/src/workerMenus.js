// workerMenus.js
export async function handleMenuRequests(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // NUEVO: Endpoint con formato /restaurants/:id/menus
  if (request.method === "GET" && pathname.match(/^\/restaurants\/[^\/]+\/menus$/)) {
    const parts = pathname.split('/');
    const restaurantId = parts[2]; // Obtener el ID del restaurante de la ruta
    
    try {
      // Verificar que el restaurante existe
      const restaurantExists = await env.DB.prepare(`
        SELECT id FROM restaurants WHERE id = ?
      `).bind(restaurantId).first();
      
      if (!restaurantExists) {
        return createResponse({ 
          success: false, 
          message: "Restaurante no encontrado" 
        }, 404);
      }
      
      // Obtener todos los menús del restaurante
      const menus = await env.DB.prepare(`
        SELECT id, name, description, is_active, is_default, is_seasonal, start_date, end_date
        FROM menus
        WHERE restaurant_id = ?
        ORDER BY is_default DESC, name ASC
      `).bind(restaurantId).all();
      
      return createResponse({
        success: true,
        menus: menus.results || []
      });
    } catch (dbError) {
      console.error("Error en /restaurants/:id/menus:", dbError);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + dbError.message
      }, 500);
    }
  }
  
  // EXISTENTE: Endpoint original para compatibilidad
  if (request.method === "GET" && pathname === "/menus") {
    // Verificar autorización
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createResponse({ success: false, message: "No autorizado" }, 401);
    }
    
    // Obtener restaurant_id de la query string
    const params = new URLSearchParams(url.search);
    const restaurantId = params.get('restaurant_id');
    
    if (!restaurantId) {
      return createResponse({ success: false, message: "Restaurant ID requerido" }, 400);
    }

    try {
      // Obtener todos los menús del restaurante
      const menus = await env.DB.prepare(`
        SELECT id, name, description, is_active, is_default, is_seasonal, start_date, end_date
        FROM menus
        WHERE restaurant_id = ?
        ORDER BY is_default DESC, name ASC
      `).bind(restaurantId).all();

      return createResponse({
        success: true,
        menus: menus.results || []
      });

    } catch (dbError) {
      console.error("Error de base de datos:", dbError);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + dbError.message
      }, 500);
    }
  }
  
  // NUEVO: Endpoint para obtener el menú por defecto
  if (request.method === "GET" && pathname.match(/^\/restaurants\/[^\/]+\/menus\/default$/)) {
    const parts = pathname.split('/');
    const restaurantId = parts[2]; // Obtener el ID del restaurante
    
    try {
      // Buscar el menú predeterminado
      const defaultMenu = await env.DB.prepare(`
        SELECT id, name, description, is_active, is_default, is_seasonal, start_date, end_date
        FROM menus
        WHERE restaurant_id = ? AND is_active = TRUE AND is_default = TRUE
        LIMIT 1
      `).bind(restaurantId).first();
      
      // Si no hay menú predeterminado, buscar cualquier menú activo
      if (!defaultMenu) {
        const anyMenu = await env.DB.prepare(`
          SELECT id, name, description, is_active, is_default, is_seasonal, start_date, end_date
          FROM menus
          WHERE restaurant_id = ? AND is_active = TRUE
          LIMIT 1
        `).bind(restaurantId).first();
        
        if (!anyMenu) {
          return createResponse({ 
            success: false, 
            message: "No hay menús disponibles para este restaurante" 
          }, 404);
        }
        
        return createResponse({
          success: true,
          menu: anyMenu
        });
      }
      
      return createResponse({
        success: true,
        menu: defaultMenu
      });
      
    } catch (dbError) {
      console.error("Error en /restaurants/:id/menus/default:", dbError);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + dbError.message
      }, 500);
    }
  }

  // NUEVO: Endpoint para obtener un menú específico por ID
  if (request.method === "GET" && pathname.match(/^\/menus\/[^\/]+$/)) {
    const menuId = pathname.split('/').pop();
    
    try {
      const menu = await env.DB.prepare(`
        SELECT id, restaurant_id, name, description, is_active, is_default, is_seasonal, start_date, end_date
        FROM menus
        WHERE id = ?
      `).bind(menuId).first();
      
      if (!menu) {
        return createResponse({ success: false, message: "Menú no encontrado" }, 404);
      }
      
      return createResponse({
        success: true,
        menu
      });
      
    } catch (dbError) {
      console.error("Error en /menus/:id:", dbError);
      return createResponse({ 
        success: false, 
        message: "Error en el servidor: " + dbError.message
      }, 500);
    }
  }

  // Si no es una ruta de menús, devuelve null
  return null;
}

// Función auxiliar para crear respuestas
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