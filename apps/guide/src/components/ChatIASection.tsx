import React, { useState, useRef, useEffect } from 'react';
import { getTranslation } from '../lib/i18n';
import { sendChatMessage, type ChatMessage } from '../lib/api';
import CTAButton from './CTAButton';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  streaming?: boolean;
  recs?: string[];
}

interface RestaurantRef { id: string; name: string; slug: string; }
interface PoiRef { id: string; name: string; google_maps_url: string; }
interface ExperienceRef {
  id: string; name: string; action_type: string; action_data: string;
  prefilled_message: string; cta_label?: string;
}
interface StoreItemRef { id: string; name: string; price_display: string; }

interface ChatIASectionProps {
  lang: string;
  apartmentId?: string;
  apartmentName?: string;
  restaurants?: RestaurantRef[];
  pois?: PoiRef[];
  experiences?: ExperienceRef[];
  storeItems?: StoreItemRef[];
  buildRestaurantUrl?: (slug: string) => string;
  onNavigateTab?: (tab: 'services' | 'restaurants') => void;
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

const QUICK_ACTIONS_BY_LANG: Record<string, Array<{ icon: string; text: string }>> = {
  es: [
    { icon: 'wifi', text: '¿Cuál es la clave del WiFi?' },
    { icon: 'restaurant', text: 'Recomienda un restaurante' },
    { icon: 'door_front', text: '¿Cómo es el proceso de salida?' },
    { icon: 'local_parking', text: '¿Hay aparcamiento?' },
  ],
  en: [
    { icon: 'wifi', text: 'What is the WiFi password?' },
    { icon: 'restaurant', text: 'Recommend a restaurant' },
    { icon: 'door_front', text: 'What is the checkout process?' },
    { icon: 'local_parking', text: 'Is there parking?' },
  ],
  fr: [
    { icon: 'wifi', text: 'Quel est le mot de passe WiFi?' },
    { icon: 'restaurant', text: 'Recommande un restaurant' },
    { icon: 'door_front', text: 'Comment se passe le départ?' },
    { icon: 'local_parking', text: 'Y a-t-il un parking?' },
  ],
  de: [
    { icon: 'wifi', text: 'Wie lautet das WLAN-Passwort?' },
    { icon: 'restaurant', text: 'Empfiehl mir ein Restaurant' },
    { icon: 'door_front', text: 'Wie läuft der Check-out ab?' },
    { icon: 'local_parking', text: 'Gibt es einen Parkplatz?' },
  ],
  it: [
    { icon: 'wifi', text: 'Qual è la password del WiFi?' },
    { icon: 'restaurant', text: 'Consigliami un ristorante' },
    { icon: 'door_front', text: 'Come funziona il check-out?' },
    { icon: 'local_parking', text: "C'è un parcheggio?" },
  ],
  pt: [
    { icon: 'wifi', text: 'Qual é a palavra-passe do WiFi?' },
    { icon: 'restaurant', text: 'Recomenda um restaurante' },
    { icon: 'door_front', text: 'Como funciona o check-out?' },
    { icon: 'local_parking', text: 'Há estacionamento?' },
  ],
  ca: [
    { icon: 'wifi', text: 'Quina és la contrasenya del WiFi?' },
    { icon: 'restaurant', text: "Recomana'm un restaurant" },
    { icon: 'door_front', text: 'Com funciona el check-out?' },
    { icon: 'local_parking', text: 'Hi ha aparcament?' },
  ],
  ar: [
    { icon: 'wifi', text: 'ما هي كلمة مرور الواي فاي؟' },
    { icon: 'restaurant', text: 'أوصِ بمطعم' },
    { icon: 'door_front', text: 'كيف تتم عملية المغادرة؟' },
    { icon: 'local_parking', text: 'هل يوجد موقف سيارات؟' },
  ],
  ru: [
    { icon: 'wifi', text: 'Какой пароль от WiFi?' },
    { icon: 'restaurant', text: 'Порекомендуй ресторан' },
    { icon: 'door_front', text: 'Как проходит выезд?' },
    { icon: 'local_parking', text: 'Есть ли парковка?' },
  ],
  uk: [
    { icon: 'wifi', text: 'Який пароль від WiFi?' },
    { icon: 'restaurant', text: 'Порекомендуй ресторан' },
    { icon: 'door_front', text: 'Як відбувається виїзд?' },
    { icon: 'local_parking', text: 'Чи є парковка?' },
  ],
  zh: [
    { icon: 'wifi', text: 'WiFi密码是多少？' },
    { icon: 'restaurant', text: '推荐一家餐厅' },
    { icon: 'door_front', text: '退房流程是怎样的？' },
    { icon: 'local_parking', text: '有停车位吗？' },
  ],
  ja: [
    { icon: 'wifi', text: 'WiFiのパスワードは何ですか？' },
    { icon: 'restaurant', text: 'おすすめのレストランを教えて' },
    { icon: 'door_front', text: 'チェックアウトの手順は？' },
    { icon: 'local_parking', text: '駐車場はありますか？' },
  ],
  ko: [
    { icon: 'wifi', text: '와이파이 비밀번호가 뭔가요?' },
    { icon: 'restaurant', text: '레스토랑을 추천해 주세요' },
    { icon: 'door_front', text: '체크아웃 절차가 어떻게 되나요?' },
    { icon: 'local_parking', text: '주차 공간이 있나요?' },
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
    ar: `أهلاً بك${n ? ' — ' + n : ''}! أنا مساعدك الافتراضي. اسألني عن الشقة، الواي فاي، تسجيل المغادرة أو التوصيات المحلية.`,
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
    ar: `بالمناسبة، هل رأيت "${itemName}"؟ يمكنك الاطلاع عليه في التطبيق.`,
    ru: `Кстати, вы уже видели «${itemName}»? Посмотрите в приложении.`,
    uk: `До речі, ви вже бачили «${itemName}»? Погляньте в застосунку.`,
    zh: `对了，你看过"${itemName}"吗？可以在应用里查看。`,
    ja: `ところで「${itemName}」はもうご覧になりましたか？アプリ内でチェックできます。`,
    ko: `그런데 "${itemName}" 보셨나요? 앱에서 확인하실 수 있어요.`,
  };
  return templates[lang] || templates.es;
}

export default function ChatIASection({
  lang, apartmentId, apartmentName,
  restaurants = [], pois = [], experiences = [], storeItems = [],
  buildRestaurantUrl, onNavigateTab,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const historyRef = useRef<ChatMessage[]>([]);
  const quickActions = QUICK_ACTIONS_BY_LANG[lang] || QUICK_ACTIONS_BY_LANG.es;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <button
          key={idx}
          onClick={() => onNavigateTab?.('services')}
          className="flex items-center justify-between gap-3 bg-surface-container-low border border-on-background/10 px-4 py-3 text-left hover:border-primary transition-colors w-full"
        >
          <span className="font-label-md text-label-md text-on-background">{item.name}</span>
          <span className="font-mono-badge text-mono-badge text-primary whitespace-nowrap">{item.price_display}</span>
        </button>
      );
    }
    if (type === 'restaurant') {
      const r = restaurants.find(x => x.id === id);
      if (!r) return null;
      return (
        <button
          key={idx}
          onClick={() => onNavigateTab?.('restaurants')}
          className="flex items-center justify-between gap-3 bg-surface-container-low border border-on-background/10 px-4 py-3 text-left hover:border-primary transition-colors w-full"
        >
          <span className="font-label-md text-label-md text-on-background">{r.name}</span>
          <span className="material-symbols-outlined text-primary text-[18px]">restaurant</span>
        </button>
      );
    }
    if (type === 'experience') {
      const exp = experiences.find(x => x.id === id);
      if (!exp) return null;
      return (
        <div key={idx} className="bg-surface-container-low border border-on-background/10 px-4 py-3">
          <p className="font-label-md text-label-md text-on-background mb-2">{exp.name}</p>
          <CTAButton experience={exp} lang={lang} onIntent={() => {}} />
        </div>
      );
    }
    if (type === 'poi') {
      const poi = pois.find(x => x.id === id);
      if (!poi) return null;
      return (
        <a
          key={idx}
          href={poi.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-surface-container-low border border-on-background/10 px-4 py-3 hover:border-primary transition-colors w-full"
        >
          <span className="font-label-md text-label-md text-on-background">{poi.name}</span>
          <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
        </a>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[600px] w-full max-w-3xl mx-auto relative bg-surface">
      {/* AI Header — "AI Concierge" (Stitch): avatar en arco, título en mayúsculas */}
      <div className="text-center mb-8 shrink-0">
        <div className="w-16 h-20 arch-mask bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>spark</span>
        </div>
        <h2 className="font-display-lg text-display-lg text-primary uppercase tracking-widest mb-2">{getTranslation('chat_assistant_title', lang)}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
          {getTranslation('chat_assistant_subtitle', lang)}
        </p>
      </div>

      {/* Chat History — las burbujas redondeadas son la única excepción del
          sistema plano en esta pantalla (así lo exportó Stitch: rounded-3xl
          con borde primary, ver AI Concierge code.html). */}
      <div
        className="flex-grow overflow-y-auto flex flex-col gap-6 px-2 mb-6"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'flex-col'}`}
          >
            <div className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.sender === 'ai' ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>spark</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex-shrink-0 overflow-hidden mt-1 flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
                </div>
              )}

              <div
                className={`p-4 rounded-3xl border text-body-md font-body-md ${
                  msg.sender === 'user'
                    ? 'bg-primary border-primary text-on-primary rounded-tr-sm'
                    : 'bg-surface-container-lowest border-primary/20 text-on-surface rounded-tl-sm'
                }`}
              >
                {msg.text || (msg.streaming && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                ))}
                {msg.streaming && msg.text && (
                  <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>

            {msg.recs && msg.recs.length > 0 && (
              <div className="flex flex-col gap-2 pl-11 max-w-full">
                {msg.recs.map((ref, i) => renderRec(ref, i))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-surface pb-2">
        {/* Quick Action Chips — mono-badge en mayúsculas, pill outline (la
            píldora es la otra excepción explícita de esta pantalla) */}
        <div className="flex overflow-x-auto gap-2 pb-4 hide-scrollbar">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(action.text)}
              disabled={isLoading}
              className="whitespace-nowrap px-4 py-2 rounded-full border border-on-background/15 bg-surface-container-lowest text-on-surface-variant font-mono-badge text-mono-badge uppercase hover:border-primary hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
              {action.text}
            </button>
          ))}
        </div>

        {/* Text Input */}
        <div className="relative bg-surface-container-low rounded-full p-2 flex items-center transition-colors focus-within:bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 px-4 py-3 outline-none"
            placeholder={getTranslation('chat_placeholder', lang)}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(inputValue)}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors ml-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined">send</span>
            )}
          </button>
        </div>

        {/* AI disclaimer */}
        <p className="text-center font-label-sm text-label-sm text-on-surface-variant/50 mt-3">
          {getTranslation('chat_disclaimer', lang)}
        </p>
      </div>
    </div>
  );
}
