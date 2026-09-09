// scripts/demo-seed/lib/build.mjs
// =============================================================================
// Motor del sembrador: ficha JSON de una demo -> SQL de alta + SQL de borrado
// + manifiesto de imágenes.
//
// PRINCIPIO DE BORRADO LIMPIO
// El teardown NO se apoya en prefijos de texto en los ids, sino en las mismas
// relaciones que usa deleteApartment() en workerGuideAdmin.js (líneas ~840-960):
// todo lo que crea el sembrador cuelga del apartamento o de la agencia, así que
// borrar por apartment_id/agency_id se lleva exactamente lo sembrado y nada más.
// La lista de tablas de abajo es un espejo deliberado de la de ese fichero; si
// allí se añade una tabla nueva, aquí hay que añadirla también.
//
// LO QUE NO SE TOCA NUNCA (compartido con el resto de la plataforma):
//   guide_zones, guide_pois, guide_poi_media, restaurants,
//   guide_zone_restaurants, guide_info_categories, guide_phone_categories,
//   guide_store_items con owner_type='platform', y sus translations.
// Por eso la demo REUTILIZA el contenido de la zona en lugar de duplicarlo:
// las experiencias y los restaurantes que se ven en la guía son los que ya
// existen en esa zona, y al borrar la demo siguen ahí intactos.
// =============================================================================

import { lit, fill, translationRows, section, ACTIVE_LANGUAGES } from './sql.mjs';
import { GUIDES } from './content/guides.mjs';
import { INFO_BLOCKS } from './content/info.mjs';
import { STORE_ITEMS, WELCOME_MODAL } from './content/store.mjs';

// Los 4 números de emergencia que seedDefaultPhones() inserta al crear un
// apartamento desde el admin, con sus mismos ids deterministas. Se replican
// aquí porque el sembrador escribe SQL directo y nunca pasa por ese código.
const DEFAULT_PHONES = [
    ['emergency', '112'],
    ['police', '092'],
    ['firefighters', '080'],
    ['ambulance', '061'],
];

const MEDIA_ORIGIN = 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

function mediaUrl(r2Key) {
    return `${MEDIA_ORIGIN}/media/${r2Key}`;
}

