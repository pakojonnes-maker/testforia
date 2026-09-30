import { useState, useRef, useEffect, useMemo, type FormEvent, type ReactNode } from 'react';
import { getTranslation } from '../lib/i18n';
import { sendChatMessage, type ChatMessage } from '../lib/api';
import type { CtaActionType, PoiMedia } from '../lib/types';
import { experiencePhoto } from '../lib/media';
import CTAButton from './CTAButton';
import PhotoFigure from './PhotoFigure';
import { LanguageSwitcher } from './Header';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  streaming?: boolean;
  recs?: string[];
}

// Lo justo de cada cosa para pintar su tarjeta de recomendación (el guidebook pasa los objetos completos).
interface RestaurantRef { id: string; name: string; slug: string | null; cover_image?: string | null; }
interface PoiRef { id: string; name: string; google_maps_url: string; media?: Array<{ url?: string }>; }
interface ExperienceRef {
  id: string; name: string; action_type: CtaActionType; action_data: string;
  prefilled_message: string; cta_label?: string; cover_image_url?: string; media?: PoiMedia[];
}
interface StoreItemRef { id: string; name: string; price_display: string; cover_image_url?: string | null; in_stock?: boolean; }

interface ChatIASectionProps {
  lang: string;
  apartmentId?: string;
  onLanguageChange?: (lang: string) => void;
  restaurants?: RestaurantRef[];
  pois?: PoiRef[];
  experiences?: ExperienceRef[];
  storeItems?: StoreItemRef[];
  buildRestaurantUrl?: (slug: string) => string;
  onNavigateTab?: (tab: 'services' | 'restaurants') => void;
  /** Los clics en una recomendación cuentan como en su pestaña (guide_affiliate_intents). */
  onIntent?: (type: 'restaurant' | 'experience', id: string, action: string) => void;
}

// Centinela que el modelo añade al final de su respuesta para citar hasta 3
// referencias de lo que ha recomendado (ver workerGuideAI.js). El huésped
// nunca debe ver esta línea — se recorta del texto mostrado en cada token, no
// solo al terminar el streaming, por si el marcador llega en un chunk propio.
const RECS_MARKER = '<!--RECS:';

// A veces el modelo copia la referencia dentro de la frase ("[restaurant:rest_x]"): nunca se enseña.
const INLINE_REF = /\s*[[(](?:store|experience|restaurant|poi):[^\])\s]+[\])]/g;

function splitRecs(fullText: string): { display: string; refs: string[] } {
  const idx = fullText.indexOf(RECS_MARKER);
  if (idx === -1) return { display: fullText.replace(INLINE_REF, ''), refs: [] };
  const display = fullText.slice(0, idx).replace(INLINE_REF, '').trimEnd();
  const rest = fullText.slice(idx + RECS_MARKER.length);
  const endIdx = rest.indexOf('-->');
  const refsPart = endIdx === -1 ? rest : rest.slice(0, endIdx);
  const rawRefs = refsPart.split(',').map(r => r.trim()).filter(Boolean);
  // El modelo a veces repite la misma referencia en la lista — una tarjeta
  // idéntica duplicada bajo la respuesta se lee como un fallo, no como énfasis.
  const refs = Array.from(new Set(rawRefs));
  return { display, refs };
}

// Llama 8B nombra bien los sitios pero a veces copia mal su referencia en el marcador (probado: hablaba
// del mariposario y citaba el museo precolombino), y la tarjeta no casaba con el texto. Manda lo que el
// texto nombra: una referencia del marcador sólo se enseña si su nombre aparece en la respuesta, y lo que
// se nombra sin marcador también tiene tarjeta. Si el texto no nombra nada reconocible (lo parafrasea),
// se respeta el marcador tal cual.
interface NamedRef { ref: string; name: string; }

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Dónde nombra el texto `name` (nombre entero, o todas sus palabras en cualquier orden), o null.
function namedAt(foldedText: string, name: string): { at: number; exact: boolean } | null {
  const n = fold(name).trim();
  if (n.length < 3) return null;
  const exact = foldedText.indexOf(n);
  if (exact !== -1) return { at: exact, exact: true };
  const words = n.split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3);
  if (words.length < 2) return null;
  // La posición es la de su primera palabra: la última ("Benalmádena") puede aparecer antes por otro sitio.
  return words.every(w => foldedText.includes(w)) ? { at: foldedText.indexOf(words[0]), exact: false } : null;
}

