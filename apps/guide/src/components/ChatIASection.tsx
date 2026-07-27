import React, { useState, useRef, useEffect } from 'react';
import { getTranslation } from '../lib/i18n';
import { sendChatMessage, type ChatMessage } from '../lib/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  streaming?: boolean;
}

interface ChatIASectionProps {
  lang: string;
  apartmentId?: string;
  apartmentName?: string;
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

export default function ChatIASection({ lang, apartmentId, apartmentName }: ChatIASectionProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: getWelcomeMessage(lang, apartmentName),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // History for RAG context (only role/content, not display metadata)
  const historyRef = useRef<ChatMessage[]>([]);

  const quickActions = QUICK_ACTIONS_BY_LANG[lang] || QUICK_ACTIONS_BY_LANG.es;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Add user message to history
    historyRef.current = [
      ...historyRef.current,
      { role: 'user' as const, content: text.trim() },
    ].slice(-10);

    // Create streaming AI message placeholder
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      streaming: true,
    }]);

    let fullResponse = '';

    if (!apartmentId) {
      // No apartmentId: show a friendly demo message
      setTimeout(() => {
        const demoText = getTranslation('chat_loading_demo', lang);
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: demoText, streaming: false } : m
        ));
        setIsLoading(false);
      }, 800);
      return;
    }

    await sendChatMessage(
      apartmentId,
      text.trim(),
      historyRef.current.slice(0, -1), // history without the just-added user msg
      lang,
      (token) => {
        fullResponse += token;
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: fullResponse } : m
        ));
      },
      () => {
        // Stream done
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, streaming: false } : m
        ));
        // Add AI response to history
        if (fullResponse.trim()) {
          historyRef.current = [
            ...historyRef.current,
            { role: 'assistant' as const, content: fullResponse.trim() },
          ].slice(-10);
        }
        setIsLoading(false);
        inputRef.current?.focus();
      }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[600px] w-full max-w-3xl mx-auto relative bg-surface">
      {/* AI Header */}
      <div className="text-center mb-8 shrink-0">
        <div className="w-16 h-16 bg-warm-sand rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0px_4px_20px_rgba(201,109,75,0.08)]">
          <span className="material-symbols-outlined text-terracotta text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>spark</span>
        </div>
        <h2 className="text-headline-md font-headline-md text-deep-sea mb-2">{getTranslation('chat_assistant_title', lang)}</h2>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-md mx-auto">
          {getTranslation('chat_assistant_subtitle', lang)}
        </p>
      </div>

      {/* Chat History */}
      <div
        className="flex-grow overflow-y-auto flex flex-col gap-6 px-2 mb-6"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : ''}`}
          >
            {msg.sender === 'ai' ? (
              <div className="w-8 h-8 rounded-full bg-warm-sand flex-shrink-0 flex items-center justify-center mt-1">
                <span className="material-symbols-outlined text-terracotta text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>spark</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex-shrink-0 overflow-hidden mt-1 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
              </div>
            )}

            <div
              className={`p-4 rounded-2xl shadow-sm text-body-md font-body-md ${
                msg.sender === 'user'
                  ? 'bg-terracotta text-crisp-white rounded-tr-sm'
                  : 'bg-crisp-white text-on-surface rounded-tl-sm shadow-[0px_4px_20px_rgba(201,109,75,0.08)]'
              }`}
            >
              {msg.text || (msg.streaming && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-terracotta rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-terracotta rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-terracotta rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              ))}
              {/* Streaming cursor */}
              {msg.streaming && msg.text && (
                <span className="inline-block w-0.5 h-4 bg-terracotta ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-surface pb-2">
        {/* Quick Action Chips */}
        <div className="flex overflow-x-auto gap-3 pb-4" style={{ scrollbarWidth: 'none' }}>
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(action.text)}
              disabled={isLoading}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-deep-sea/10 text-deep-sea text-label-sm font-label-sm border border-deep-sea/20 hover:bg-deep-sea/20 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
              {action.text}
            </button>
          ))}
        </div>

        {/* Text Input */}
        <div className="relative bg-warm-sand rounded-xl p-2 flex items-center shadow-inner transition-colors focus-within:bg-crisp-white focus-within:ring-1 focus-within:ring-deep-sea">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none focus:ring-0 text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/60 px-4 py-3 outline-none"
            placeholder={getTranslation('chat_placeholder', lang)}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(inputValue)}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="w-12 h-12 rounded-lg bg-terracotta text-crisp-white flex items-center justify-center hover:bg-surface-tint transition-colors ml-2 shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-crisp-white/40 border-t-crisp-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined">send</span>
            )}
          </button>
        </div>

        {/* AI disclaimer */}
        <p className="text-center text-label-sm font-label-sm text-on-surface-variant/50 mt-3">
          {getTranslation('chat_disclaimer', lang)}
        </p>
      </div>
    </div>
  );
}
