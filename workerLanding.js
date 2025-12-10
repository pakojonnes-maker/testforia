// workers/workerLanding.js - OPTIMIZED & i18n READY ✅
export async function handleLandingRequests(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[^/]+\/landing$/)) {
        const slug = url.pathname.split('/')[2];
        const language = url.searchParams.get('lang') || 'es';

        try {
            console.log(`[Landing] 🚀 Loading fast: ${slug}, lang: ${language}`);

            // Helper para limpiar URLs (Arregla el problema de 'mediabucket/')
            const getMediaUrl = (key) => {
                if (!key) return null;
                if (key.startsWith('http')) return key;
                // Elimina 'mediabucket/' del inicio si viene de la BD así
                const cleanKey = key.replace(/^mediabucket\//, '');
                return `${url.origin}/media/${cleanKey}`;
            };

            // 1. PASO CRÍTICO: Obtener Restaurante (Bloqueante)
            // Necesitamos el ID para las demás consultas
            const restaurant = await env.DB.prepare(`
        SELECT 
          r.id, r.name, r.slug, r.description,
          r.email, r.phone, r.address, r.website, 
          r.city, r.country,
          r.logo_url, r.cover_image_url,
          t.primary_color, t.secondary_color, t.accent_color,
          t.text_color, t.background_color, t.font_family, t.font_accent
        FROM restaurants r
        LEFT JOIN themes t ON r.theme_id = t.id
        WHERE r.slug = ? AND r.is_active = TRUE
      `).bind(slug).first();

            if (!restaurant) {
                return createResponse({ success: false, message: 'Restaurant not found' }, 404);
            }

            // 2. EJECUCIÓN EN PARALELO (Mejora drástica de velocidad)
            // Lanzamos todas las consultas a la vez
            const [
                sectionsRes,
                translationsRes,
                dishesRes,
                galleryMediaRes,
                languagesRes, // ✅ i18n: Ya existe pero se mejora abajo
                detailsRes,
                seoRes,
                tagImagesRes,
                aboutImagesRes,
                heroSlidesRes,
                menusRes,
                uiStringsRes, // ✅ NUEVO: UI strings para i18n
                restaurantLanguagesRes // ✅ NUEVO: Idiomas del restaurante
            ] = await Promise.all([
                // Sections
                env.DB.prepare(`
          SELECT rls.id, rls.section_key, rls.order_index, rls.is_active, rls.variant, rls.config_data,
                 lsl.name as section_name, lsl.description
          FROM restaurant_landing_sections rls
          JOIN landing_section_library lsl ON rls.section_key = lsl.section_key
          WHERE rls.restaurant_id = ? AND rls.is_active = TRUE
          ORDER BY rls.order_index ASC
        `).bind(restaurant.id).all(),

                // Translations
                env.DB.prepare(`SELECT field, value FROM translations WHERE entity_type = 'restaurant' AND entity_id = ? AND language_code = ?`).bind(restaurant.id, language).all(),

                // Featured Dishes
                env.DB.prepare(`
          SELECT d.id, d.price, t.value as name, t2.value as description, dm.r2_key as image_url
          FROM dishes d
          LEFT JOIN translations t ON d.id = t.entity_id AND t.field = 'name' AND t.language_code = ?
          LEFT JOIN translations t2 ON d.id = t2.entity_id AND t2.field = 'description' AND t2.language_code = ?
          LEFT JOIN dish_media dm ON d.id = dm.dish_id AND dm.is_primary = TRUE
          WHERE d.restaurant_id = ? AND d.status = 'active' AND d.is_featured = TRUE
          ORDER BY d.view_count DESC LIMIT 8
        `).bind(language, language, restaurant.id).all(),

                // Gallery (Plan A: restaurant_media)
                env.DB.prepare(`SELECT id, r2_key, alt_text, metadata_json FROM restaurant_media WHERE restaurant_id = ? AND context = 'gallery' AND is_active = 1 ORDER BY order_index ASC`).bind(restaurant.id).all(),

                // Languages (legacy - mantenido por compatibilidad)
                env.DB.prepare(`SELECT code, name, native_name, flag_emoji FROM languages WHERE is_active = TRUE ORDER BY code ASC`).all(),

                // Details
                env.DB.prepare(`SELECT * FROM restaurant_details WHERE restaurant_id = ?`).bind(restaurant.id).first(),

                // SEO
                env.DB.prepare(`SELECT * FROM landing_seo WHERE restaurant_id = ? AND language_code = ?`).bind(restaurant.id, language).first(),

                // Tag Images
                env.DB.prepare(`SELECT * FROM restaurant_media WHERE restaurant_id = ? AND context = 'tag' AND is_active = 1 ORDER BY order_index ASC`).bind(restaurant.id).all(),

                // About Images
                env.DB.prepare(`SELECT * FROM restaurant_media WHERE restaurant_id = ? AND context = 'about' AND is_active = 1 ORDER BY order_index ASC`).bind(restaurant.id).all(),

                // Hero Slides
                env.DB.prepare(`SELECT * FROM restaurant_media WHERE restaurant_id = ? AND context = 'hero' AND role = 'slide' AND is_active = 1 ORDER BY order_index ASC`).bind(restaurant.id).all(),

                // Menus (para secciones premium)
                env.DB.prepare(`SELECT id, name, description, external_url, featured_video_url, featured_poster_url FROM menus WHERE restaurant_id = ? AND is_active = 1 ORDER BY created_at ASC`).bind(restaurant.id).all(),

                // ✅ NUEVO: UI Strings para i18n
                env.DB.prepare(`
          SELECT key_name, label
          FROM localization_strings
          WHERE context = 'landing' AND language_code = ?
        `).bind(language).all(),

                // ✅ NUEVO: Idiomas configurados del restaurante (con fallback)
                env.DB.prepare(`
          SELECT l.code, l.name, l.native_name, l.flag_emoji, rl.priority
          FROM restaurant_languages rl
          JOIN languages l ON rl.language_code = l.code
          WHERE rl.restaurant_id = ? AND rl.is_enabled = TRUE
          ORDER BY rl.priority ASC
        `).bind(restaurant.id).all()
            ]);

            // 3. PROCESAMIENTO DE DATOS

            // ✅ NUEVO: Procesar UI strings
            const ui = {};
            (uiStringsRes.results || []).forEach(row => {
                ui[row.key_name] = row.label;
            });
            console.log(`[Landing] ✅ Loaded ${Object.keys(ui).length} UI strings for language: ${language}`);

            // ✅ NUEVO: Procesar idiomas con fallback automático
            let languages = restaurantLanguagesRes.results || [];

            if (languages.length === 0) {
                // Fallback: Si no hay idiomas configurados, usar todos los activos
                console.log(`[Landing] ⚠️ No configured languages for restaurant, using system defaults`);
                languages = languagesRes.results || [];
            } else {
                console.log(`[Landing] ✅ Using ${languages.length} configured languages`);
            }

            // Translations Map
            const translations = (translationsRes.results || []).reduce((acc, t) => {
                acc[t.field] = t.value; return acc;
            }, {});

            // Gallery Logic (BD -> Fallback R2 -> Fallback Legacy)
            let galleryItems = [];

            // A) Desde restaurant_media (Prioridad)
            if (galleryMediaRes && galleryMediaRes.results.length > 0) {
                galleryItems = galleryMediaRes.results.map((m, idx) => {
                    const meta = JSON.parse(m.metadata_json || '{}');
                    return {
                        id: m.id,
                        image_url: getMediaUrl(m.r2_key),
                        alt: m.alt_text || `Gallery ${idx + 1}`,
                        title: meta.title || '',
                        description: meta.description || '',
                        category: 'Restaurant',
                        is_featured: false
                    };
                });
            }
            // B) Fallback R2 (Solo si A falla)
            else {
                try {
                    const r2Prefix = `restaurants/${restaurant.id}/landing/gallery/`;
                    const listResult = await env.MEDIA_BUCKET.list({ prefix: r2Prefix });

                    if (listResult && listResult.objects && listResult.objects.length > 0) {
                        galleryItems = listResult.objects
                            .filter(obj => ['jpg', 'jpeg', 'png', 'webp'].some(ext => obj.key.toLowerCase().endsWith(ext)))
                            .map((obj, idx) => ({
                                id: `gallery_r2_${idx}`,
                                image_url: `${url.origin}/media/${obj.key}`,
                                alt: 'Gallery Image',
                                title: '', description: '', category: 'Restaurant', is_featured: false
                            }));
                    } else {
                        // C) Fallback Legacy (dish_media)
                        const legacyRes = await env.DB.prepare(`
                SELECT DISTINCT dm.r2_key FROM dish_media dm JOIN dishes d ON dm.dish_id = d.id
                WHERE d.restaurant_id = ? AND dm.role = 'GALLERY_IMAGE' LIMIT 12
             `).bind(restaurant.id).all();

                        galleryItems = (legacyRes.results || []).map((g, idx) => ({
                            id: `gal_legacy_${idx}`,
                            image_url: getMediaUrl(g.r2_key),
                            alt: 'Gallery', title: '', description: '', category: '', is_featured: false
                        }));
                    }
                } catch (e) { console.error('Gallery Fallback Error:', e); }
            }

            // Processing Media Sections
            const tagImages = (tagImagesRes.results || []).map(img => {
                const meta = JSON.parse(img.metadata_json || '{}');
                return { text: meta.display_text || img.role, image_url: getMediaUrl(img.r2_key), alt: img.alt_text };
            });

            const aboutImages = (aboutImagesRes.results || []).map(img => {
                const meta = JSON.parse(img.metadata_json || '{}');
                return {
                    id: img.id,
                    image_url: getMediaUrl(img.r2_key),
                    alt: img.alt_text,
                    position: meta.position || 'center',
                    parallax_depth: meta.parallax_depth || 0.5
                };
            });

            const heroSlides = (heroSlidesRes.results || []).map(s => ({
                id: s.id,
                image_url: getMediaUrl(s.r2_key),
                alt: s.alt_text
            }));

            const landingPatternUrl = `${url.origin}/media/System/landing/patron.png`;

            // 4. PREPARAR RESPUESTA
            const theme = {
                primary_color: restaurant.primary_color || '#FF6B6B',
                secondary_color: restaurant.secondary_color || '#4ECDC4',
                accent_color: restaurant.accent_color || '#FFE66D',
                text_color: restaurant.text_color || '#333333',
                background_color: restaurant.background_color || '#FFFFFF',
                font_family: restaurant.font_family || 'Inter, sans-serif',
                font_accent: restaurant.font_accent || 'Playfair Display, serif'
            };

            const sections = (sectionsRes.results || []).map(s => {
                const config = JSON.parse(s.config_data || '{}');

                // Inject Premium Data for Menu Section
                if (s.section_key === 'menu' && s.variant === 'premium') {
                    let videos = [];
                    if ((config.premium_videos_source || 'from_menus') === 'from_menus') {
                        videos = (menusRes.results || []).map(m => ({
                            src: m.featured_video_url,
                            poster: m.featured_poster_url,
                            href: m.external_url,
                            title: m.name,
                            hasVideo: !!m.featured_video_url
                        }));
                    } else {
                        videos = config.premium_manual_videos || [];
                    }
                    s.premium = {
                        title: config.premium_layout_title || null,
                        menus: menusRes.results || [],
                        videos,
                        per_page: { desktop: Number(config.premium_per_page_desktop ?? 3), tablet: Number(config.premium_per_page_tablet ?? 2), mobile: Number(config.premium_per_page_mobile ?? 1) },
                        autoplay_on_hover: config.premium_autoplay_on_hover !== false,
                        loop: config.premium_loop !== false,
                        show_dots: config.premium_show_dots !== false
                    };
                }
                return { ...s, config_data: config };
            });

            let details = detailsRes ? {
                ...detailsRes,
                opening_hours: detailsRes.opening_hours ? JSON.parse(detailsRes.opening_hours) : null
            } : null;

            // ✅ RESPUESTA ACTUALIZADA CON i18n
            return createResponse({
                success: true,
                data: {
                    restaurant: { ...restaurant, theme_id: undefined },
                    theme,
                    translations,
                    details,
                    seo: seoRes || {},
                    sections,
                    menu_preview: dishesRes.results.map(d => ({ ...d, image_url: getMediaUrl(d.image_url) })) || [],
                    gallery: galleryItems,
                    languages, // ✅ Ahora incluye idiomas configurados o fallback
                    assets: { landing_pattern_url: landingPatternUrl },
                    restaurant_media: { tag_images: tagImages, about_images: aboutImages, hero_slides: heroSlides },
                    ui, // ✅ NUEVO: UI strings traducidos
                    currentLanguage: language // ✅ NUEVO: Idioma actual
                }
            });

        } catch (error) {
            console.error('[Landing] ❌ Error:', error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }
    return null;
}

export function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
