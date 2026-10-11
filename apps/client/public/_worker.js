// _worker.js de Cloudflare Pages (modo avanzado) del proyecto «visualtaste».
//
// Un solo despliegue (apps/client/dist) sirve tres hosts con lo que antes era el mismo «/»:
//   - visualtastes.com y www.        «/» = landing central de ventas del producto vacacional (central/index.html)
//   - menu.visualtastes.com          «/» = landing de la carta digital para restaurantes (la SPA, HomePage)
// Pages no sabe reescribir por host con _redirects, y decidirlo en el navegador dejaría a los buscadores sin el HTML
// correcto, así que lo decide este worker. Solo se invoca en las rutas de _routes.json («/», /sitemap.xml y
// /robots.txt): la carta (/<slug>), la landing de cada restaurante y los assets NO pasan por aquí.
//
// Lo que NO hace: redirigir (la URL sigue siendo «/»), tocar la API ni cachear de más. Conserva método, cabeceras y
// Cache-Control del asset que sirve. Prueba: npm run test:worker -w apps/client.

/** Host «de carta»: menu.visualtastes.com. */
function isMenuHost(hostname) {
  return hostname.startsWith('menu.');
}

/** Hosts donde se puede forzar el modo carta con ?sitio=menu (despliegues de vista previa y desarrollo). En producción se ignora. */
function isPreviewHost(hostname) {
  return hostname.endsWith('.pages.dev') || hostname === 'localhost' || hostname === '127.0.0.1';
}

function isMenuSite(url) {
  if (isMenuHost(url.hostname)) return true;
  return isPreviewHost(url.hostname) && url.searchParams.get('sitio') === 'menu';
}

/** Los únicos hosts cuya portada se indexa. www., *.pages.dev y compañía llevan noindex. */
const INDEXABLE_HOSTS = new Set(['visualtastes.com', 'menu.visualtastes.com']);

/** Pide un asset a Pages con la misma petición (método, cabeceras) pero otra ruta. Sigue hasta 2 redirecciones internas. */
async function fetchAsset(env, request, url, path) {
  let target = new URL(path, url);
  let res = await env.ASSETS.fetch(new Request(target, request));
  for (let hops = 0; hops < 2 && res.status >= 300 && res.status < 400 && res.headers.get('Location'); hops++) {
    target = new URL(res.headers.get('Location'), target);
    res = await env.ASSETS.fetch(new Request(target, request));
  }
  return res;
}

/** El X-Robots-Tag de «/» lo decide este worker, no _headers: no queremos heredar el noindex de /central/*. */
function withRobots(res, hostname) {
  const out = new Response(res.body, res);
  if (INDEXABLE_HOSTS.has(hostname)) out.headers.delete('X-Robots-Tag');
  else out.headers.set('X-Robots-Tag', 'noindex');
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const menu = isMenuSite(url);
    const readOnly = request.method === 'GET' || request.method === 'HEAD';

    if (!readOnly) return env.ASSETS.fetch(request);

    if (url.pathname === '/') {
      // Carta: el index.html de la SPA (que pinta HomePage). Resto: la landing central, sin redirigir.
      const res = menu ? await env.ASSETS.fetch(request) : await fetchAsset(env, request, url, '/central/');
      return withRobots(res, url.hostname);
    }

    // Los ficheros para rastreadores no llevan noindex (el de menu.* de _headers no debe colarse en ellos).
    const crawlerFile = menu && (url.pathname === '/sitemap.xml' ? '/sitemap-menu.xml' : url.pathname === '/robots.txt' ? '/robots-menu.txt' : null);
    if (crawlerFile) {
      const asset = await fetchAsset(env, request, url, crawlerFile);
      const res = new Response(asset.body, asset);
      res.headers.delete('X-Robots-Tag');
      return res;
    }

    return env.ASSETS.fetch(request);
  },
};
