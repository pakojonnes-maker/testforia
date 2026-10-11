/**
 * Landing central de visualtastes.com (guía, conserje con IA y TV para alquiler vacacional).
 *
 * HTML + TypeScript sin framework: el contenido vive en central/index.html (es una página de venta, tiene que ser
 * HTML indexable y pesar poco) y esto solo pone comportamiento: menú de móvil, calculadora de precio y el
 * formulario que abre WhatsApp. Sin React, MUI ni Emotion: es una entrada de Vite aparte de la SPA de la carta.
 *
 * Fuentes AUTOALOJADAS (@fontsource-variable), no servidas desde un CDN: cero peticiones a terceros.
 * Si falta en el HTML un elemento que se espera aquí, falla al arrancar con un error claro, no deja un botón muerto.
 */
import '@fontsource-variable/montserrat/index.css';
import '@fontsource-variable/playfair-display/index.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import './central.css';

/**
 * Precios, en euros al mes y sin IVA. Están también en central/index.html (texto visible y preguntas),
 * apps/guide/src/pages/landing/data.ts y apps/tv-landing/index.html: se cambian los cuatro a la vez.
 */
const PRICES = {
  guia: 3,
  guiaConserje: 4,
  tv: 13,
  /** Paquete completo (guía, conserje y TV), por tramo de pisos; por encima del último, a convenir. */
  paquete: [
    { hasta: 30, euros: 70 },
    { hasta: 50, euros: 100 },
  ],
} as const;

/** Lo que cuesta cada piso contratando suelto la guía con conserje y la tele. */
const SUELTO_POR_PISO = PRICES.guiaConserje + PRICES.tv;
/** Desde cuántos pisos compensa el paquete: con 4 sueltos son 68 € (menos que 70), con 5 son 85 €. */
const PAQUETE_MINIMO = 5;

function must<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`central: falta ${selector} en el HTML`);
  return el;
}

// ---------- menú de móvil: un botón de texto («Menú»), sin icono ----------

/** Ancho de .lp a partir del cual el CSS oculta el botón y muestra los enlaces de la cabecera. */
const DESKTOP_MIN_WIDTH = 981;

function initMenu(): void {
  const toggle = must<HTMLButtonElement>(document, '[data-menu-toggle]');
  const panel = must<HTMLElement>(document, '#menu-panel');
  const page = must<HTMLElement>(document, '.lp');

  const setOpen = (open: boolean): void => {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  // Tocar un enlace del panel lo cierra.
  panel.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  // Si se ensancha la ventana con el panel abierto, no se queda «abierto» y oculto.
  new ResizeObserver(() => {
    if (page.clientWidth >= DESKTOP_MIN_WIDTH) setOpen(false);
  }).observe(page);
}

// ---------- calculadora: suelto frente a paquete ----------

const eur = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
/** Con espacio duro antes del «€»: un importe no debe partirse entre dos líneas. */
const money = (n: number): string => `${eur.format(n)} €`;
const pisos = (n: number): string => `${n} ${n === 1 ? 'piso' : 'pisos'}`;

/** Precio del paquete para n pisos, o null si pasa del último tramo (a convenir). */
function packagePrice(n: number): number | null {
  const tier = PRICES.paquete.find((t) => n <= t.hasta);
  return tier ? tier.euros : null;
}

function calcText(n: number): { loose: number; pack: number | null; text: string } {
  const loose = n * SUELTO_POR_PISO;
  const pack = packagePrice(n);
  if (pack === null) {
    return { loose, pack, text: 'Con más de 50 pisos el precio se acuerda contigo. Cuéntanos cuántos gestionas.' };
  }
  if (n < PAQUETE_MINIMO) {
    return { loose, pack, text: `Con ${pisos(n)} te sale mejor por piso: ${money(loose)} al mes.` };
  }
  return {
    loose,
    pack,
    text: `Con ${pisos(n)}, el paquete cuesta ${money(pack)} al mes: ${money(loose - pack)} menos que contratarlo todo suelto.`,
  };
}

function initCalculator(): void {
  const root = must<HTMLElement>(document, '[data-calc]');
  const range = must<HTMLInputElement>(root, 'input[type="range"]');
  const count = must<HTMLElement>(root, '[data-calc-n]');
  const loose = must<HTMLElement>(root, '[data-calc-loose]');
  const pack = must<HTMLElement>(root, '[data-calc-pack]');
  const result = must<HTMLElement>(root, '[data-calc-result]');

  const render = (): void => {
    const n = Number(range.value);
    const r = calcText(n);
    count.textContent = pisos(n);
    loose.textContent = money(r.loose);
    pack.textContent = r.pack === null ? 'A convenir' : money(r.pack);
    result.textContent = r.text;
  };

  range.addEventListener('input', render);
  render();
}

// ---------- formulario: no hay servidor detrás, abre WhatsApp con el mensaje ya escrito ----------

const WHATSAPP_NUMBER = '34633747033';

function initForm(): void {
  const form = must<HTMLFormElement>(document, '[data-wa-form]');
  const name = must<HTMLInputElement>(form, '#f-n');
  const size = must<HTMLSelectElement>(form, '#f-p');
  const zone = must<HTMLInputElement>(form, '#f-z');
  const question = must<HTMLTextAreaElement>(form, '#f-q');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const sizeText = size.value === 'Más de 50' ? 'más de 50' : size.value;
    const place = zone.value.trim();
    const text = [
      `Hola, soy ${name.value.trim()}.`,
      `Gestiono ${sizeText} alojamientos${place ? ` en ${place}` : ''}.`,
      question.value.trim() || 'Me gustaría ver una demo de VisualTaste.',
    ].join(' ');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
}

initMenu();
initCalculator();
initForm();