export function build(demo) {
    const warnings = [];
    const assets = [];

    const agencyId = demo.agency.id || `ag_demo_${demo.key.replace(/-/g, '')}`;
    const aptId = demo.apartment.id || `apt_demo_${demo.key.replace(/-/g, '')}`;

    // Variables de interpolación de las plantillas. Se juntan aquí (y no en el
    // JSON) los valores que ya viven en la ficha del apartamento, para no
    // tenerlos escritos dos veces y que se desincronicen.
    const vars = {
        ...demo.vars,
        apartment_name: demo.apartment.name,
        address: demo.apartment.address,
        checkin_time: demo.apartment.checkin_time,
        checkout_time: demo.apartment.checkout_time,
        wifi_ssid: demo.apartment.wifi_ssid,
        wifi_password: demo.apartment.wifi_password,
        agency_name: demo.agency.name,
    };

    const out = [];
    const push = (...lines) => out.push(...lines);

    push(
        `-- ${'='.repeat(76)}`,
        `-- DEMO: ${demo.agency.name} — ${demo.apartment.name}`,
        `-- Generado por scripts/demo-seed. NO editar a mano: se regenera.`,
        `-- ${'='.repeat(76)}`,
        `-- Agencia:      ${agencyId}`,
        `-- Apartamento:  ${aptId}`,
        `-- Zona:         ${demo.apartment.zone_id} (contenido REUTILIZADO, no se crea nada en ella)`,
        `-- Idiomas:      ${ACTIVE_LANGUAGES.length} (${ACTIVE_LANGUAGES.join(', ')})`,
        `--`,
        `-- Idempotente: se puede volver a aplicar. El slug del apartamento se`,
        `-- genera SOLO la primera vez (ON CONFLICT no lo toca), así que los QR`,
        `-- ya impresos siguen valiendo.`,
        `-- ${'='.repeat(76)}`,
    );

    // ------------------------------------------------------------------ agencia
    push(section('AGENCIA'));
    const logoKey = demo.agency.logo ? `guide/agencies/${agencyId}/${demo.agency.logo}` : null;
    if (logoKey) assets.push({ file: demo.agency.logo, r2_key: logoKey, what: 'Logo de la agencia' });
    const c = demo.agency.colors || {};
    const f = demo.agency.fonts || {};
    push(
        `INSERT INTO guide_agencies (id, name, slug, contact_email, contact_phone, logo_url, is_active,`,
        `                            primary_color, secondary_color, accent_color, headline_font, body_font, label_font)`,
        `VALUES (${lit(agencyId)}, ${lit(demo.agency.name)}, ${lit(demo.agency.slug)}, ${lit(demo.agency.contact_email)},`,
        `        ${lit(demo.agency.contact_phone)}, ${lit(logoKey ? mediaUrl(logoKey) : null)}, 1,`,
        `        ${lit(c.primary)}, ${lit(c.secondary)}, ${lit(c.accent)}, ${lit(f.headline)}, ${lit(f.body)}, ${lit(f.label)})`,
        `ON CONFLICT(id) DO UPDATE SET`,
        `  name = excluded.name, contact_email = excluded.contact_email, contact_phone = excluded.contact_phone,`,
        `  logo_url = excluded.logo_url, primary_color = excluded.primary_color, secondary_color = excluded.secondary_color,`,
        `  accent_color = excluded.accent_color, headline_font = excluded.headline_font, body_font = excluded.body_font,`,
        `  label_font = excluded.label_font, is_active = 1, modified_at = CURRENT_TIMESTAMP;`,
    );

    // -------------------------------------------------------------- apartamento
    push(section('APARTAMENTO'));
    const a = demo.apartment;
    const coverKey = a.cover_image ? `guide/apartments/${aptId}/${a.cover_image}` : null;
    if (coverKey) assets.push({ file: a.cover_image, r2_key: coverKey, what: 'Portada del apartamento' });

    const galleryKeys = (a.gallery || []).map(name => `guide/apartments/${aptId}/gallery/${name}`);
    (a.gallery || []).forEach((name, i) =>
        assets.push({ file: name, r2_key: galleryKeys[i], what: `Galería ${i + 1}` })
    );

    // slugBase() de workerGuideAdmin.js: sin acentos, minúsculas, 32 caracteres.
    // El sufijo aleatorio lo pone SQLite igual que la migración 0089, así que el
    // slug real NUNCA queda escrito en git (que es justo el punto de esa migración).
    const slugBase = String(a.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '');

    push(
        `INSERT INTO guide_apartments (`,
        `    id, agency_id, zone_id, name, slug, address, latitude, longitude, cover_image_url, is_active,`,
        `    wifi_ssid, wifi_password, wifi_security, contact_whatsapp,`,
        `    capacity, bedrooms, beds, bathrooms, size_m2, checkin_time, checkout_time, property_type,`,
        `    description, amenities, gallery_urls, source_url, rating_value, rating_count, external_identifier, imported_at`,
        `) VALUES (`,
        `    ${lit(aptId)}, ${lit(agencyId)}, ${lit(a.zone_id)}, ${lit(a.name)},`,
        `    ${lit(slugBase)} || '-' || lower(hex(randomblob(4))),`,
        `    ${lit(a.address)}, ${lit(a.latitude)}, ${lit(a.longitude)}, ${lit(coverKey ? mediaUrl(coverKey) : null)}, 1,`,
        `    ${lit(a.wifi_ssid)}, ${lit(a.wifi_password)}, ${lit(a.wifi_security || 'WPA')}, ${lit(a.contact_whatsapp)},`,
        `    ${lit(a.capacity)}, ${lit(a.bedrooms)}, ${lit(a.beds)}, ${lit(a.bathrooms)}, ${lit(a.size_m2)},`,
        `    ${lit(a.checkin_time)}, ${lit(a.checkout_time)}, ${lit(a.property_type)},`,
        `    ${lit(a.description)}, ${lit(JSON.stringify(a.amenities || []))},`,
        `    ${lit(JSON.stringify(galleryKeys.map(mediaUrl)))}, ${lit(a.source_url)},`,
        `    ${lit(a.rating_value)}, ${lit(a.rating_count)}, ${lit(a.external_identifier)}, CURRENT_TIMESTAMP`,
        `)`,
        `-- slug fuera del DO UPDATE a propósito: re-sembrar no debe invalidar los QR ya impresos.`,
        `ON CONFLICT(id) DO UPDATE SET`,
        `  agency_id = excluded.agency_id, zone_id = excluded.zone_id, name = excluded.name,`,
        `  address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude,`,
        `  cover_image_url = excluded.cover_image_url, is_active = 1,`,
        `  wifi_ssid = excluded.wifi_ssid, wifi_password = excluded.wifi_password,`,
        `  wifi_security = excluded.wifi_security, contact_whatsapp = excluded.contact_whatsapp,`,
        `  capacity = excluded.capacity, bedrooms = excluded.bedrooms, beds = excluded.beds,`,
        `  bathrooms = excluded.bathrooms, size_m2 = excluded.size_m2, checkin_time = excluded.checkin_time,`,
        `  checkout_time = excluded.checkout_time, property_type = excluded.property_type,`,
        `  description = excluded.description, amenities = excluded.amenities,`,
        `  gallery_urls = excluded.gallery_urls, source_url = excluded.source_url,`,
        `  rating_value = excluded.rating_value, rating_count = excluded.rating_count,`,
        `  external_identifier = excluded.external_identifier, modified_at = CURRENT_TIMESTAMP;`,
    );

    // ------------------------------------------------------------------ guías
    push(section(`GUÍAS E INFORMACIÓN (${GUIDES.length + INFO_BLOCKS.length} bloques x ${ACTIVE_LANGUAGES.length} idiomas)`));
    for (const block of [...GUIDES, ...INFO_BLOCKS]) {
        const infoId = `info_${aptId}_${block.key}`;
        push(
            ``,
            `-- ${block.key}`,
            `INSERT INTO guide_apartment_info (id, apartment_id, info_key, category_key, use_custom_title, icon_name, order_index)`,
            `VALUES (${lit(infoId)}, ${lit(aptId)}, ${lit(block.key)}, ${lit(block.key)}, 0, ${lit(block.icon || null)}, ${block.order})`,
            `ON CONFLICT(id) DO UPDATE SET`,
            `  category_key = excluded.category_key, icon_name = excluded.icon_name,`,
            `  order_index = excluded.order_index, modified_at = CURRENT_TIMESTAMP;`,
        );
        push(...translationRows(infoId, 'apartment_info', { content: block.content }, vars, warnings));

        if (block.image) {
            const key = `guide/apartments/${aptId}/info/${infoId}/${block.image}`;
            assets.push({ file: block.image, r2_key: key, what: `Foto del bloque "${block.key}"` });
            push(
                `INSERT INTO guide_apartment_media (id, apartment_info_id, r2_key, media_type, order_index)`,
                `VALUES (${lit(`med_${infoId}`)}, ${lit(infoId)}, ${lit(key)}, 'image', 0)`,
                `ON CONFLICT(id) DO UPDATE SET r2_key = excluded.r2_key;`,
            );
        }
    }

    // --------------------------------------------------------------- teléfonos
    push(section('TELÉFONOS'));
    const phones = [...DEFAULT_PHONES];
    if (demo.agency.contact_phone) phones.push(['agency', demo.agency.contact_phone]);
    for (const [categoryKey, number] of phones) {
        push(
            `INSERT INTO guide_apartment_phones (id, apartment_id, category_key, phone_number)`,
            `VALUES (${lit(`phone_${aptId}_${categoryKey}`)}, ${lit(aptId)}, ${lit(categoryKey)}, ${lit(number)})`,
            `ON CONFLICT(id) DO UPDATE SET phone_number = excluded.phone_number, modified_at = CURRENT_TIMESTAMP;`,
        );
    }

    // ------------------------------------------------------------------ tienda
    push(section(`TIENDA (${STORE_ITEMS.length} productos x ${ACTIVE_LANGUAGES.length} idiomas)`));
    for (const item of STORE_ITEMS) {
        const itemId = `sitem_${aptId}_${item.slug}`;
        const key = item.image ? `guide/apartments/${aptId}/store/${item.image}` : null;
        if (key) assets.push({ file: item.image, r2_key: key, what: `Producto "${item.slug}"` });
        push(
            ``,
            `-- ${item.slug}`,
            `INSERT INTO guide_store_items (id, owner_type, apartment_id, agency_id, category, icon_name,`,
            `                               price_amount, price_currency, price_display, cover_image_url,`,
            `                               is_featured, is_active, order_index, stock_unlimited)`,
            `VALUES (${lit(itemId)}, 'host', ${lit(aptId)}, ${lit(agencyId)}, ${lit(item.category)}, ${lit(item.icon)},`,
            `        ${lit(item.price)}, 'EUR', ${lit(item.priceDisplay)}, ${lit(key ? mediaUrl(key) : null)},`,
            `        ${item.featured ? 1 : 0}, 1, ${item.order}, 1)`,
            `ON CONFLICT(id) DO UPDATE SET`,
            `  category = excluded.category, icon_name = excluded.icon_name, price_amount = excluded.price_amount,`,
            `  price_display = excluded.price_display, cover_image_url = excluded.cover_image_url,`,
            `  is_featured = excluded.is_featured, is_active = 1, order_index = excluded.order_index,`,
            `  modified_at = CURRENT_TIMESTAMP;`,
        );
        push(...translationRows(itemId, 'store_item', { name: item.name, description: item.description }, vars, warnings));
    }

    // ----------------------------------------------------------- modal de bienvenida
    push(section('MODAL DE BIENVENIDA'));
    const modalId = `wm_${aptId}`;
    const welcomeKey = WELCOME_MODAL.image ? `guide/apartments/${aptId}/${WELCOME_MODAL.image}` : null;
    if (welcomeKey) assets.push({ file: WELCOME_MODAL.image, r2_key: welcomeKey, what: 'Imagen del modal de bienvenida' });
    push(
        `INSERT INTO guide_welcome_modals (id, apartment_id, is_active, image_url, action_enabled, action_type, action_data)`,
        `VALUES (${lit(modalId)}, ${lit(aptId)}, 1, ${lit(welcomeKey ? mediaUrl(welcomeKey) : null)}, 1,`,
        `        ${lit(WELCOME_MODAL.actionType)}, ${lit(demo.apartment.contact_whatsapp)})`,
        `ON CONFLICT(apartment_id) DO UPDATE SET`,
        `  is_active = 1, image_url = excluded.image_url, action_enabled = 1,`,
        `  action_type = excluded.action_type, action_data = excluded.action_data, modified_at = CURRENT_TIMESTAMP;`,
    );
    push(...translationRows(modalId, 'welcome_modal', {
        title: WELCOME_MODAL.title,
        body: WELCOME_MODAL.body,
        action_label: WELCOME_MODAL.actionLabel,
    }, vars, warnings));

    // ---------------------------------------------------------------------- TV
    if (demo.tv) {
        push(section('VISUALTASTE TV'));
        push(
            `INSERT INTO guide_tv_devices (id, apartment_id, pairing_code, device_label, is_active, paired_at)`,
            `VALUES (${lit(`tv_${aptId}`)}, ${lit(aptId)}, ${lit(demo.tv.pairing_code)}, ${lit(demo.tv.label || 'Salón')}, 1, CURRENT_TIMESTAMP)`,
            `ON CONFLICT(id) DO UPDATE SET device_label = excluded.device_label, is_active = 1;`,
        );
        for (const [slot, file] of Object.entries(demo.tv.tiles || {})) {
            const key = `guide/apartments/${aptId}/tv/${file}`;
            assets.push({ file, r2_key: key, what: `Mosaico TV "${slot}"` });
            push(
                `INSERT INTO guide_tv_tile_images (apartment_id, slot, image_url)`,
                `VALUES (${lit(aptId)}, ${lit(slot)}, ${lit(mediaUrl(key))})`,
                `ON CONFLICT(apartment_id, slot) DO UPDATE SET image_url = excluded.image_url, updated_at = CURRENT_TIMESTAMP;`,
            );
        }
    }

    // El slug se genera dentro del INSERT, así que la única forma de conocerlo
    // es preguntárselo a la base después. Última sentencia del fichero para que
    // salga al final de la salida de `wrangler d1 execute --file`.
    push(
        section('URL DE LA DEMO (última consulta: apunta el slug que salga aquí)'),
        `SELECT 'https://guide.visualtastes.com/' || slug AS url_guia, slug`,
        `FROM guide_apartments WHERE id = ${lit(aptId)};`,
    );

    return {
        agencyId,
        aptId,
        warnings,
        assets,
        seed: out.join('\n') + '\n',
        teardown: buildTeardown(demo, agencyId, aptId),
        assetsScript: buildAssetsScript(demo, assets),
    };
}