function verifyRecs(display: string, refs: string[], catalog: NamedRef[]): string[] {
  const text = fold(display);
  const hits = catalog
    .map(item => ({ ref: item.ref, hit: namedAt(text, item.name) }))
    .filter((item): item is { ref: string; hit: { at: number; exact: boolean } } => item.hit !== null)
    // Dos ítems de nombre parecido ("Teleférico Benalmádena" / "Teleférico de Benalmádena") caen en el
    // mismo sitio del texto: una mención, una tarjeta, y gana el que el texto nombra tal cual.
    .sort((a, b) => Number(b.hit.exact) - Number(a.hit.exact) || a.hit.at - b.hit.at);
  const taken = new Set<number>();
  const named = hits
    .filter(h => !taken.has(h.hit.at) && taken.add(h.hit.at))
    .sort((a, b) => a.hit.at - b.hit.at)
    .map(h => h.ref);
  return (named.length > 0 ? named : refs).slice(0, 3);
}

const QUICK_ACTIONS_BY_LANG: Record<string, string[]> = {
  es: [
    '¿Cuál es la clave del WiFi?',
    'Recomienda un restaurante',
    '¿Cómo es el proceso de salida?',
    '¿Hay aparcamiento?',
  ],
  en: [
    'What is the WiFi password?',
    'Recommend a restaurant',
    'What is the checkout process?',
    'Is there parking?',
  ],
  fr: [
    'Quel est le mot de passe WiFi?',
    'Recommande un restaurant',
    'Comment se passe le départ?',
    'Y a-t-il un parking?',
  ],
  de: [
    'Wie lautet das WLAN-Passwort?',
    'Empfiehl mir ein Restaurant',
    'Wie läuft der Check-out ab?',
    'Gibt es einen Parkplatz?',
  ],
  it: [
    'Qual è la password del WiFi?',
    'Consigliami un ristorante',
    'Come funziona il check-out?',
    "C'è un parcheggio?",
  ],
  pt: [
    'Qual é a palavra-passe do WiFi?',
    'Recomenda um restaurante',
    'Como funciona o check-out?',
    'Há estacionamento?',
  ],
  ca: [
    'Quina és la contrasenya del WiFi?',
    "Recomana'm un restaurant",
    'Com funciona el check-out?',
    'Hi ha aparcament?',
  ],
  ar: [
    'ما هي كلمة مرور الواي فاي؟',
    'أوصِ بمطعم',
    'كيف تتم عملية المغادرة؟',
    'هل يوجد موقف سيارات؟',
  ],
  ru: [
    'Какой пароль от WiFi?',
    'Порекомендуй ресторан',
    'Как проходит выезд?',
    'Есть ли парковка?',
  ],
  uk: [
    'Який пароль від WiFi?',
    'Порекомендуй ресторан',
    'Як відбувається виїзд?',
    'Чи є парковка?',
  ],
  zh: [
    'WiFi密码是多少？',
    '推荐一家餐厅',
    '退房流程是怎样的？',
    '有停车位吗？',
  ],
  ja: [
    'WiFiのパスワードは何ですか？',
    'おすすめのレストランを教えて',
    'チェックアウトの手順は？',
    '駐車場はありますか？',
  ],
  ko: [
    '와이파이 비밀번호가 뭔가요?',
    '레스토랑을 추천해 주세요',
    '체크아웃 절차가 어떻게 되나요?',
    '주차 공간이 있나요?',
  ],
};

