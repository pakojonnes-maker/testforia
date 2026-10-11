// Prueba de public/_worker.js (el reparto de «/» por host). Node puro, sin framework: npm run test:worker -w apps/client
//
// Ejecuta el worker con un env.ASSETS falso que devuelve, como cuerpo, la ruta del asset que le han pedido, y que
// simula lo peor que puede hacer _headers: pone noindex a todo lo que viene de /central/. Así se ve qué asset elige
// el worker y que el X-Robots-Tag final lo decide él.
import assert from 'node:assert/strict';
import worker from '../public/_worker.js';

const asked = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const { pathname } = new URL(request.url);
      asked.push(pathname);
      const headers = { 'Cache-Control': 'public, max-age=0, must-revalidate' };
      if (pathname.startsWith('/central/')) headers['X-Robots-Tag'] = 'noindex';
      return new Response(pathname, { headers });
    },
  },
};

let failed = 0;
async function check(name, url, expected, init) {
  asked.length = 0;
  const res = await worker.fetch(new Request(url, init), env);
  try {
    assert.equal(asked[0], expected.asset, 'asset pedido');
    assert.equal(res.headers.get('X-Robots-Tag'), expected.robots, 'X-Robots-Tag');
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate', 'Cache-Control conservado');
    assert.equal(res.status, 200, 'status');
    console.log(`ok   ${name}  ->  ${expected.asset}  robots=${expected.robots}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}: ${err.message}\n     asset=${asked[0]} robots=${res.headers.get('X-Robots-Tag')}`);
  }
}

await check('apex /', 'https://visualtastes.com/', { asset: '/central/', robots: null });
await check('www /', 'https://www.visualtastes.com/', { asset: '/central/', robots: 'noindex' });
await check('menu /', 'https://menu.visualtastes.com/', { asset: '/', robots: null });
await check('pages.dev /', 'https://visualtaste.pages.dev/', { asset: '/central/', robots: 'noindex' });
await check('pages.dev (vista previa) /', 'https://abc123.visualtaste.pages.dev/', { asset: '/central/', robots: 'noindex' });
await check('pages.dev /?sitio=menu', 'https://visualtaste.pages.dev/?sitio=menu', { asset: '/', robots: 'noindex' });
await check('localhost /?sitio=menu', 'http://localhost:8788/?sitio=menu', { asset: '/', robots: 'noindex' });
await check('apex /?sitio=menu (se ignora)', 'https://visualtastes.com/?sitio=menu', { asset: '/central/', robots: null });
await check('www /?sitio=menu (se ignora)', 'https://www.visualtastes.com/?sitio=menu', { asset: '/central/', robots: 'noindex' });
await check('menu /sitemap.xml', 'https://menu.visualtastes.com/sitemap.xml', { asset: '/sitemap-menu.xml', robots: null });
await check('apex /sitemap.xml', 'https://visualtastes.com/sitemap.xml', { asset: '/sitemap.xml', robots: null });
await check('menu /robots.txt', 'https://menu.visualtastes.com/robots.txt', { asset: '/robots-menu.txt', robots: null });
await check('apex /robots.txt', 'https://visualtastes.com/robots.txt', { asset: '/robots.txt', robots: null });
await check('pages.dev /robots.txt?sitio=menu', 'https://visualtaste.pages.dev/robots.txt?sitio=menu', { asset: '/robots-menu.txt', robots: null });
await check('apex HEAD /', 'https://visualtastes.com/', { asset: '/central/', robots: null }, { method: 'HEAD' });

// El método que no es de lectura pasa tal cual, sin reescribir.
asked.length = 0;
await worker.fetch(new Request('https://visualtastes.com/', { method: 'POST', body: 'x' }), env);
if (asked[0] === '/') console.log('ok   apex POST /  ->  /  (sin reescribir)');
else { failed++; console.log(`FAIL apex POST /: asset=${asked[0]}`); }

if (failed) {
  console.log(`\n${failed} caso(s) con error`);
  process.exit(1);
}
console.log('\ntodos los casos en verde');