// -----------------------------------------------------------------------------
// TEARDOWN — espejo de deleteApartment() en workerGuideAdmin.js, más la agencia.
// Los hijos van antes que los padres porque D1 comprueba las claves ajenas al
// momento; no se delega en ON DELETE CASCADE para que el alcance del borrado se
// pueda auditar leyendo esta lista.
// -----------------------------------------------------------------------------
function buildTeardown(demo, agencyId, aptId) {
    const A = lit(aptId);
    const G = lit(agencyId);
    return `-- ${'='.repeat(76)}
-- BORRADO de la demo: ${demo.agency.name} — ${demo.apartment.name}
-- Generado por scripts/demo-seed. Destructivo e irreversible.
-- ${'='.repeat(76)}
--
-- Espejo de deleteApartment() (workerGuideAdmin.js). NO toca nada compartido:
-- la zona ${demo.apartment.zone_id}, sus POIs, sus restaurantes y los catálogos
-- globales quedan exactamente como estaban.
--
-- ⚠️ Esto NO borra los ficheros de R2 ni la caché KV. Después de aplicarlo:
--   npx wrangler r2 object delete mediabucket/guide/apartments/${aptId} --recursive --remote
--   npx wrangler r2 object delete mediabucket/guide/agencies/${agencyId} --recursive --remote
-- y la clave de caché de la guía caduca sola (TTL 15 min); si tienes prisa,
-- bumpea la versión con el comando que imprime seed.mjs.
-- ${'='.repeat(76)}

-- 1. translations (tabla EAV sin claves ajenas: nadie la limpia sola)
DELETE FROM translations WHERE entity_type = 'apartment_info'
  AND entity_id IN (SELECT id FROM guide_apartment_info WHERE apartment_id = ${A});
DELETE FROM translations WHERE entity_type = 'guide_step'
  AND entity_id IN (SELECT s.id FROM guide_info_steps s
                    JOIN guide_apartment_info i ON s.apartment_info_id = i.id
                    WHERE i.apartment_id = ${A});
DELETE FROM translations WHERE entity_type = 'welcome_modal'
  AND entity_id IN (SELECT id FROM guide_welcome_modals WHERE apartment_id = ${A});
DELETE FROM translations WHERE entity_type = 'store_item'
  AND entity_id IN (SELECT id FROM guide_store_items WHERE apartment_id = ${A});

-- 2. media y pasos de las guías
DELETE FROM guide_info_step_media WHERE step_id IN (
  SELECT s.id FROM guide_info_steps s
  JOIN guide_apartment_info i ON s.apartment_info_id = i.id WHERE i.apartment_id = ${A});
DELETE FROM guide_info_steps WHERE apartment_info_id IN (
  SELECT id FROM guide_apartment_info WHERE apartment_id = ${A});
DELETE FROM guide_apartment_media WHERE apartment_info_id IN (
  SELECT id FROM guide_apartment_info WHERE apartment_id = ${A});
DELETE FROM guide_apartment_info WHERE apartment_id = ${A};

-- 3. tienda del piso (los owner_type='platform' llevan apartment_id NULL y no caen aquí)
DELETE FROM guide_store_order_items WHERE order_id IN (
  SELECT id FROM guide_store_orders WHERE apartment_id = ${A});
DELETE FROM guide_store_orders WHERE apartment_id = ${A};
DELETE FROM guide_store_items WHERE apartment_id = ${A};

-- 4. resto de lo que cuelga del apartamento
DELETE FROM guide_welcome_modals WHERE apartment_id = ${A};
DELETE FROM guide_apartment_phones WHERE apartment_id = ${A};
DELETE FROM guide_apartment_pois WHERE apartment_id = ${A};
DELETE FROM guide_apartment_item_order WHERE apartment_id = ${A};
DELETE FROM guide_tv_tile_images WHERE apartment_id = ${A};
DELETE FROM guide_tv_events WHERE apartment_id = ${A};
DELETE FROM guide_tv_devices WHERE apartment_id = ${A};

-- 5. analítica generada por la propia demo
UPDATE guide_commission_ledger SET intent_id = NULL WHERE intent_id IN (
  SELECT id FROM guide_affiliate_intents WHERE apartment_id = ${A});
DELETE FROM guide_affiliate_intents WHERE apartment_id = ${A};
DELETE FROM guide_section_views WHERE apartment_id = ${A};
DELETE FROM guide_sessions WHERE apartment_id = ${A};

-- 6. el apartamento y su agencia
DELETE FROM guide_apartments WHERE id = ${A};
DELETE FROM guide_commission_ledger WHERE agency_id = ${G};
DELETE FROM guide_agency_staff WHERE agency_id = ${G};
DELETE FROM guide_agencies WHERE id = ${G};

-- 7. comprobación: las tres cifras tienen que salir a 0
SELECT
  (SELECT COUNT(*) FROM guide_apartments      WHERE id = ${A})           AS apartamento,
  (SELECT COUNT(*) FROM guide_agencies        WHERE id = ${G})           AS agencia,
  (SELECT COUNT(*) FROM guide_apartment_info  WHERE apartment_id = ${A}) AS bloques_info;
`;
}