// Saludo del asistente. Impersonal a propósito (ni el nombre del piso, que suele ser
// una frase de anuncio, ni un "querido huésped" que en muchos idiomas marca género):
// da la bienvenida, dice qué es y para qué está, recomienda lo que el piso vende y
// deja la puerta abierta. Es plantilla, no IA: sale al instante y no gasta cupo.
// {list} son los nombres reales, entre las comillas de cada idioma.
interface WelcomeCopy {
  intro: string;
  experiences: string;
  store: string;
  close: string;
  quote: [string, string];
}

const WELCOME: Record<string, WelcomeCopy> = {
  es: {
    intro: 'Hola, te damos la bienvenida. Nos alegra mucho tenerte aquí. Soy el asistente virtual del alojamiento y estoy a tu disposición durante toda la estancia, a cualquier hora.',
    experiences: 'Si te apetece vivir algo especial estos días, te recomiendo {list}.',
    store: 'Y para que todo sea aún más cómodo, puedes pedir {list} desde la propia guía.',
    close: 'Cualquier duda sobre la casa, ya sea el WiFi, la llegada, la salida o cómo funciona algo, pregúntame con toda confianza.',
    quote: ['«', '»'],
  },
  en: {
    intro: "Hello, and welcome. We're delighted to have you here. I'm the property's virtual assistant, and I'm here for you throughout your stay, at any hour.",
    experiences: "If you'd like to make these days special, I recommend {list}.",
    store: 'And to make things even more comfortable, you can order {list} right from this guide.',
    close: "Any question about the home, whether it's the WiFi, arrival, check-out or how something works, just ask me.",
    quote: ['“', '”'],
  },
  fr: {
    intro: "Bonjour et bienvenue. Nous sommes ravis de vous accueillir. Je suis l'assistant virtuel du logement et je reste à votre disposition pendant tout votre séjour, à toute heure.",
    experiences: 'Pour vivre quelque chose de spécial pendant ces quelques jours, je vous recommande {list}.',
    store: 'Et pour un séjour encore plus confortable, vous pouvez commander {list} directement depuis ce guide.',
    close: "Pour toute question sur le logement, qu'il s'agisse du WiFi, de l'arrivée, du départ ou du fonctionnement d'un appareil, n'hésitez pas à me la poser.",
    quote: ['« ', ' »'],
  },
  de: {
    intro: 'Hallo und herzlich willkommen. Schön, dass du da bist. Ich bin der virtuelle Assistent der Unterkunft und während deines ganzen Aufenthalts rund um die Uhr für dich da.',
    experiences: 'Wenn du in diesen Tagen etwas Besonderes erleben möchtest, empfehle ich dir {list}.',
    store: 'Und damit alles noch bequemer wird, kannst du {list} direkt über diesen Guide bestellen.',
    close: 'Bei jeder Frage zur Unterkunft, ob WLAN, Ankunft, Abreise oder wie etwas funktioniert, frag mich einfach.',
    quote: ['„', '“'],
  },
  it: {
    intro: "Ciao, ti diamo il benvenuto. Siamo felici di averti qui. Sono l'assistente virtuale dell'alloggio e resto a tua disposizione per tutto il soggiorno, a qualsiasi ora.",
    experiences: 'Se ti va di vivere qualcosa di speciale in questi giorni, ti consiglio {list}.',
    store: 'E per rendere tutto ancora più comodo, puoi ordinare {list} direttamente da questa guida.',
    close: "Per qualsiasi domanda sulla casa, che sia il WiFi, l'arrivo, la partenza o come funziona qualcosa, chiedimi pure.",
    quote: ['«', '»'],
  },
  pt: {
    intro: 'Olá, damos-lhe as boas-vindas. Ficamos muito contentes com a sua visita. Sou o assistente virtual do alojamento e estou à sua disposição durante toda a estadia, a qualquer hora.',
    experiences: 'Se quiser viver algo especial nestes dias, recomendo {list}.',
    store: 'E para tornar tudo ainda mais cómodo, pode encomendar {list} diretamente neste guia.',
    close: 'Para qualquer dúvida sobre a casa, seja o WiFi, a chegada, a saída ou como funciona alguma coisa, pergunte-me à vontade.',
    quote: ['«', '»'],
  },
  ca: {
    intro: "Hola, et donem la benvinguda. Ens fa molta il·lusió tenir-te aquí. Sóc l'assistent virtual de l'allotjament i sóc a la teva disposició durant tota l'estada, a qualsevol hora.",
    experiences: 'Si et ve de gust viure alguna cosa especial aquests dies, et recomano {list}.',
    store: 'I perquè tot sigui encara més còmode, pots demanar {list} des de la mateixa guia.',
    close: "Per a qualsevol dubte sobre la casa, ja sigui el WiFi, l'arribada, la sortida o com funciona alguna cosa, pregunta'm amb tota confiança.",
    quote: ['«', '»'],
  },
  // Los nombres (casi siempre latinos) van entre U+2068 y U+2069 (aislante bidi) para que no se reordenen dentro de la frase RTL.
  ar: {
    intro: 'مرحبًا بك، يسعدنا وجودك معنا. أنا المساعد الافتراضي لمكان إقامتك، وأنا هنا لمساعدتك طوال فترة إقامتك وفي أي وقت.',
    experiences: 'إن رغبت في تجربة مميزة خلال هذه الأيام، أوصيك بما يلي: {list}.',
    store: 'ولراحة أكبر، يمكنك طلب {list} مباشرةً من هذا الدليل.',
    close: 'ولأي سؤال عن المنزل، سواء عن الواي فاي أو الوصول أو المغادرة أو طريقة عمل أي شيء، لا تتردد في سؤالي.',
    quote: ['«⁨', '⁩»'],
  },
  ru: {
    intro: 'Здравствуйте, добро пожаловать. Мы очень рады вам. Я виртуальный помощник этого жилья и на связи в течение всего вашего пребывания, в любое время.',
    experiences: 'Если захотите провести эти дни по-особенному, рекомендую {list}.',
    store: 'А чтобы было ещё удобнее, вы можете заказать {list} прямо в этом путеводителе.',
    close: 'С любым вопросом о доме, будь то WiFi, заезд, выезд или то, как что-то работает, смело обращайтесь ко мне.',
    quote: ['«', '»'],
  },
  uk: {
    intro: 'Вітаємо, ласкаво просимо. Ми дуже раді, що ви тут. Я віртуальний помічник цього житла і на зв’язку протягом усього вашого перебування, у будь-який час.',
    experiences: 'Якщо захочете провести ці дні по-особливому, раджу {list}.',
    store: 'А щоб було ще зручніше, ви можете замовити {list} прямо в цьому путівнику.',
    close: 'З будь-яким питанням про житло, чи то WiFi, заїзд, виїзд або як щось працює, сміливо звертайтеся до мене.',
    quote: ['«', '»'],
  },
  zh: {
    intro: '您好，欢迎入住，很高兴您的到来。我是这里的虚拟助手，在您入住期间随时为您服务。',
    experiences: '如果您想在这几天体验一些特别的活动，我推荐{list}。',
    store: '为了让您住得更舒适，您还可以直接在本指南中预订{list}。',
    close: '关于房子的任何问题，无论是WiFi、入住、退房还是设备的使用，都欢迎随时问我。',
    quote: ['“', '”'],
  },
  ja: {
    intro: 'こんにちは、ようこそお越しくださいました。お迎えできてとてもうれしいです。私はこの宿泊施設のバーチャルアシスタントで、ご滞在中はいつでもお手伝いいたします。',
    experiences: '滞在を特別なものにしたいときは、{list}がおすすめです。',
    store: 'さらに快適にお過ごしいただけるよう、{list}をこのガイドから直接ご注文いただけます。',
    close: 'WiFi、チェックイン、チェックアウト、設備の使い方など、お住まいのことなら何でもお気軽にお尋ねください。',
    quote: ['「', '」'],
  },
  ko: {
    intro: '안녕하세요, 환영합니다. 이렇게 모시게 되어 정말 기쁩니다. 저는 이 숙소의 가상 어시스턴트이며, 머무시는 동안 언제든 도와드릴게요.',
    experiences: '특별한 시간을 보내고 싶으시다면 이런 경험을 추천해 드려요: {list}.',
    store: '더 편안한 숙박을 위해 이 가이드에서 바로 주문하실 수도 있어요: {list}.',
    close: '와이파이, 체크인, 체크아웃, 사용 방법 등 숙소에 관한 궁금한 점은 무엇이든 편하게 물어보세요.',
    quote: ['‘', '’'],
  },
};

