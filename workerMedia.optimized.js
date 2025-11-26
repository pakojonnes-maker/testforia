// workerMedia.js - Versión optimizada
export async function handleMediaRequests(request, env) {
    const url = new URL(request.url);

    // =============================================
    // OBTENCIÓN DE MEDIOS
    // =============================================

    // Endpoint para obtener todos los medios de un restaurante
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[\w-]+\/media$/)) {
        try {
            // Extraer restaurant_id del path
            const restaurantId = url.pathname.split('/')[2];
            console.log(`[Media] Obteniendo medios para restaurante: ${restaurantId}`);

            // OPTIMIZACIÓN: Unir con translations en la misma consulta para evitar N+1
            // Usamos LEFT JOIN para traer la traducción si existe
            const mediaQuery = await env.DB.prepare(`
        SELECT 
          dm.id, dm.dish_id, dm.media_type, dm.content_type, dm.r2_key,
          dm.is_primary, dm.role, dm.display_name, dm.width, dm.height, 
          dm.duration, dm.file_size, dm.order_index, d.restaurant_id,
          t.value as translated_name
        FROM dish_media dm
        JOIN dishes d ON dm.dish_id = d.id
        LEFT JOIN translations t ON 
          t.entity_id = dm.dish_id AND 
          t.entity_type = 'dish' AND 
          t.field = 'name' AND 
          t.language_code = 'es'
        WHERE d.restaurant_id = ? AND dm.media_type != 'thumbnail'
        ORDER BY dm.role, dm.order_index, dm.created_at DESC
      `).bind(restaurantId).all();

            const results = mediaQuery.results || [];

            // OPTIMIZACIÓN: Crear mapa de thumbnails para búsqueda O(1) en lugar de O(N*M)
            // Mapeamos dish_id -> url del thumbnail (PRIMARY_IMAGE)
            const thumbnailMap = new Map();
            results.forEach(m => {
                if (m.media_type === 'image' && m.role === 'PRIMARY_IMAGE') {
                    thumbnailMap.set(m.dish_id, `${url.origin}/media/${m.r2_key}`);
                }
            });

            const media = results.map(m => {
                // Construir objeto con propiedades del medio
                const mediaItem = {
                    id: m.id,
                    dish_id: m.dish_id,
                    dish_name: m.translated_name || 'Plato sin nombre', // Usar el nombre traducido directamente
                    media_type: m.media_type || 'image',
                    content_type: m.content_type || 'application/octet-stream',
                    r2_key: m.r2_key,
                    role: m.role || (m.is_primary ? (m.media_type === 'video' ? 'PRIMARY_VIDEO' : 'PRIMARY_IMAGE') : 'GALLERY_IMAGE'),
                    is_primary: m.is_primary === 1 || m.role === 'PRIMARY_VIDEO' || m.role === 'PRIMARY_IMAGE',
                    order_index: m.order_index || 0,
                    url: `${url.origin}/media/${m.r2_key}`,
                    width: m.width || 0,
                    height: m.height || 0,
                    duration: m.duration || 0,
                    display_name: m.display_name || m.r2_key.split('/').pop(),
                    file_size: m.file_size || 0
                };

                // Solo añadir thumbnail_url para videos y solo si existe un thumbnail real
                if (m.media_type === 'video') {
                    const thumbnailUrl = thumbnailMap.get(m.dish_id);
                    // Añadir la propiedad solo si se encuentra un thumbnail real
                    if (thumbnailUrl) {
                        mediaItem.thumbnail_url = thumbnailUrl;
                    }
                    // Si no hay thumbnail_url, el cliente mostrará el placeholder
                }

                return mediaItem;
            });

            return createResponse({
                success: true,
                media: media
            });
        } catch (error) {
            console.error("[Media] Error al obtener medios del restaurante:", error);
            console.error("[Media] Error stack:", error.stack);
            return createResponse({
                success: false,
                message: "Error al obtener medios: " + error.message
            }, 500);
        }
    }

    // Endpoint para obtener medios por rol (nuevo)
    if (request.method === "GET" && url.pathname.match(/^\/dishes\/[\w-]+\/media\/role\/[\w-]+$/)) {
        try {
            const parts = url.pathname.split('/');
            const dishId = parts[2];
            const role = parts[4].toUpperCase(); // PRIMARY_VIDEO, PRIMARY_IMAGE, GALLERY_IMAGE

            console.log(`[Media] Obteniendo medios con rol ${role} para plato: ${dishId}`);

            const mediaQuery = await env.DB.prepare(`
        SELECT * FROM dish_media 
        WHERE dish_id = ? AND role = ?
        ORDER BY order_index, created_at DESC
      `).bind(dishId, role).all();

            const media = (mediaQuery.results || []).map(m => ({
                id: m.id,
                dish_id: m.dish_id,
                media_type: m.media_type || 'image',
                content_type: m.content_type || 'application/octet-stream',
                r2_key: m.r2_key,
                role: m.role,
                is_primary: m.is_primary === 1 || m.role.startsWith('PRIMARY_'),
                order_index: m.order_index || 0,
                url: `${url.origin}/media/${m.r2_key}`,
                thumbnail_url: m.media_type === 'video' ?
                    `${url.origin}/media/restaurants/${m.restaurant_id}/dishes/${m.dish_id}/thumbnails/${m.id.replace('media_', '')}.jpg` : null,
                width: m.width || 0,
                height: m.height || 0,
                duration: m.duration || 0,
                display_name: m.display_name || m.r2_key.split('/').pop(),
                file_size: m.file_size || 0
            }));

            return createResponse({
                success: true,
                role: role,
                media: media
            });
        } catch (error) {
            console.error(`[Media] Error al obtener medios con rol: ${error.message}`);
            return createResponse({
                success: false,
                message: "Error al obtener medios: " + error.message
            }, 500);
        }
    }

    // Endpoint para obtener medios de un plato
    if (request.method === "GET" && url.pathname.match(/^\/dishes\/[\w-]+\/media$/)) {
        try {
            const dishId = url.pathname.split('/')[2];
            console.log(`[Media] Obteniendo medios para plato: ${dishId}`);

            const mediaQuery = await env.DB.prepare(`
        SELECT dm.*, d.restaurant_id
        FROM dish_media dm
        JOIN dishes d ON dm.dish_id = d.id
        WHERE dm.dish_id = ? AND dm.media_type != 'thumbnail'
        ORDER BY dm.role, dm.order_index, dm.created_at DESC
      `).bind(dishId).all();

            const media = (mediaQuery.results || []).map(m => ({
                id: m.id,
                dish_id: m.dish_id,
                media_type: m.media_type || 'image',
                content_type: m.content_type || 'application/octet-stream',
                r2_key: m.r2_key,
                role: m.role || (m.is_primary ? (m.media_type === 'video' ? 'PRIMARY_VIDEO' : 'PRIMARY_IMAGE') : 'GALLERY_IMAGE'),
                is_primary: m.is_primary === 1 || m.role === 'PRIMARY_VIDEO' || m.role === 'PRIMARY_IMAGE',
                order_index: m.order_index || 0,
                url: `${url.origin}/media/${m.r2_key}`,
                thumbnail_url: m.media_type === 'video' ?
                    buildThumbnailUrl(url.origin, m.restaurant_id, m.dish_id, m.id) : null,
                width: m.width || 0,
                height: m.height || 0,
                duration: m.duration || 0,
                display_name: m.display_name || m.r2_key.split('/').pop(),
                file_size: m.file_size || 0
            }));

            return createResponse({
                success: true,
                media: media
            });
        } catch (error) {
            console.error(`[Media] Error al obtener medios del plato: ${error.message}`);
            return createResponse({
                success: false,
                message: "Error al obtener medios: " + error.message
            }, 500);
        }
    }

    // =============================================
    // SUBIDA DE MEDIOS
    // =============================================

    // Endpoint para subir medios con nueva estructura
    if (request.method === "POST" && url.pathname === "/media/upload") {
        try {
            console.log("[Media] Procesando subida de archivo");
            const formData = await request.formData();
            const file = formData.get('file');
            const dishId = formData.get('dish_id');
            const role = formData.get('role') || 'GALLERY_IMAGE'; // Default a galería si no se especifica
            const orderIndex = parseInt(formData.get('order_index') || '0', 10);
            const displayName = formData.get('display_name') || file.name || '';

            // Validaciones
            if (!file || !dishId) {
                return createResponse({
                    success: false,
                    message: "Se requiere archivo y dish_id"
                }, 400);
            }

            // Validar que el role es válido
            const validRoles = ['PRIMARY_VIDEO', 'PRIMARY_IMAGE', 'GALLERY_IMAGE'];
            if (!validRoles.includes(role)) {
                return createResponse({
                    success: false,
                    message: `Rol inválido. Debe ser uno de: ${validRoles.join(', ')}`
                }, 400);
            }

            // Validación de tipo de medio según el rol
            const contentType = file.type;
            const isVideo = contentType.startsWith('video/');
            const mediaType = isVideo ? 'video' : 'image';

            if (role === 'PRIMARY_VIDEO' && !isVideo) {
                return createResponse({
                    success: false,
                    message: "Para rol PRIMARY_VIDEO, el archivo debe ser un video"
                }, 400);
            }

            if (role === 'PRIMARY_IMAGE' && isVideo) {
                return createResponse({
                    success: false,
                    message: "Para rol PRIMARY_IMAGE, el archivo debe ser una imagen"
                }, 400);
            }

            // Obtener el plato y su restaurant_id
            const dish = await env.DB.prepare(
                "SELECT id, restaurant_id FROM dishes WHERE id = ?"
            ).bind(dishId).first();

            if (!dish) {
                return createResponse({
                    success: false,
                    message: "Plato no encontrado"
                }, 404);
            }

            const restaurantId = dish.restaurant_id;

            // Si es un rol principal, verificar si ya existe uno y actualizar
            if (role === 'PRIMARY_VIDEO' || role === 'PRIMARY_IMAGE') {
                // Actualizar cualquier medio existente con el mismo rol para este plato
                await env.DB.prepare(`
          UPDATE dish_media 
          SET role = 'GALLERY_IMAGE' 
          WHERE dish_id = ? AND role = ?
        `).bind(dishId, role).run();
            }

            // Generar ID único para el medio
            const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            // Crear clave para R2 con la nueva estructura jerárquica
            const fileExt = getExtensionFromContentType(contentType);

            // Determinar directorio según rol
            let directory;
            if (role === 'PRIMARY_VIDEO') {
                directory = 'videos';
            } else if (role === 'PRIMARY_IMAGE') {
                directory = 'thumbnails';
            } else {
                directory = 'gallery';
            }

            // Construir la ruta final de almacenamiento
            const r2Key = `restaurants/${restaurantId}/dishes/${dishId}/${directory}/${mediaId}.${fileExt}`;

            // Obtener datos del archivo
            const arrayBuffer = await file.arrayBuffer();

            // Subir a R2
            await env.R2_BUCKET.put(r2Key, arrayBuffer, {
                httpMetadata: {
                    contentType: contentType
                }
            });

            // Determinar dimensiones (en un entorno real, esto requeriría procesamiento de imagen/video)
            const dimensions = await getDimensionsFromBuffer(arrayBuffer, mediaType);

            // Guardar en base de datos con el nuevo campo de rol
            await env.DB.prepare(`
        INSERT INTO dish_media (
          id, dish_id, media_type, content_type, r2_key, role,
          display_name, width, height, duration, file_size, 
          is_primary, order_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
                mediaId,
                dishId,
                mediaType,
                contentType,
                r2Key,
                role,
                displayName,
                dimensions.width,
                dimensions.height,
                dimensions.duration,
                arrayBuffer.byteLength,
                (role === 'PRIMARY_VIDEO' || role === 'PRIMARY_IMAGE') ? 1 : 0,
                orderIndex,
                new Date().toISOString()
            ).run();

            const mediaUrl = `${url.origin}/media/${r2Key}`;

            return createResponse({
                success: true,
                media: {
                    id: mediaId,
                    dish_id: dishId,
                    media_type: mediaType,
                    content_type: contentType,
                    r2_key: r2Key,
                    role: role,
                    is_primary: (role === 'PRIMARY_VIDEO' || role === 'PRIMARY_IMAGE'),
                    order_index: orderIndex,
                    url: mediaUrl,
                    display_name: displayName,
                    width: dimensions.width,
                    height: dimensions.height,
                    duration: dimensions.duration,
                    file_size: arrayBuffer.byteLength
                }
            });
        } catch (error) {
            console.error("[Media] Error al subir medio:", error);
            console.error("[Media] Stack:", error.stack);
            return createResponse({
                success: false,
                message: "Error al procesar el archivo: " + error.message
            }, 500);
        }
    }

    // =============================================
    // ACTUALIZACIÓN DE MEDIOS
    // =============================================

    // Endpoint para actualizar rol de un medio
    if (request.method === "PUT" && url.pathname.match(/^\/media\/[\w-]+\/role$/)) {
        try {
            const mediaId = url.pathname.split('/')[2];
            const data = await request.json();
            const newRole = data.role;
            const dishId = data.dish_id;

            if (!newRole || !dishId) {
                return createResponse({
                    success: false,
                    message: "Se requiere role y dish_id"
                }, 400);
            }

            // Validar que el role es válido
            const validRoles = ['PRIMARY_VIDEO', 'PRIMARY_IMAGE', 'GALLERY_IMAGE'];
            if (!validRoles.includes(newRole)) {
                return createResponse({
                    success: false,
                    message: `Rol inválido. Debe ser uno de: ${validRoles.join(', ')}`
                }, 400);
            }

            // Obtener información del medio
            const media = await env.DB.prepare(`
        SELECT * FROM dish_media WHERE id = ?
      `).bind(mediaId).first();

            if (!media) {
                return createResponse({
                    success: false,
                    message: "Medio no encontrado"
                }, 404);
            }

            // Validar tipo de medio para el rol
            if (newRole === 'PRIMARY_VIDEO' && media.media_type !== 'video') {
                return createResponse({
                    success: false,
                    message: "Solo se pueden establecer videos como PRIMARY_VIDEO"
                }, 400);
            }

            if (newRole === 'PRIMARY_IMAGE' && media.media_type !== 'image') {
                return createResponse({
                    success: false,
                    message: "Solo se pueden establecer imágenes como PRIMARY_IMAGE"
                }, 400);
            }

            // Si es un rol principal, actualizar cualquier otro medio con ese rol
            if (newRole === 'PRIMARY_VIDEO' || newRole === 'PRIMARY_IMAGE') {
                await env.DB.prepare(`
          UPDATE dish_media 
          SET role = 'GALLERY_IMAGE', is_primary = FALSE
          WHERE dish_id = ? AND role = ? AND id != ?
        `).bind(dishId, newRole, mediaId).run();
            }

            // Actualizar el rol del medio
            await env.DB.prepare(`
        UPDATE dish_media 
        SET role = ?, is_primary = ?
        WHERE id = ?
      `).bind(
                newRole,
                (newRole === 'PRIMARY_VIDEO' || newRole === 'PRIMARY_IMAGE') ? 1 : 0,
                mediaId
            ).run();

            return createResponse({
                success: true,
                message: `Rol actualizado correctamente a ${newRole}`,
                media: { id: mediaId, role: newRole }
            });
        } catch (error) {
            console.error(`[Media] Error al actualizar rol: ${error.message}`);
            return createResponse({
                success: false,
                message: "Error al actualizar rol: " + error.message
            }, 500);
        }
    }

    // Endpoint para actualizar orden de medios en galería
    if (request.method === "PUT" && url.pathname.match(/^\/dishes\/[\w-]+\/media\/order$/)) {
        try {
            const dishId = url.pathname.split('/')[2];
            const data = await request.json();
            const mediaIds = data.media_ids;

            if (!Array.isArray(mediaIds)) {
                return createResponse({
                    success: false,
                    message: "Se requiere array de media_ids"
                }, 400);
            }

            // Actualizar orden de cada medio
            for (let i = 0; i < mediaIds.length; i++) {
                await env.DB.prepare(`
          UPDATE dish_media 
          SET order_index = ? 
          WHERE id = ? AND dish_id = ?
        `).bind(i, mediaIds[i], dishId).run();
            }

            return createResponse({
                success: true,
                message: "Orden actualizado correctamente"
            });
        } catch (error) {
            console.error(`[Media] Error al actualizar orden: ${error.message}`);
            return createResponse({
                success: false,
                message: "Error al actualizar orden: " + error.message
            }, 500);
        }
    }

    // =============================================
    // ELIMINACIÓN DE MEDIOS
    // =============================================

    // Endpoint para eliminar medios
    if (request.method === "DELETE" && url.pathname.match(/^\/media\/[\w-]+$/)) {
        try {
            const mediaId = url.pathname.split('/').pop();

            // Obtener información del medio
            const media = await env.DB.prepare(`
        SELECT dm.id, dm.dish_id, dm.r2_key, dm.media_type, dm.role, d.restaurant_id
        FROM dish_media dm
        JOIN dishes d ON dm.dish_id = d.id
        WHERE dm.id = ?
      `).bind(mediaId).first();

            if (!media) {
                return createResponse({ success: false, message: "Medio no encontrado" }, 404);
            }

            // Eliminar de R2
            await env.R2_BUCKET.delete(media.r2_key);
            console.log(`[Media] Eliminado archivo ${media.r2_key} de R2`);

            // Eliminar de la base de datos
            await env.DB.prepare(`DELETE FROM dish_media WHERE id = ?`).bind(mediaId).run();

            return createResponse({
                success: true,
                message: "Medio eliminado correctamente"
            });
        } catch (error) {
            console.error("[Media] Error al eliminar medio:", error);
            return createResponse({
                success: false,
                message: "Error al eliminar medio: " + error.message
            }, 500);
        }
    }

    // =============================================
    // SERVIR ARCHIVOS
    // =============================================

    // Endpoint para servir medios - Optimizado
    if (request.method === "GET" && url.pathname.startsWith('/media/')) {
        try {
            const key = decodeURIComponent(url.pathname.replace('/media/', ''));
            console.log(`[Media] Sirviendo: ${key}`);

            // Obtener objeto de R2
            const object = await env.R2_BUCKET.get(key);

            if (!object) {
                console.error(`[Media] Archivo no encontrado: ${key}`);
                return new Response('Archivo no encontrado', {
                    status: 404,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "text/plain"
                    }
                });
            }

            // Determinar si es un video
            const isVideo = object.httpMetadata?.contentType?.startsWith('video/') || key.endsWith('.mp4');

            // Headers para streaming optimizado CON CORS
            const headers = new Headers({
                'Content-Type': object.httpMetadata?.contentType || (isVideo ? 'video/mp4' : 'application/octet-stream'),
                'Cache-Control': 'public, max-age=86400',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Range',
                'Cross-Origin-Resource-Policy': 'cross-origin',
                'ETag': object.etag,
            });

            // Soporte optimizado para Range requests (streaming)
            const range = request.headers.get('Range');
            if (range && isVideo) {
                try {
                    const rangeValues = range.match(/bytes=(\d+)-(\d*)/);
                    if (rangeValues) {
                        const start = parseInt(rangeValues[1]);
                        const end = rangeValues[2] ? parseInt(rangeValues[2]) : object.size - 1;

                        if (start >= 0 && end < object.size && start <= end) {
                            const contentLength = end - start + 1;
                            headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
                            headers.set('Content-Length', contentLength.toString());

                            return new Response(object.body.slice(start, end + 1), {
                                status: 206,
                                headers
                            });
                        }
                    }
                } catch (rangeError) {
                    console.error(`[Media] Error procesando Range:`, rangeError);
                }
            }

            // Retornar archivo completo
            return new Response(object.body, { headers });
        } catch (error) {
            console.error(`[Media] Error al servir medio: ${error.message}`, error);
            return new Response(JSON.stringify({
                success: false,
                message: "Error al servir el archivo: " + error.message
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
    }

    // =============================================
    // SOPORTE CORS
    // =============================================

    // Soporte para OPTIONS (CORS preflight)
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
                "Access-Control-Max-Age": "86400",
            }
        });
    }

    return null;
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================

// Función para construir la URL del thumbnail
function buildThumbnailUrl(origin, restaurantId, dishId, mediaId) {
    const thumbnailMediaId = mediaId.replace('media_', '');
    return `${origin}/media/restaurants/${restaurantId}/dishes/${dishId}/thumbnails/thumb_${thumbnailMediaId}.jpg`;
}

function findThumbnailUrl(mediaResults, dishId, origin) {
    // Buscar solo imágenes explícitamente configuradas como PRIMARY_IMAGE para el plato
    const primaryImage = mediaResults.find(m =>
        m.media_type === 'image' &&
        m.role === 'PRIMARY_IMAGE' &&
        m.dish_id === dishId
    );

    // Devolver la URL de la imagen si existe, o null para indicar que se debe usar un placeholder
    return primaryImage ? `${origin}/media/${primaryImage.r2_key}` : null;
}

// Función para obtener la extensión del tipo de contenido
function getExtensionFromContentType(contentType) {
    const map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/webm': 'webm'
    };
    return map[contentType] || 'bin';
}

// Función para simular obtención de dimensiones (en producción, esto requeriría procesamiento real)
async function getDimensionsFromBuffer(buffer, mediaType) {
    // Este es un placeholder - en producción usarías una biblioteca para analizar el archivo
    // Por ejemplo: sharp para imágenes, ffprobe para videos
    return {
        width: mediaType === 'video' ? 1280 : 800,
        height: mediaType === 'video' ? 720 : 600,
        duration: mediaType === 'video' ? 15000 : null // 15 segundos para videos
    };
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
