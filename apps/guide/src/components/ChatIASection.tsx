import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react';
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
interface StoreItemRef { id: string; name: string; price_display: string; cover_image_url?: string | null; }

interface ChatIASectionProps {
  lang: string;
  apartmentId?: string;
  apartmentName?: string;
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

function splitRecs(fullText: string): { display: string; refs: string[] } {
  const idx = fullText.indexOf(RECS_MARKER);
  if (idx === -1) return { display: fullText, refs: [] };
  const display = fullText.slice(0, idx).trimEnd();
  const rest = fullText.slice(idx + RECS_MARKER.length);
  const endIdx = rest.indexOf('-->');
  const refsPart = endIdx === -1 ? rest : rest.slice(0, endIdx);
  const rawRefs = refsPart.split(',').map(r => r.trim()).filter(Boolean);
  // El modelo a veces repite la misma referencia en la lista — una tarjeta
  // idéntica duplicada bajo la respuesta se lee como un fallo, no como énfasis.
  const refs = Array.from(new Set(rawRefs));
  return { display, refs };
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

// Real listings are often named with a full descriptive sentence rather than a short
// proper noun (e.g. "Acogedor apartamento cerca del Parque de la Paloma"), which breaks
// grammatical constructions like "Welcome to {name}!" in every language. Using a neutral
// separator instead of a preposition keeps the greeting correct regardless of name shape.
function getWelcomeMessage(lang: string, name?: string): string {
  const n = name || '';
  const templates: Record<string, string> = {
    es: `¡Bienvenido${n ? ' — ' + n : ''}! Soy tu asistente virtual. Puedes preguntarme sobre la casa, el WiFi, el check-out, recomendaciones locales o cualquier duda de tu estancia.`,
    en: `Welcome${n ? ' — ' + n : ''}! I'm your virtual assistant. Ask me about the apartment, WiFi, check-out, local recommendations or anything about your stay.`,
    fr: `Bienvenue${n ? ' — ' + n : ''}! Je suis votre assistant virtuel. Posez-moi des questions sur l'appartement, le WiFi, le départ, ou les recommandations locales.`,
    de: `Willkommen${n ? ' — ' + n : ''}! Ich bin dein virtueller Assistent. Frag mich zur Unterkunft, WiFi, Check-out oder lokalen Empfehlungen.`,
    it: `Benvenuto${n ? ' — ' + n : ''}! Sono il tuo assistente virtuale. Chiedimi dell'appartamento, del WiFi, del check-out o consigli locali.`,
    pt: `Bem-vindo${n ? ' — ' + n : ''}! Sou o seu assistente virtual. Pergunte-me sobre o apartamento, WiFi, check-out ou recomendações locais.`,
    ca: `Benvingut${n ? ' — ' + n : ''}! Sóc el teu assistent virtual. Pregunta'm sobre l'apartament, el WiFi, el check-out o recomanacions locals.`,
    // El nombre va entre U+2068 y U+2069 (aislante bidi): un nombre latino dentro de una frase RTL no debe reordenarse.
    ar: `أهلاً بك${n ? ' — \u2068' + n + '\u2069' : ''}! أنا مساعدك الافتراضي. اسألني عن الشقة، الواي فاي، تسجيل المغادرة أو التوصيات المحلية.`,
    ru: `Добро пожаловать${n ? ' — ' + n : ''}! Я ваш виртуальный ассистент. Спросите меня о квартире, WiFi, выезде или местных рекомендациях.`,
    uk: `Ласкаво просимо${n ? ' — ' + n : ''}! Я ваш віртуальний асистент. Запитайте мене про квартиру, WiFi, виїзд або місцеві рекомендації.`,
    zh: `欢迎${n ? ' — ' + n : ''}！我是您的虚拟助手。您可以问我关于房源、WiFi、退房或当地推荐的问题。`,
    ja: `ようこそ${n ? ' — ' + n : ''}！私はあなたのバーチャルアシスタントです。お部屋のこと、WiFi、チェックアウト、地元のおすすめについて何でも聞いてください。`,
    ko: `환영합니다${n ? ' — ' + n : ''}! 저는 당신의 가상 어시스턴트입니다. 숙소, 와이파이, 체크아웃, 현지 추천에 대해 무엇이든 물어보세요.`,
  };
  return templates[lang] || templates.es;
}

// Frase corta que se añade al saludo cuando hay algo concreto que recomendar
// (producto destacado de la Tienda, o si no, restaurante destacado). Puramente
// client-side con los datos que el guidebook ya trae cargados — sin llamada
// extra a la IA, sin coste ni latencia añadidos.
function getUpsellHint(lang: string, itemName: string): string {
  const templates: Record<string, string> = {
    es: `Por cierto, ¿ya has visto "${itemName}"? Puedes verlo en la app.`,
    en: `By the way, have you seen "${itemName}"? You can check it out in the app.`,
    fr: `Au fait, avez-vous vu « ${itemName} » ? Vous pouvez le consulter dans l'application.`,
    de: `Übrigens, hast du schon „${itemName}" gesehen? Du findest es in der App.`,
    it: `A proposito, hai già visto "${itemName}"? Puoi trovarlo nell'app.`,
    pt: `já agora, já viu "${itemName}"? Pode consultá-lo na app.`,
    ca: `Per cert, ja has vist "${itemName}"? El pots veure a l'app.`,
    ar: `بالمناسبة، هل رأيت "\u2068${itemName}\u2069"؟ يمكنك الاطلاع عليه في التطبيق.`,
    ru: `Кстати, вы уже видели «${itemName}»? Посмотрите в приложении.`,
    uk: `До речі, ви вже бачили «${itemName}»? Погляньте в застосунку.`,
    zh: `对了，你看过"${itemName}"吗？可以在应用里查看。`,
    ja: `ところで「${itemName}」はもうご覧になりましたか？アプリ内でチェックできます。`,
    ko: `그런데 "${itemName}" 보셨나요? 앱에서 확인하실 수 있어요.`,
  };
  return templates[lang] || templates.es;
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
  lang, apartmentId, apartmentName, onLanguageChange,
  restaurants = [], pois = [], experiences = [], storeItems = [],
  buildRestaurantUrl, onNavigateTab, onIntent,
}: ChatIASectionProps) {
  // El destacado de la bienvenida: producto de Tienda destacado -> si no,
  // restaurante -> si no, nada. Prioriza lo que más vende para el anfitrión.
  // storeItems ya llega ordenado is_featured DESC (workerGuide.js), así que el
  // primero es el destacado cuando existe uno.
  const highlightItem = storeItems[0] || null;
  const highlightRestaurant = !highlightItem ? restaurants[0] : null;
  const welcomeBase = getWelcomeMessage(lang, apartmentName);
  const welcomeHint = highlightItem
    ? getUpsellHint(lang, highlightItem.name)
    : highlightRestaurant ? getUpsellHint(lang, highlightRestaurant.name) : '';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: welcomeHint ? `${welcomeBase} ${welcomeHint}` : welcomeBase,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const historyRef = useRef<ChatMessage[]>([]);
  const suggestions = QUICK_ACTIONS_BY_LANG[lang] || QUICK_ACTIONS_BY_LANG.es;

  // Se baja la propia conversación, no la página: scrollIntoView movía también a los ancestros.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: display, streaming: false, recs: refs } : m));
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
  const showSuggestions = messages.length === 1;

  return (
    <div className="g-chat">
      <div className="g-chat-h">
        <div className="g-row0">
          <h1 className="g-h1">{getTranslation('chat_assistant_title', lang)}</h1>
          <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} />
        </div>
      </div>

      <div className="g-thread" ref={threadRef} role="log" aria-busy={isLoading}>
        {messages.map(msg => {
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
