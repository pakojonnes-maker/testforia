// GENERADO a partir del diseño de la landing (Design artifact «guide.visualtastes.com — rediseño»).
//
// HTML ESTÁTICO de las cinco pestañas del móvil de la demo del héroe. Es contenido de maqueta escrito por
// nosotros (datos ficticios de «Casa Azahar»), nunca datos de usuario: por eso PhoneDemo lo inyecta con
// dangerouslySetInnerHTML. Los marcadores @@foto@@ se sustituyen en PhoneDemo por las URL reales (con hash)
// de las fotos importadas en images.ts.
//
// Si hay que cambiar el contenido de la maqueta, se edita aquí o se vuelve a generar desde el diseño.

export const SCREENS = {
  casa: `<div class="g-top"><div class="g-mark"><span class="g-logo" aria-hidden="true">A</span><span class="g-agency">Azahar Stays</span></div><button type="button" class="g-lang" aria-label="Español">Español</button></div>
<figure class="g-arch"><img src="@@stay@@" alt="Una ventana con vistas al mar, un libro de la casa y una llave sobre la mesa" style="object-position:8.6% 50.0%"></figure>
<div class="g-name"><h1 class="g-h1">Casa Azahar</h1><p class="g-addr">Calle Jazmín 12, Fuengirola</p><button type="button" class="g-link">Ver dirección</button></div>
<div class="g-bento">
<div class="g-t g-wifi"><h2 class="g-tt">WiFi</h2><div class="g-cred"><span class="g-k">Red</span><b dir="ltr">CasaAzahar_5G</b></div><div class="g-cred"><span class="g-k">Contraseña</span><b dir="ltr">SolyMar2026</b></div><button type="button" class="g-pill light">Copiar</button></div>
<div class="g-t g-code"><span class="g-k">Código de entrada</span><span class="g-digits" dir="ltr">4821</span><button type="button" class="g-pill ghost">Copiar</button></div>
<div class="g-t g-stay"><img src="@@stay@@" alt="" style="object-position:100.0% 50.0%"><span class="g-veil"></span><div class="g-stay-in"><div><b>16:00</b><span>Entrada</span></div><div><b>11:00</b><span>Salida</span></div></div></div>
<button type="button" class="g-row"><h3 class="g-h3">Teléfonos</h3><span>Anfitrión · Emergencias</span></button>
</div>
<section class="g-sec"><h2 class="g-h2">Guías rápidas</h2>
<div class="g-guides">
<button type="button" class="g-gt"><img src="@@info@@" alt="Un libro con las normas de la casa sobre una consola de madera" style="object-position:21.1% 50.0%;transform:scale(1.5);transform-origin:50.0% 100.0%"><span class="g-veil"></span><span class="g-gtt">Normas de la casa</span></button>
<button type="button" class="g-gt brand"><span class="g-n" aria-hidden="true">02</span><span class="g-gtt">Aire acondicionado</span></button>
<button type="button" class="g-gt arena"><span class="g-n" aria-hidden="true">03</span><span class="g-gtt">Basura y reciclaje</span></button>
<button type="button" class="g-gt"><img src="@@wifi@@" alt="Un router sobre una mesa de madera, junto a una pared encalada" style="object-position:50.0% 50.0%;transform:scale(2.4);transform-origin:15.7% 50.0%"><span class="g-veil"></span><span class="g-gtt">Router y televisión</span></button>
<button type="button" class="g-gt sea"><span class="g-n" aria-hidden="true">05</span><span class="g-gtt">Aparcamiento</span></button>
<button type="button" class="g-gt paper"><span class="g-n" aria-hidden="true">06</span><span class="g-gtt">Lavadora y secadora</span></button>
</div></section>
<section class="g-sec" style="margin-bottom:0"><h2 class="g-h2" style="margin-bottom:0">Descubre Fuengirola</h2></section>
<div class="g-rail">
<article class="g-rc"><div class="g-fig"><img src="@@eat@@" alt="Un plato de gambas al ajillo con limón" style="object-position:59.5% 50.0%;transform:scale(1.1);transform-origin:50.0% 100.0%"></div><h3 class="g-h3">La Mar Salada</h3><p class="g-meta">Cocina andaluza</p></article>
<article class="g-rc"><div class="g-fig"><img src="@@do@@" alt="Una cala de aguas turquesa con dos tumbonas" style="object-position:80.3% 50.0%;transform:scale(1.05);transform-origin:50.0% 100.0%"></div><h3 class="g-h3">Cala Honda</h3><p class="g-meta">Playa · a 12 min</p></article>
<article class="g-rc"><div class="g-fig"><img src="@@store@@" alt="Una botella de aceite de oliva sobre una mesa de madera" style="object-position:70.9% 50.0%"></div><h3 class="g-h3">Aceite de oliva virgen</h3><p class="g-meta">Tienda · 14 €</p></article>
</div>
<div class="g-promo"><img src="@@store@@" alt="" style="object-position:100.0% 50.0%"><span class="g-veil"></span><div class="g-promo-in"><h2 class="g-h2">Tienda</h2><p>Productos y experiencias seleccionados para tu estancia.</p></div><button type="button" class="g-pill light">Ver tienda</button></div>
<footer class="g-foot"><svg width="100%" height="36" aria-hidden="true"><defs><pattern id="hazg" width="36" height="36" patternUnits="userSpaceOnUse"><g transform="scale(0.6429)"><rect width="56" height="56" fill="#F8F3E9"></rect><rect x="1" y="1" width="54" height="54" fill="none" stroke="#128099" stroke-width="1.2"></rect><path d="M28 6 C31 17 39 25 50 28 C39 31 31 39 28 50 C25 39 17 31 6 28 C17 25 25 17 28 6 Z" fill="#128099"></path><circle cx="28" cy="28" r="5" fill="#F0B04B"></circle><circle cx="0" cy="0" r="7" fill="#B04E2B"></circle><circle cx="56" cy="0" r="7" fill="#B04E2B"></circle><circle cx="0" cy="56" r="7" fill="#B04E2B"></circle><circle cx="56" cy="56" r="7" fill="#B04E2B"></circle></g></pattern></defs><rect width="100%" height="36" fill="url(#hazg)"></rect></svg><div class="g-foot-in"><a href="#legal">Privacidad y aviso legal</a><span>Guía creada con VisualTaste</span></div></footer>`,
  lugares: `<div class="g-map"><svg class="g-mapbg" viewBox="0 0 390 780" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<rect width="390" height="780" fill="#EFE6D2"></rect>
<path d="M0 0 H390 V168 C350 176 300 206 230 206 C150 214 80 258 0 262 Z" fill="#CBE6E2"></path>
<path d="M28 96 C66 88 108 88 146 96" fill="none" stroke="#B7DAD7" stroke-width="2" stroke-linecap="round"></path>
<path d="M210 62 C248 54 290 54 328 62" fill="none" stroke="#B7DAD7" stroke-width="2" stroke-linecap="round"></path>
<path d="M230 150 C262 143 298 143 330 150" fill="none" stroke="#B7DAD7" stroke-width="2" stroke-linecap="round"></path>
<path d="M0 262 C80 258 150 214 230 206 C300 206 350 176 390 168" fill="none" stroke="#EADFC2" stroke-width="18" stroke-linecap="round"></path>
<rect x="288" y="150" width="46" height="9" rx="4.5" fill="#E4D8BC"></rect>
<path d="M270 330 C300 318 350 322 372 346 C384 366 370 392 340 398 C304 404 274 384 266 360 C262 346 262 336 270 330 Z" fill="#DCE3C4"></path>
<path d="M-10 470 C40 452 90 470 130 462 L130 520 L-10 520 Z" fill="#DCE3C4"></path>
<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#DACDB0" stroke-width="10"><path d="M-10 300 C80 296 150 254 230 244 S350 214 400 204"></path><path d="M52 298 L78 480"></path><path d="M122 276 L150 480"></path><path d="M196 248 L236 480"></path><path d="M272 232 L338 480"></path><path d="M-10 388 C120 378 260 400 400 366"></path><path d="M-10 452 L400 432"></path><path d="M-10 340 L110 302"></path></g><g stroke="#FFFDF8" stroke-width="7"><path d="M-10 300 C80 296 150 254 230 244 S350 214 400 204"></path><path d="M52 298 L78 480"></path><path d="M122 276 L150 480"></path><path d="M196 248 L236 480"></path><path d="M272 232 L338 480"></path><path d="M-10 388 C120 378 260 400 400 366"></path><path d="M-10 452 L400 432"></path><path d="M-10 340 L110 302"></path></g></g>
<text x="56" y="188" font-family="Playfair Display Variable,Playfair Display,Georgia,serif" font-style="italic" font-size="14" letter-spacing="1.5" fill="#5C9AA1">Mar Mediterráneo</text>
<text x="152" y="322" font-family="Montserrat Variable,Montserrat,sans-serif" font-weight="600" font-size="9.5" letter-spacing="1.6" fill="#7B8C90">PASEO MARÍTIMO</text>
<text x="292" y="440" font-family="Montserrat Variable,Montserrat,sans-serif" font-weight="600" font-size="9.5" letter-spacing="1.6" fill="#7B8C90">LOS BOLICHES</text>
</svg>
<span class="g-pin " style="left:82px;top:352px">1</span><span class="g-pin " style="left:150px;top:424px">2</span><span class="g-pin " style="left:296px;top:268px">4</span><span class="g-pin " style="left:338px;top:402px">5</span><span class="g-pin " style="left:124px;top:330px">7</span><span class="g-pin paid" style="left:254px;top:410px">25 €</span>
<svg class="g-home" viewBox="0 0 26 32" aria-hidden="true" style="left:182px;top:372px"><path d="M1 31 V13 A12 12 0 0 1 25 13 V31 Z" fill="#0C2A37"></path><circle cx="13" cy="17" r="4.2" fill="#F0B04B"></circle></svg>
<span class="g-pin sel" style="left:206px;top:296px">3</span><span class="g-pinlbl" style="left:206px;top:262px">Cala Honda<small>12 min a pie</small></span>
</div>
<div class="g-mtop"><div class="g-search"><span>Busca un lugar o una ciudad</span><button type="button" class="g-pill">Filtros</button></div>
<div class="g-chips"><button type="button" class="g-chip on">Todo</button><button type="button" class="g-chip">Playas</button><button type="button" class="g-chip">Cultura</button><button type="button" class="g-chip">Gastronomía</button><button type="button" class="g-chip">Bienestar</button></div></div>
<div class="g-sheet"><div class="g-handle"></div>
<div class="g-sheet-h"><h2 class="g-h2">Lugares en Fuengirola</h2><span class="g-meta">24 lugares</span></div>
<article class="g-poi"><div class="g-ph"><img src="@@do@@" alt="Una cala con tumbonas al atardecer" style="object-position:90.7% 0.0%;transform:scale(1.7);transform-origin:50.0% 100.0%"></div><div><h3 class="g-h3">Cala Honda</h3><p class="g-meta">Playa</p><p class="g-meta">a 12 min a pie de tu alojamiento</p></div></article>
<article class="g-poi"><div class="g-ph"><img src="@@do@@" alt="Acantilado sobre el mar" style="object-position:100.0% 0.0%;transform:scale(1.5);transform-origin:100.0% 0.0%"></div><div><h3 class="g-h3">Mirador del Faro</h3><p class="g-meta">Naturaleza</p><p class="g-meta">a 9 min en coche de tu alojamiento</p><span class="g-tag">Ruta guiada · 25 €</span></div></article>
</div>`,
  comer: `<div class="g-titlebar"><h1 class="g-h1">Dónde comer</h1><button type="button" class="g-lang" aria-label="Español">Español</button></div>
<p class="g-p" style="margin:8px 20px 0">Restaurantes en Fuengirola</p>
<div class="g-cards" style="margin-top:24px">
<article class="g-card">
<figure class="g-arch"><img src="@@eat@@" alt="Gambas al ajillo con limón frente a un arco de piedra y el mar" style="object-position:70.5% 50.0%"></figure>
<div class="g-card-body"><span class="g-eyebrow">Cocina andaluza</span><h2 class="g-h2">La Mar Salada</h2><p class="g-meta">Fuengirola</p>
<div class="g-btns"><button type="button" class="g-pill fill">Ver la carta</button></div></div></article>
<article class="g-card">
<figure class="g-arch"><img src="@@eat@@" alt="Un arco de piedra con buganvilla frente al mar" style="object-position:0.0% 50.0%;transform:scale(1.5);transform-origin:14.4% 0.0%"></figure>
<div class="g-card-body"><span class="g-eyebrow">Cocina de mercado</span><h2 class="g-h2">Casa Olivar</h2><p class="g-meta">Fuengirola</p>
<div class="g-btns"><button type="button" class="g-pill fill">Ver la carta</button></div></div></article>
</div>
<footer class="g-foot"><svg width="100%" height="36" aria-hidden="true"><defs><pattern id="azc" width="36" height="36" patternUnits="userSpaceOnUse"><g transform="scale(0.6429)"><rect width="56" height="56" fill="#F8F3E9"></rect><rect x="1" y="1" width="54" height="54" fill="none" stroke="#128099" stroke-width="1.2"></rect><path d="M28 6 C31 17 39 25 50 28 C39 31 31 39 28 50 C25 39 17 31 6 28 C17 25 25 17 28 6 Z" fill="#128099"></path><circle cx="28" cy="28" r="5" fill="#F0B04B"></circle><circle cx="0" cy="0" r="7" fill="#B04E2B"></circle><circle cx="56" cy="0" r="7" fill="#B04E2B"></circle><circle cx="0" cy="56" r="7" fill="#B04E2B"></circle><circle cx="56" cy="56" r="7" fill="#B04E2B"></circle></g></pattern></defs><rect width="100%" height="36" fill="url(#azc)"></rect></svg><div class="g-foot-in"><a href="#legal">Privacidad y aviso legal</a><span>Guía creada con VisualTaste</span></div></footer>`,
  tienda: `<div class="g-titlebar"><h1 class="g-h1">Tienda</h1><button type="button" class="g-lang" aria-label="Español">Español</button></div>
<p class="g-p" style="margin:8px 20px 0">Productos y experiencias seleccionados para tu estancia.</p>
<div class="g-subh"><h2 class="g-h3">Del anfitrión</h2></div>
<div class="g-prods">
<article class="g-prod"><div class="g-ph"><img src="@@store@@" alt="Un cuenco de aceitunas sobre un paño de lino" style="object-position:36.4% 50.0%;transform:scale(1.9);transform-origin:50.0% 88.0%"></div><h3 class="g-h3">Cesta de bienvenida</h3><p class="g-price">24 €</p><button type="button" class="g-pill line">Añadir</button></article>
<article class="g-prod"><div class="g-ph"><img src="@@do@@" alt="Tumbonas con toallas en la playa" style="object-position:90.7% 50.0%;transform:scale(2.1);transform-origin:50.0% 99.6%"></div><h3 class="g-h3">Toallas de playa</h3><p class="g-price">12 €</p><button type="button" class="g-pill line">Añadir</button></article>
</div>
<div class="g-subh"><h2 class="g-h3">Productos locales</h2></div>
<div class="g-prods">
<article class="g-prod"><div class="g-ph"><img src="@@store@@" alt="Una botella de aceite de oliva virgen extra" style="object-position:74.9% 50.0%;transform:scale(1.6);transform-origin:50.0% 44.7%"></div><h3 class="g-h3">Aceite de oliva virgen extra</h3><p class="g-price">14 €</p><button type="button" class="g-pill line">Añadir</button></article>
<article class="g-prod"><div class="g-ph"><img src="@@info@@" alt="Un jarrón de cerámica con ramas de eucalipto" style="object-position:63.6% 50.0%;transform:scale(1.8);transform-origin:50.0% 27.5%"></div><h3 class="g-h3">Jarrón de cerámica</h3><p class="g-price">18 €</p><button type="button" class="g-pill line">Añadir</button></article>
</div>
<div class="g-subh"><h2 class="g-h3">Experiencias</h2></div>
<div class="g-exps">
<article class="g-exp"><div class="g-ph"><img src="@@do@@" alt="Una barca en una cala al atardecer" style="object-position:50.0% 100.0%;transform:scale(1.1);transform-origin:100.0% 69.4%"></div><div class="g-exp-in"><h3 class="g-h3">Paseo en velero al atardecer</h3><p class="g-p">Dos horas por la costa, con bebida a bordo.</p><div class="g-exp-row"><b>Desde 45 €</b><button type="button" class="g-pill fill">Reservar por WhatsApp</button></div></div></article>
<article class="g-exp"><div class="g-ph"><img src="@@eat@@" alt="Gambas al ajillo en un plato de cerámica" style="object-position:50.0% 100.0%"></div><div class="g-exp-in"><span class="g-tag line" style="justify-self:start;margin-top:0">Colaboración</span><h3 class="g-h3">Clase de cocina andaluza</h3><p class="g-p">Aprende tres platos con un cocinero local.</p><div class="g-exp-row"><b>Desde 60 €</b><button type="button" class="g-pill fill">Reservar por WhatsApp</button></div></div></article>
</div>
<p class="g-fine">Algunas recomendaciones son colaboraciones comerciales de tu anfitrión.</p>
<footer class="g-foot"><svg width="100%" height="36" aria-hidden="true"><defs><pattern id="azt" width="36" height="36" patternUnits="userSpaceOnUse"><g transform="scale(0.6429)"><rect width="56" height="56" fill="#F8F3E9"></rect><rect x="1" y="1" width="54" height="54" fill="none" stroke="#128099" stroke-width="1.2"></rect><path d="M28 6 C31 17 39 25 50 28 C39 31 31 39 28 50 C25 39 17 31 6 28 C17 25 25 17 28 6 Z" fill="#128099"></path><circle cx="28" cy="28" r="5" fill="#F0B04B"></circle><circle cx="0" cy="0" r="7" fill="#B04E2B"></circle><circle cx="56" cy="0" r="7" fill="#B04E2B"></circle><circle cx="0" cy="56" r="7" fill="#B04E2B"></circle><circle cx="56" cy="56" r="7" fill="#B04E2B"></circle></g></pattern></defs><rect width="100%" height="36" fill="url(#azt)"></rect></svg><div class="g-foot-in"><a href="#legal">Privacidad y aviso legal</a><span>Guía creada con VisualTaste</span></div></footer>
<div class="g-cart"><div><b>Tu pedido · 2</b><span>Cesta de bienvenida, aceite</span></div><button type="button" class="g-pill">Ver pedido · 38 €</button></div>`,
  conserje: `<div class="g-chat">
<div class="g-chat-h"><div class="g-row0"><h1 class="g-h1">Conserje IA</h1><button type="button" class="g-lang" aria-label="Español">Español</button></div><p class="g-meta" style="margin-top:6px">Responde con lo que ha cargado tu anfitrión</p></div>
<div class="g-thread">
<div class="g-bub a">¡Bienvenido — Casa Azahar! Soy tu asistente virtual. Puedes preguntarme sobre la casa, el WiFi, el check-out, recomendaciones locales o cualquier duda de tu estancia.</div>
<div class="g-bub u">Recomienda un restaurante</div>
<div class="g-bub a">Cerca de la casa te recomiendo La Mar Salada: cocina andaluza, a 6 minutos andando.
<div class="g-rec"><div class="g-ph"><img src="@@eat@@" alt="" style="object-position:61.3% 50.0%;transform:scale(1.5);transform-origin:50.0% 86.0%"></div><div><h3 class="g-h3">La Mar Salada</h3><button type="button" class="g-link">Ver la carta</button></div></div></div>
</div>
<form class="g-compose"><label class="sr" for="g-msg">Mensaje</label><input id="g-msg" class="g-input" type="text" placeholder="Escribe tu mensaje aquí..."><button type="submit" class="g-pill fill">Enviar</button></form>
</div>`,
} as const;