// Intl.ListFormat pone el "y" / "and" / "和" de cada idioma. La lib de TS del guide es anterior a ES2021,
// de ahí el tipo a mano; los navegadores lo soportan desde 2020 y, si no, quedan comas.
type ListFormatCtor = new (locale: string, options: { style: string; type: string }) => { format(items: string[]): string };
const ListFormat = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;

function joinNames(lang: string, names: string[], quote: [string, string]): string {
  const quoted = names.map(n => `${quote[0]}${n}${quote[1]}`);
  try {
    if (ListFormat) return new ListFormat(lang, { style: 'long', type: 'conjunction' }).format(quoted);
  } catch { /* locale sin datos: comas */ }
  return quoted.join(', ');
}

function getWelcomeMessage(lang: string, experienceNames: string[], storeNames: string[]): string {
  const copy = WELCOME[lang] || WELCOME.es;
  const recommend = [
    experienceNames.length ? copy.experiences.replace('{list}', joinNames(lang, experienceNames, copy.quote)) : '',
    storeNames.length ? copy.store.replace('{list}', joinNames(lang, storeNames, copy.quote)) : '',
  ].filter(Boolean).join(' ');
  // Tres párrafos (la burbuja respeta los saltos: white-space: pre-line) en vez de un bloque que no se lee en un móvil.
  return [copy.intro, recommend, copy.close].filter(Boolean).join('\n\n');
}

