// Test del importador de apartamentos desde URL (workerGuideApartmentLink.js).
// Ejecutar:  npm run test:apartment-link
//
// Mismo patrón que tests/import.test.mjs: mockea globalThis.fetch (guardado
// y restaurado alrededor de cada bloque) y un env.DB mínimo al estilo de
// tests/auth.test.mjs. No se testea contra la red real ni contra la Places
// API/Geocoding API de verdad.

import { loadWorkerModule } from './_load.mjs';

const { module: link, cleanup } = await loadWorkerModule('workerGuideApartmentLink.js');
const {
    resolveApartmentDraft,
    isSafeExternalUrl,
    handleGuideApartmentLinkRequests,
} = link;

// --- Utilidades -------------------------------------------------------------

const originalFetch = globalThis.fetch;
function mockFetch(handler) { globalThis.fetch = handler; }
function restoreFetch() { globalThis.fetch = originalFetch; }

/** Firma un JWT HS256 igual que generateJWT() en workerAuthentication.js (no
 * exportado), para poder probar el guardarraíl de auth con un token real. */
async function signTestJWT(payload, secret) {
    const b64url = (data) => {
        const base64 = typeof data === 'string'
            ? btoa(data)
            : btoa(String.fromCharCode(...new Uint8Array(data)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }));
    const signingInput = `${header}.${body}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    return `${signingInput}.${b64url(sigBuffer)}`;
}

function htmlResponse(html, extraHeaders = {}) {
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...extraHeaders } });
}

function makeDbEnv({ zones = [], apartments = [], staffAgencyIds = null } = {}) {
    return {
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                // D1 real permite llamar a .all()/.first() directamente sobre el
                // prepare() cuando no hay parámetros (previewApartmentFromUrl lo
                // hace así para la consulta de zonas) — el mock expone los mismos
                // métodos con y sin pasar por .bind() para cubrir los dos casos.
                const exec = () => ({
                    async all() {
                        if (s.includes('FROM guide_zones')) return { results: zones };
                        if (s.includes('FROM guide_apartments')) return { results: apartments };
                        if (s.includes('FROM guide_agency_staff')) {
                            return { results: (staffAgencyIds || []).map(id => ({ agency_id: id })) };
                        }
                        return { results: [] };
                    },
                    async first() { return null; },
                });
                return { bind: (..._args) => exec(), ...exec() };
            },
        },
    };
}

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

// -----------------------------------------------------------------------------

console.log('\n--- resolveApartmentDraft: vía 1, JSON-LD VacationRental completo ---');
{
    const html = `<!doctype html><html><head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "VacationRental",
            "identifier": "abc-123",
            "name": "Amplio piso para 4 en el centro",
            "description": "Piso reformado a 2 min de la playa.",
            "additionalType": "Apartment",
            "checkinTime": "15:00",
            "checkoutTime": "11:00",
            "address": { "@type": "PostalAddress", "streetAddress": "Calle Mayor 12", "addressLocality": "Arroyo de la Miel", "addressCountry": "ES" },
            "latitude": 36.59781,
            "longitude": -4.54923,
            "image": ["https://example.com/1.jpg", "https://example.com/2.jpg"],
            "amenityFeature": [{ "@type": "LocationFeatureSpecification", "name": "WiFi" }, { "@type": "LocationFeatureSpecification", "name": "Piscina" }],
            "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.9, "ratingCount": "12" },
            "containsPlace": {
                "@type": "Accommodation",
                "occupancy": { "@type": "QuantitativeValue", "value": 4 },
                "numberOfBedrooms": 2,
                "numberOfBathroomsTotal": 1,
                "floorSize": { "@type": "QuantitativeValue", "value": 65 },
                "bed": [
                    { "@type": "BedDetails", "typeOfBed": "Double", "numberOfBeds": 1 },
                    { "@type": "BedDetails", "typeOfBed": "Single", "numberOfBeds": 2 }
                ]
            }
        }
        </script>
        <meta property="og:title" content="Debería ignorarse: gana JSON-LD">
    </head><body>hola</body></html>`;

    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://mi-alojamiento.example.com/piso-centro');
    restoreFetch();

    assert('Resuelve OK', draft.ok === true, JSON.stringify(draft));
    assert('source_kind es jsonld', draft.source_kind === 'jsonld');
    assert('matched_type es VacationRental', draft.matched_type === 'VacationRental');
    assert('Nombre viene del JSON-LD, no de OpenGraph', draft.fields.name.value === 'Amplio piso para 4 en el centro' && draft.fields.name.source === 'jsonld');
    assert('Dirección compuesta desde PostalAddress', draft.fields.address.value === 'Calle Mayor 12, Arroyo de la Miel, ES');
    assert('Lat/lng leídas del nodo principal', draft.fields.latitude.value === 36.59781 && draft.fields.longitude.value === -4.54923);
    assert('Capacidad desde containsPlace.occupancy.value', draft.fields.capacity.value === 4);
    assert('Dormitorios/baños/m² desde containsPlace', draft.fields.bedrooms.value === 2 && draft.fields.bathrooms.value === 1 && draft.fields.size_m2.value === 65);
    assert('Check-in/out', draft.fields.checkin_time.value === '15:00' && draft.fields.checkout_time.value === '11:00');
    assert('Amenities como array de strings', Array.isArray(draft.fields.amenities.value) && draft.fields.amenities.value.includes('Piscina'));
    assert('Identifier del estándar (schema.org, no ad-hoc)', draft.fields.identifier.value === 'abc-123');
    assert('aggregateRating: value + count (ratingCount como string se coacciona a número)', draft.fields.rating_value.value === 4.9 && draft.fields.rating_count.value === 12);
    assert('containsPlace.bed como array de BedDetails: se suman los numberOfBeds', draft.fields.beds.value === 3);
    assert('2 imágenes extraídas del JSON-LD', draft.images.length === 2 && draft.images[0] === 'https://example.com/1.jpg');
    assert('source_payload incluye el nodo JSON-LD crudo', Array.isArray(draft.source_payload.jsonld) && draft.source_payload.jsonld.length === 1);
}

console.log('\n--- resolveApartmentDraft: vía 1, JSON-LD mínimo de Airbnb + pistas del og:title (caso real) ---');
{
    // Caso real (2026-08-19): Airbnb SÍ publica VacationRental genuino, pero
    // mínimo — sin numberOfBedrooms/numberOfBathroomsTotal/additionalType.
    // Esos datos están, pero solo en el og:title ("Tipo · Ciudad · ★rating ·
    // N dormitorios · N camas · N baños"). Verificado contra un listing real
    // antes de escribir el parser de pistas.
    const html = `<!doctype html><html><head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "VacationRental",
            "identifier": "RGVtYW5kU3RheUxpc3Rpbmc6NTQ4MjcxOTgyNjYyNjA4NTc5",
            "name": "Lujoso Atico duplex en el centro de Benalmadena.",
            "description": "Lujoso apartamento tipo Atico Duplex de 162 metros ubicado en el centro de Benalmadena, con parking privado.",
            "image": ["https://a0.muscache.com/im/pictures/1.jpeg"],
            "containsPlace": { "@type": "Accommodation", "occupancy": { "@type": "QuantitativeValue", "value": 4 } },
            "latitude": 36.60088,
            "longitude": -4.53177,
            "address": { "addressLocality": "Benalmádena" },
            "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.78, "ratingCount": "68" }
        }
        </script>
        <meta property="og:title" content="Apartamento · Benalmádena · ★4,78 · 3 dormitorios · 4 camas · 2,5 baños">
    </head><body></body></html>`;
    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://www.airbnb.es/rooms/548271982662608579');
    restoreFetch();

    assert('Resuelve OK', draft.ok === true, JSON.stringify(draft));
    if (draft.ok) {
        assert('Nombre y capacidad siguen viniendo del JSON-LD (no se pisan)', draft.fields.name.source === 'jsonld' && draft.fields.capacity.value === 4 && draft.fields.capacity.source === 'jsonld');
        assert('Dormitorios rellenados desde el og:title', draft.fields.bedrooms.value === 3 && draft.fields.bedrooms.source === 'opengraph');
        assert('Baños con decimal (coma→punto) desde el og:title', draft.fields.bathrooms.value === 2.5 && draft.fields.bathrooms.source === 'opengraph');
        assert('Camas rellenadas desde el og:title (containsPlace.bed no viene en el JSON-LD real de Airbnb)', draft.fields.beds.value === 4 && draft.fields.beds.source === 'opengraph');
        assert('Tipo de propiedad (primer segmento) desde el og:title', draft.fields.property_type.value === 'Apartamento' && draft.fields.property_type.source === 'opengraph');
        assert('m² y check-in/out siguen vacíos: Airbnb no los publica en ningún metadato', draft.fields.size_m2.value === null && draft.fields.checkin_time.value === null);
        assert('Identifier y rating desde el JSON-LD (sí los trae Airbnb)', draft.fields.identifier.value === 'RGVtYW5kU3RheUxpc3Rpbmc6NTQ4MjcxOTgyNjYyNjA4NTc5' && draft.fields.rating_value.value === 4.78 && draft.fields.rating_count.value === 68);
    }
}
{
    // Un JSON-LD que SÍ trae dormitorios/baños no debe pisarse con las
    // pistas del og:title, aunque el título también las mencione distintas.
    const html = `<!doctype html><html><head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "VacationRental",
            "name": "Piso con datos completos",
            "numberOfBedrooms": 5,
            "numberOfBathroomsTotal": 3
        }
        </script>
        <meta property="og:title" content="Apartamento · Ciudad · ★4,9 · 2 dormitorios · 3 camas · 1 baño">
    </head><body></body></html>`;
    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://otra-web.example.com/piso-completo');
    restoreFetch();
    assert('JSON-LD completo gana: no se pisa con las pistas del título', draft.ok === true && draft.fields.bedrooms.value === 5 && draft.fields.bathrooms.value === 3, JSON.stringify(draft.fields));
}

console.log('\n--- resolveApartmentDraft: muro de bots (Booking.com, AWS WAF) ---');
{
    // Caso real (2026-08-19): Booking.com devuelve un 202 con exactamente
    // este marcador en vez de la ficha — un desafío JS de AWS WAF, sin
    // JSON-LD ni OpenGraph. No se intenta resolver el desafío (sería evadir
    // una protección anti-bot); se detecta y se explica, en vez de fallar
    // con el "no_data_found" genérico que confundiría al admin.
    const html = `<!doctype html><html><head><title></title>
        <script>window.awsWafCookieDomainList = ['booking.com'];</script>
    </head><body><div id="challenge-container"></div></body></html>`;
    mockFetch(async () => new Response(html, { status: 202, headers: { 'content-type': 'text/html' } }));
    const draft = await resolveApartmentDraft({}, 'https://www.booking.com/hotel/es/ejemplo.html');
    restoreFetch();
    assert('bot_wall en vez de no_data_found', draft.ok === false && draft.reason === 'bot_wall');
}
{
    // Guardarraíl anti-falso-positivo: una ficha real con un recaptcha suelto
    // (formulario de contacto) NO debe tratarse como muro de bots completo —
    // g-recaptcha se dejó fuera de BOT_WALL_MARKERS a propósito.
    const html = `<!doctype html><html><head>
        <meta property="og:title" content="Piso con formulario de contacto">
    </head><body><div class="g-recaptcha" data-sitekey="x"></div></body></html>`;
    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://web-con-recaptcha.example.com/piso');
    restoreFetch();
    assert('Un recaptcha suelto no bloquea la extracción de una ficha real', draft.ok === true && draft.fields.name.value === 'Piso con formulario de contacto');
}

console.log('\n--- resolveApartmentDraft: vía 1, schema.org/Product sin address (caso real: motor de reservas propio) ---');
{
    // Caso real (2026-08-19): 797holidayrentals.com (el "sitio oficial" que
    // Google exige enlazar desde su ficha) marca la página con Product, no
    // con VacationRental — sin numberOfBedrooms/numberOfBathroomsTotal ni
    // `address`, solo containsPlace:{name:"Benalmádena"}. Esos datos SÍ
    // existen, pero solo dentro de una descripción en prosa libre — parsear
    // eso con regex es demasiado frágil para el valor que da (y el propio
    // texto ya se ve entero en el campo Descripción del diálogo), así que
    // deliberadamente NO se intenta.
    const html = `<!doctype html><html><head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Piso con motor de reservas propio",
            "description": "Descripción larga con dos baños y dos dormitorios mencionados en prosa.",
            "image": ["https://example.com/foto1.jpg"],
            "geo": { "@type": "GeoCoordinates", "latitude": "36.6007914", "longitude": "-4.5320566" },
            "containsPlace": { "@type": "Place", "name": "Benalmádena" }
        }
        </script>
    </head><body></body></html>`;
    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://motor-reservas.example.com/piso');
    restoreFetch();
    assert('Resuelve con matched_type Product (fallback)', draft.ok === true && draft.matched_type === 'Product', JSON.stringify(draft));
    if (draft.ok) {
        assert('Dirección rellenada desde containsPlace.name (no queda vacía)', draft.fields.address.value === 'Benalmádena');
        assert('Sin dormitorios/baños estructurados: Product no los tiene, se queda null (no se inventan)', draft.fields.bedrooms.value === null && draft.fields.bathrooms.value === null);
    }
}

console.log('\n--- resolveApartmentDraft: vía 1, solo OpenGraph (sin JSON-LD) ---');
{
    const html = `<!doctype html><html><head>
        <meta property="og:title" content="Casa Rural Los Olivos">
        <meta property="og:description" content="Casa con jardín y piscina privada.">
        <meta property="og:image" content="https://example.com/og1.jpg">
        <meta property="og:image" content="https://example.com/og2.jpg">
    </head><body></body></html>`;
    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://otra-web.example.com/casa');
    restoreFetch();

    assert('Resuelve OK con fallback a OpenGraph', draft.ok === true);
    assert('source_kind es opengraph', draft.source_kind === 'opengraph');
    assert('Nombre y fuente vienen de OpenGraph', draft.fields.name.value === 'Casa Rural Los Olivos' && draft.fields.name.source === 'opengraph');
    assert('2 imágenes og:image', draft.images.length === 2);
    assert('Sin dirección/coords: quedan a null', draft.fields.address.value === null && draft.fields.latitude.value === null);
}

console.log('\n--- resolveApartmentDraft: vía 1, página sin datos útiles ---');
{
    mockFetch(async () => htmlResponse('<html><head><title>Nada aquí</title></head><body>vacío</body></html>'));
    const draft = await resolveApartmentDraft({}, 'https://web-sin-nada.example.com/');
    restoreFetch();
    assert('no_data_found cuando no hay JSON-LD ni OpenGraph', draft.ok === false && draft.reason === 'no_data_found');
}

console.log('\n--- resolveApartmentDraft: JSON-LD roto no tumba la extracción ---');
{
    const html = `<!doctype html><html><head>
        <script type="application/ld+json">{ esto no es json valido </script>
        <meta property="og:title" content="Se recupera por OpenGraph">
    </head><body></body></html>`;
    mockFetch(async () => htmlResponse(html));
    const draft = await resolveApartmentDraft({}, 'https://web-rota.example.com/');
    restoreFetch();
    assert('Bloque JSON-LD roto se ignora, cae a OpenGraph', draft.ok === true && draft.fields.name.value === 'Se recupera por OpenGraph');
}

console.log('\n--- resolveApartmentDraft: vía 4, URL de Travel pegada directamente (sin red) ---');
{
    // El caso más probable en la práctica: el usuario copia la URL ya
    // expandida desde la barra de direcciones, no el enlace corto. Se
    // detecta por el host ANTES de intentar nada de red.
    let fetchCalled = false;
    mockFetch(async () => { fetchCalled = true; throw new Error('no debería llamar a fetch'); });
    const draft = await resolveApartmentDraft({}, 'https://www.google.com/travel/hotels/entity/ChkQvZS-ytSr6JJvGg0vZy8xMXR4cW1ia25nEAI/overview');
    restoreFetch();
    assert('google_page_unreadable sin tocar la red', draft.ok === false && draft.reason === 'google_page_unreadable' && !fetchCalled);
}

console.log('\n--- resolveApartmentDraft: vía 4, ficha de Google Travel descubierta tras redirecciones (caso del piso de ejemplo) ---');
{
    // Reproduce el caso real que motivó este módulo: share.google/Lc0h8bN8...
    // redirige a google.com/share.google?q=... y de ahí a
    // google.com/travel/hotels/entity/.../overview. La página final SÍ se
    // pide (hace falta la respuesta para saber en qué host aterrizó), pero
    // su cuerpo se descarta sin leerlo — por eso esta respuesta trae un
    // og:title con datos falsos: si el código lo usara, esta prueba fallaría.
    let hops = 0;
    mockFetch(async (url) => {
        const u = String(url);
        hops++;
        if (u.startsWith('https://share.google/')) {
            return new Response(null, { status: 302, headers: { location: 'https://www.google.com/share.google?q=Lc0h8bN8cNg9SdkH1' } });
        }
        if (u.includes('google.com/share.google?q=')) {
            return new Response(null, { status: 302, headers: { location: 'https://www.google.com/travel/hotels/entity/ChkQvZS-ytSr6JJvGg0vZy8xMXR4cW1ia25nEAI/overview?q=29630,+Benalm%C3%A1dena' } });
        }
        if (u.includes('google.com/travel/')) {
            return htmlResponse('<html><head><meta property="og:title" content="NO DEBERIA USARSE"></head></html>');
        }
        throw new Error('fetch inesperado: ' + u);
    });
    const draft = await resolveApartmentDraft({}, 'https://share.google/Lc0h8bN8cNg9SdkH1');
    restoreFetch();
    assert('No se usa el contenido de la ficha de Travel', draft.ok === false && draft.reason === 'google_page_unreadable');
    assert('3 fetch: 2 redirecciones + la comprobación final (descartada sin leer cuerpo)', hops === 3);
}

console.log('\n--- resolveApartmentDraft: vía 4, share.google → resultado de búsqueda/Knowledge Graph ---');
{
    // Caso real documentado en tests/import.test.mjs para resolvePlaceRef: un
    // share.google puede acabar en google.com/search?kgmid=... en vez de en
    // /travel/ — también debe tratarse como no legible, no como una web
    // normal.
    mockFetch(async (url) => {
        const u = String(url);
        if (u.startsWith('https://share.google/')) {
            return new Response(null, { status: 302, headers: { location: 'https://www.google.com/search?kgmid=/g/121k353j&q=Casa+de+los+Navajas&hl=es-ES' } });
        }
        if (u.includes('google.com/search?')) {
            return htmlResponse('<html></html>');
        }
        throw new Error('fetch inesperado: ' + u);
    });
    const draft = await resolveApartmentDraft({}, 'https://share.google/8VcC4yfVat9iRWNaE');
    restoreFetch();
    assert('google.com/search también se trata como no legible', draft.ok === false && draft.reason === 'google_page_unreadable');
}

console.log('\n--- resolveApartmentDraft: vía 4, aterriza en el muro de consentimiento ---');
{
    mockFetch(async (url) => {
        const u = String(url);
        if (u.startsWith('https://share.google/')) {
            return new Response(null, { status: 302, headers: { location: 'https://consent.google.com/m?continue=https://www.google.com/travel/x' } });
        }
        if (u.includes('consent.google.com')) {
            return htmlResponse('<html>cookies</html>');
        }
        throw new Error('fetch inesperado: ' + u);
    });
    const draft = await resolveApartmentDraft({}, 'https://share.google/xyz');
    restoreFetch();
    assert('consent.google.com se trata igual que cualquier otra página de Google', draft.ok === false && draft.reason === 'google_page_unreadable');
}

console.log('\n--- resolveApartmentDraft: vía 2, URL de Google Maps ---');
{
    mockFetch(async (url, opts) => {
        const u = String(url);
        if (u.includes('places/ChIJTESTPLACE')) {
            return new Response(JSON.stringify({
                id: 'ChIJTESTPLACE',
                displayName: { text: 'Apartahotel Ejemplo' },
                shortFormattedAddress: 'Calle Falsa 123',
                location: { latitude: 36.5, longitude: -4.5 },
                editorialSummary: { text: 'Sinopsis de Google' },
                googleMapsUri: 'https://maps.google.com/?cid=123',
                rating: 4.6,
                userRatingCount: 25,
            }), { status: 200 });
        }
        throw new Error('fetch inesperado: ' + u + ' ' + JSON.stringify(opts));
    });
    const draft = await resolveApartmentDraft({ GOOGLE_PLACES_API_KEY: 'test-key' }, 'https://www.google.com/maps/place/?q=place_id:ChIJTESTPLACE');
    restoreFetch();
    assert('Resuelve por Places', draft.ok === true && draft.source_kind === 'places', JSON.stringify(draft));
    if (draft.ok) {
        assert('Sin fotos en la vía de Maps (fallback deliberadamente sin foto)', draft.images.length === 0);
        assert('Nombre y dirección desde Place Details', draft.fields.name.value === 'Apartahotel Ejemplo' && draft.fields.address.value === 'Calle Falsa 123');
        assert('Rating de Google viene gratis en la misma llamada (ya estaba en el field mask)', draft.fields.rating_value.value === 4.6 && draft.fields.rating_count.value === 25);
    }
}

console.log('\n--- resolveApartmentDraft: vía 2, sin GOOGLE_PLACES_API_KEY ---');
{
    let fetchCalled = false;
    mockFetch(async () => { fetchCalled = true; throw new Error('no debería llamar a fetch'); });
    const draft = await resolveApartmentDraft({}, 'https://maps.app.goo.gl/abc123');
    restoreFetch();
    assert('not_configured sin key, sin tocar la red', draft.ok === false && draft.reason === 'not_configured' && !fetchCalled);
}

console.log('\n--- resolveApartmentDraft: vía 3, dirección en texto plano ---');
{
    mockFetch(async (url) => {
        const u = String(url);
        if (u.includes('maps.googleapis.com/maps/api/geocode/json')) {
            return new Response(JSON.stringify({
                status: 'OK',
                results: [{ formatted_address: 'Calle Mayor 12, 29630 Benalmádena, España', geometry: { location: { lat: 36.5978, lng: -4.5492 } } }],
            }), { status: 200 });
        }
        throw new Error('fetch inesperado: ' + u);
    });
    const draft = await resolveApartmentDraft({ GOOGLE_PLACES_API_KEY: 'test-key' }, 'Calle Mayor 12, Benalmádena');
    restoreFetch();
    assert('Resuelve por geocodificación (no es una URL)', draft.ok === true && draft.source_kind === 'geocode');
    assert('Sin nombre (una dirección no trae nombre de piso)', draft.fields.name.value === null);
    assert('Coordenadas del geocoder', draft.fields.latitude.value === 36.5978 && draft.fields.longitude.value === -4.5492);
}

console.log('\n--- resolveApartmentDraft: guardarraíles de red ---');
{
    let fetchCalled = false;
    mockFetch(async () => { fetchCalled = true; return htmlResponse('<html></html>'); });
    const draft = await resolveApartmentDraft({}, 'http://localhost:8787/admin');
    restoreFetch();
    assert('Host bloqueado (localhost) → blocked_host, sin llegar a fetch', draft.ok === false && draft.reason === 'blocked_host' && !fetchCalled);
}
{
    let fetchCalled = false;
    mockFetch(async () => { fetchCalled = true; return htmlResponse('<html></html>'); });
    const draft = await resolveApartmentDraft({}, 'http://192.168.1.50/piso');
    restoreFetch();
    assert('IP privada (192.168.x.x) bloqueada', draft.ok === false && draft.reason === 'blocked_host' && !fetchCalled);
}
{
    assert('isSafeExternalUrl: https público permitido', isSafeExternalUrl(new URL('https://ejemplo.com/piso')) === true);
    assert('isSafeExternalUrl: 127.0.0.1 bloqueado', isSafeExternalUrl(new URL('http://127.0.0.1/x')) === false);
    assert('isSafeExternalUrl: 172.16-172.31 (rango privado) bloqueado', isSafeExternalUrl(new URL('http://172.20.0.5/x')) === false);
    assert('isSafeExternalUrl: 172.15/172.32 (fuera del rango privado) permitido', isSafeExternalUrl(new URL('http://172.32.0.5/x')) === true);
    assert('isSafeExternalUrl: ftp:// rechazado (solo http/https)', isSafeExternalUrl(new URL('ftp://ejemplo.com/x')) === false);
}
{
    let hops = 0;
    mockFetch(async () => {
        hops++;
        return new Response(null, { status: 302, headers: { location: 'https://redirige-en-bucle.example.com/' } });
    });
    const draft = await resolveApartmentDraft({}, 'https://redirige-en-bucle.example.com/');
    restoreFetch();
    assert('too_many_redirects corta el bucle en vez de colgarse', draft.ok === false && draft.reason === 'too_many_redirects');
    assert('Como mucho MAX_REDIRECTS+1 saltos de red', hops <= 6, `hops=${hops}`);
}

console.log('\n--- resolveApartmentDraft: entrada vacía ---');
{
    const draft = await resolveApartmentDraft({}, '   ');
    assert('empty_input sin tocar nada', draft.ok === false && draft.reason === 'empty_input');
}

console.log('\n--- handleGuideApartmentLinkRequests: guardarraíles HTTP ---');
{
    const JWT_SECRET = 'secreto-de-prueba-apartment-link-no-usado-en-ningun-sitio-real';
    const env = { JWT_SECRET, ...makeDbEnv({ staffAgencyIds: ['agency_1'] }) };

    function req(path, token, bodyObj) {
        return new Request(`https://api.visualtastes.com${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(bodyObj ?? { agency_id: 'agency_1', url: 'https://example.com/piso' }),
        });
    }

    const otherRouteRes = await handleGuideApartmentLinkRequests(new Request('https://api.visualtastes.com/guide/admin/pois', { method: 'GET' }), env);
    assert('Rutas fuera de /guide/admin/import/apartments/from-url → null inmediato', otherRouteRes === null);

    const wrongMethodRes = await handleGuideApartmentLinkRequests(new Request('https://api.visualtastes.com/guide/admin/import/apartments/from-url', { method: 'GET' }), env);
    assert('GET en la ruta correcta → null (solo POST)', wrongMethodRes === null);

    const noAuthRes = await handleGuideApartmentLinkRequests(req('/guide/admin/import/apartments/from-url', null), env);
    assert('Sin cabecera Authorization → 401', noAuthRes?.status === 401);

    const badTokenRes = await handleGuideApartmentLinkRequests(req('/guide/admin/import/apartments/from-url', 'esto-no-es-un-jwt'), env);
    assert('Token con formato inválido → 401', badTokenRes?.status === 401);

    const noAgencyToken = await signTestJWT({ userId: 'u1', is_superadmin: false }, JWT_SECRET);
    const noAgencyRes = await handleGuideApartmentLinkRequests(req('/guide/admin/import/apartments/from-url', noAgencyToken, { url: 'https://example.com/x' }), env);
    assert('Sin agency_id en el body → 400 (agency_id is required)', noAgencyRes?.status === 400);

    const otherAgencyToken = await signTestJWT({ userId: 'u1', is_superadmin: false }, JWT_SECRET);
    const forbiddenRes = await handleGuideApartmentLinkRequests(req('/guide/admin/import/apartments/from-url', otherAgencyToken, { agency_id: 'agency_OTRA', url: 'https://example.com/x' }), env);
    assert('Staff de una agencia distinta a la del body → 403', forbiddenRes?.status === 403);

    mockFetch(async () => htmlResponse('<html><head><meta property="og:title" content="Piso Test"></head></html>'));
    const staffToken = await signTestJWT({ userId: 'u1', is_superadmin: false }, JWT_SECRET);
    const okRes = await handleGuideApartmentLinkRequests(req('/guide/admin/import/apartments/from-url', staffToken), env);
    restoreFetch();
    assert('Staff de SU PROPIA agencia (no superadmin) → 200, no un 403', okRes?.status === 200);
    const okBody = await okRes.json();
    assert('Cuerpo resuelto con éxito', okBody.success === true && okBody.resolved === true);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