// -----------------------------------------------------------------------------
// Script de subida de imágenes. PowerShell porque es el terminal de esta
// máquina. No se sube nada desde Node a propósito: igual que con wrangler d1,
// el sembrador genera y el humano ejecuta.
// -----------------------------------------------------------------------------
function buildAssetsScript(demo, assets) {
    const lines = [
        `# Subida de imágenes de la demo "${demo.key}" a R2 (bucket mediabucket).`,
        `# Deja los ficheros con estos nombres en scripts/demo-seed/assets/${demo.key}/ y ejecuta:`,
        `#   powershell -ExecutionPolicy Bypass -File scripts/demo-seed/out/${demo.key}.assets.ps1`,
        `#`,
        `# Lo que falte se avisa y se salta: la demo funciona igual, esas tarjetas`,
        `# salen con el placeholder gris en vez de con foto.`,
        ``,
        `$base = "scripts/demo-seed/assets/${demo.key}"`,
        ``,
    ];
    for (const asset of assets) {
        lines.push(
            `# ${asset.what}`,
            `if (Test-Path "$base/${asset.file}") {`,
            `  npx wrangler r2 object put "mediabucket/${asset.r2_key}" --file "$base/${asset.file}" --remote`,
            `} else { Write-Host "FALTA: ${asset.file} (${asset.what})" -ForegroundColor Yellow }`,
            ``,
        );
    }
    return lines.join('\n');
}