// Una tarjeta de recomendación dentro de la burbuja del asistente: foto pequeña en un cuadrado redondeado (o la
// inicial, si no hay), el nombre y, debajo, lo que se puede hacer con ella.
function RecCard({ image, name, detail, children }: { image?: string | null; name: string; detail?: string; children?: ReactNode }) {
  return (
    <div className="g-rec">
      <PhotoFigure className="g-ph" src={image} alt="" name={name} />
      <div className="g-rec-b">
        <h3 className="g-h3">{name}</h3>
        {detail && <p className="g-meta"><bdi>{detail}</bdi></p>}
        {children}
      </div>
    </div>
  );
}

export default function ChatIASection({
  lang, apartmentId, onLanguageChange,
  restaurants = [], pois = [], experiences = [], storeItems = [],
  buildRestaurantUrl, onNavigateTab, onIntent,
}: ChatIASectionProps) {
  // Lo que recomienda el saludo: hasta dos experiencias y el resto hasta tres
  // tarjetas con la Tienda (máximo dos productos). Las dos listas ya llegan
  // ordenadas promoción → destacado → orden manual (workerGuide.js), así que
  // basta con coger las primeras. Se deriva en cada render, no se guarda en el
  // estado: al cambiar de idioma el saludo cambia con él.
  const welcome = useMemo<Message>(() => {
    const exps = experiences.slice(0, 2);
    const items = storeItems.filter(i => i.in_stock !== false).slice(0, Math.min(2, 3 - exps.length));
    return {
      id: 'welcome',
      sender: 'ai',
      text: getWelcomeMessage(lang, exps.map(e => e.name), items.map(i => i.name)),
      recs: [...exps.map(e => `experience:${e.id}`), ...items.map(i => `store:${i.id}`)],
    };
  }, [lang, experiences, storeItems]);

  // Todo lo que el asistente puede recomendar, con la referencia de su tarjeta. Un mismo id puede estar
  // en dos listas (un restaurante de Google también es un lugar; una experiencia con coordenadas también):
  // se queda la primera, que es la tarjeta con más acción.
  const catalog = useMemo<NamedRef[]>(() => {
    const seen = new Set<string>();
    const all = [
      ...storeItems.map(i => ({ id: i.id, ref: `store:${i.id}`, name: i.name })),
      ...experiences.map(e => ({ id: e.id, ref: `experience:${e.id}`, name: e.name })),
      ...restaurants.map(r => ({ id: r.id, ref: `restaurant:${r.id}`, name: r.name })),
      ...pois.map(p => ({ id: p.id, ref: `poi:${p.id}`, name: p.name })),
    ];
    const unique: NamedRef[] = [];
    for (const item of all) {
      if (!item.name || seen.has(item.id)) continue;
      seen.add(item.id);
      unique.push({ ref: item.ref, name: item.name });
    }
    return unique;
  }, [storeItems, experiences, restaurants, pois]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const historyRef = useRef<ChatMessage[]>([]);
  const suggestions = QUICK_ACTIONS_BY_LANG[lang] || QUICK_ACTIONS_BY_LANG.es;

  // Se baja la propia conversación, no la página: scrollIntoView movía también a los ancestros.
  // Con sólo el saludo no: con sus tarjetas no cabe en un móvil y el huésped lo empezaba a leer por la mitad.
  useEffect(() => {
    const el = threadRef.current;
    if (el && messages.length > 0) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    historyRef.current = [...historyRef.current, { role: 'user' as const, content: text.trim() }].slice(-10);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: '', streaming: true }]);

    let fullResponse = '';

    if (!apartmentId) {
      setTimeout(() => {
        const demoText = getTranslation('chat_loading_demo', lang);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: demoText, streaming: false } : m));
        setIsLoading(false);
      }, 800);
      return;
    }

    await sendChatMessage(
      apartmentId,
      text.trim(),
      historyRef.current.slice(0, -1),
      lang,
      (token) => {
        fullResponse += token;
        const { display } = splitRecs(fullResponse);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: display } : m));
      },
      () => {
        const { display, refs } = splitRecs(fullResponse);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: display, streaming: false, recs: verifyRecs(display, refs, catalog) } : m));
        if (fullResponse.trim()) {
          historyRef.current = [...historyRef.current, { role: 'assistant' as const, content: display.trim() }].slice(-10);
        }
        setIsLoading(false);
        inputRef.current?.focus();
      }
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  // Resuelve una referencia "tipo:id" del centinela contra los datos que el
  // guidebook ya tiene cargados, y devuelve una tarjeta compacta con el CTA
  // real. Best-effort: si el modelo cita un id que no existe (alucinación o
  // dato caducado en su contexto), simplemente no se renderiza nada para esa
  // referencia — nunca un error visible para el huésped.
  const renderRec = (ref: string, idx: number) => {
    const [type, id] = ref.split(':');
    if (type === 'store') {
      const item = storeItems.find(i => i.id === id);
      if (!item) return null;
      return (
        <RecCard key={idx} image={item.cover_image_url} name={item.name} detail={item.price_display}>
          <button type="button" className="g-link" onClick={() => onNavigateTab?.('services')}>{getTranslation('view_store', lang)}</button>
        </RecCard>
      );
    }
    if (type === 'restaurant') {
      const r = restaurants.find(x => x.id === id);
      if (!r) return null;
      return (
        <RecCard key={idx} image={r.cover_image} name={r.name}>
          {r.slug && buildRestaurantUrl ? (
            // Cliente de VisualTaste: directo a su carta en vídeo (la URL ya lleva la atribución guía → carta).
            <a
              className="g-link"
              href={buildRestaurantUrl(r.slug)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onIntent?.('restaurant', r.id, 'click_menu')}
            >
              {getTranslation('view_video_menu', lang)}
            </a>
          ) : (
            <button type="button" className="g-link" onClick={() => onNavigateTab?.('restaurants')}>{getTranslation('tab_restaurants', lang)}</button>
          )}
        </RecCard>
      );
    }
    if (type === 'experience') {
      const exp = experiences.find(x => x.id === id);
      if (!exp) return null;
      return (
        <RecCard key={idx} image={experiencePhoto(exp)} name={exp.name}>
          <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent?.('experience', exp.id, action)} />
        </RecCard>
      );
    }
    if (type === 'poi') {
      const poi = pois.find(x => x.id === id);
      if (!poi) return null;
      return (
        <RecCard key={idx} image={poi.media?.[0]?.url} name={poi.name}>
          <a className="g-link" href={poi.google_maps_url} target="_blank" rel="noopener noreferrer">{getTranslation('directions', lang)}</a>
        </RecCard>
      );
    }
    return null;
  };

  // Las sugerencias solo se ofrecen al empezar: en cuanto el huésped escribe o toca una, el hilo manda.
  const showSuggestions = messages.length === 0;

  return (
    <div className="g-chat">
      <div className="g-chat-h">
        <div className="g-row0">
          <h1 className="g-h1">{getTranslation('chat_assistant_title', lang)}</h1>
          <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} />
        </div>
      </div>

      <div className="g-thread" ref={threadRef} role="log" aria-busy={isLoading}>
        {[welcome, ...messages].map(msg => {
          if (msg.sender === 'user') return <div key={msg.id} className="g-bub u">{msg.text}</div>;
          // Aún sin texto: tres puntos. Con texto en camino: el texto y un cursor que parpadea.
          if (msg.streaming && !msg.text) {
            return (
              <div key={msg.id} className="g-bub a typing" aria-hidden="true"><i /><i /><i /></div>
            );
          }
          return (
            <div key={msg.id} className="g-bub a">
              {msg.text}
              {msg.streaming && <span className="g-caret" aria-hidden="true" />}
              {msg.recs && msg.recs.map((ref, i) => renderRec(ref, i))}
            </div>
          );
        })}
        {showSuggestions && (
          <div className="g-qa">
            {suggestions.map(text => (
              <button key={text} type="button" className="g-chip" onClick={() => handleSend(text)} disabled={isLoading}>
                {text}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="g-compose" onSubmit={handleSubmit}>
        <label className="sr" htmlFor="g-msg">{getTranslation('chat_placeholder', lang)}</label>
        <input
          id="g-msg"
          ref={inputRef}
          type="text"
          className={`g-input${isLoading ? ' dis' : ''}`}
          enterKeyHint="send"
          autoComplete="off"
          placeholder={getTranslation('chat_placeholder', lang)}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          readOnly={isLoading}
          aria-disabled={isLoading || undefined}
        />
        <button type="submit" className="g-pill fill" disabled={isLoading || !inputValue.trim()}>
          {getTranslation('chat_send', lang)}
        </button>
      </form>

      {/* Art. 50.1 del Reglamento (UE) 2024/1689 (AI Act), aplicable desde el
          2 de agosto de 2026: hay que avisar de forma clara y distinguible de
          que se está interactuando con una IA. El saludo de bienvenida ya lo
          decía, pero se pierde en cuanto el huésped hace scroll — este aviso
          es fijo y siempre visible junto al input.

          Va también la advertencia de falibilidad: el asistente sirve códigos
          de acceso, horarios y recomendaciones, y un error ahí tiene
          consecuencias reales para el huésped. */}
      <p className="g-disc2">{getTranslation('ai_disclosure', lang)}</p>
    </div>
  );
}
