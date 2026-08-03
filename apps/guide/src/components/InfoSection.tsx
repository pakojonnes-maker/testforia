import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
import EntryCodeModal from './EntryCodeModal';
import PhonesModal, { PhoneEntry } from './PhonesModal';

interface InfoItem {
  id: string;
  key: string;
  category?: string | null;
  icon: string;
  color?: string | null;
  title: string;
  // The category's generic translated name (e.g. "Lavadora"). Only shown as an
  // eyebrow above the headline when it differs from `title` — i.e. the host
  // wrote a custom title on top of the category. See workerGuide.js.
  category_name?: string | null;
  content: string;
  media: any[];
  category_image_url?: string | null;
  // Punto de recogida opcional (migración 0084) — hoy solo lo rellena el admin
  // para door_code, pero el campo es genérico a nivel de item.
  pickup_instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_sequential?: boolean;
  steps?: Array<{
    id: string;
    step_number: number;
    title: string;
    content: string;
    media: Array<{url: string}>;
    checklist_items?: string[];
  }>;
}

interface InfoSectionProps {
  infoItems: InfoItem[];
  phones?: PhoneEntry[];
  lang: string;
}

export default function InfoSection({ infoItems, phones = [], lang }: InfoSectionProps) {
  const [selectedItem, setSelectedItem] = useState<InfoItem | null>(null);
  const [showEntryCodeModal, setShowEntryCodeModal] = useState(false);
  const [showPhonesModal, setShowPhonesModal] = useState(false);
  // Tracks which copy button just succeeded so it can show a "Copiado!" confirmation —
  // without this, tapping copy on a WiFi password or door code gave zero feedback.
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
      })
      .catch(() => {});
  };

  if (infoItems.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl opacity-30">info</span>
        <p className="mt-2 font-body-md text-body-md">{getTranslation('no_info', lang)}</p>
      </div>
    );
  }

  // Eyebrow only makes sense when the host wrote a custom title ON TOP OF the
  // category (e.g. category "Lavadora", custom title "Lavadora — planta baja")
  // — otherwise category_name and title are the same string and showing both
  // would just repeat the same word. Previously this eyebrow was the raw,
  // untranslated `key` (e.g. "APPLIANCES") sitting above the translated title;
  // see migration 0083.
  const eyebrowFor = (item: InfoItem) => (item.category_name && item.category_name !== item.title) ? item.category_name : null;
  // Apartment's own photo wins; otherwise fall back to the category's shared
  // stock image (still empty for most categories at launch — MediaPlaceholder
  // below covers that case same as always).
  const imageFor = (item: InfoItem) => item.media?.[0]?.url || item.category_image_url || undefined;

  const wifiItem = infoItems.find(item => item.key.toLowerCase() === 'wifi');
  const doorCodeItem = infoItems.find(item => item.key.toLowerCase() === 'door_code');
  const guideItems = infoItems.filter(item => item.key.toLowerCase() !== 'wifi' && item.key.toLowerCase() !== 'door_code');
  const gridItems = guideItems.slice(0, -1);
  const featuredItem = guideItems.length > 4 ? guideItems[guideItems.length - 1] : null;
  const remainingGrid = featuredItem ? gridItems : guideItems;

  return (
    <div className="flex flex-col gap-stack-lg">
      {doorCodeItem && (() => {
        // El modal solo aporta algo cuando el anfitrión ha rellenado dónde
        // recogerlo, sus coordenadas o una foto (migración 0084) — si no, la
        // fila se queda exactamente como antes (código + copiar), sin abrir
        // un modal vacío.
        const hasPickupInfo = !!(doorCodeItem.pickup_instructions || (doorCodeItem.latitude != null && doorCodeItem.longitude != null) || doorCodeItem.media?.[0]?.url);
        return (
          <div
            className="bg-primary/5 border border-primary/25 p-4 flex items-center justify-between"
            onClick={hasPickupInfo ? () => setShowEntryCodeModal(true) : undefined}
            role={hasPickupInfo ? 'button' : undefined}
            style={hasPickupInfo ? { cursor: 'pointer' } : undefined}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>door_front</span>
              <div>
                <p className="font-label-caps text-label-caps text-primary uppercase">{getTranslation('door_code_title', lang)}</p>
                <p className="font-mono-badge text-[20px] text-on-background tracking-widest">{doorCodeItem.content}</p>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={e => { e.stopPropagation(); copyToClipboard(doorCodeItem.content, 'door_code'); }}
                className="p-2 hover:bg-primary/10 transition-colors flex items-center gap-1"
                aria-label={getTranslation('copy_btn', lang)}
              >
                {copiedKey === 'door_code' && (
                  <span className="font-label-sm text-label-sm text-primary">{getTranslation('copied', lang)}</span>
                )}
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {copiedKey === 'door_code' ? 'check' : 'content_copy'}
                </span>
              </button>
              {hasPickupInfo && (
                <span className="material-symbols-outlined text-primary text-[20px] icon-directional">chevron_right</span>
              )}
            </div>
          </div>
        );
      })()}

      {showEntryCodeModal && doorCodeItem && (
        <EntryCodeModal
          code={doorCodeItem.content}
          pickupInstructions={doorCodeItem.pickup_instructions}
          latitude={doorCodeItem.latitude}
          longitude={doorCodeItem.longitude}
          image={doorCodeItem.media?.[0]?.url}
          lang={lang}
          onClose={() => setShowEntryCodeModal(false)}
        />
      )}

      {/* Teléfonos (migración 0084) — mismo nivel que WiFi/Código de Entrada,
          solo aparece si el anfitrión ha configurado al menos uno. */}
      {phones.length > 0 && (
        <div
          className="bg-primary/5 border border-primary/25 p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setShowPhonesModal(true)}
          role="button"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>call</span>
            <p className="font-label-caps text-label-caps text-primary uppercase">{getTranslation('phones_title', lang)}</p>
          </div>
          <span className="material-symbols-outlined text-primary text-[20px] icon-directional">chevron_right</span>
        </div>
      )}

      {showPhonesModal && (
        <PhonesModal phones={phones} lang={lang} onClose={() => setShowPhonesModal(false)} />
      )}

      {/* House Manual grid — arch-masked images, eyebrow key + headline */}
      {remainingGrid.length > 0 && (
        <section>
          <h3 className="font-display-lg text-headline-lg md:text-display-lg text-on-background mb-stack-md">
            {getTranslation('quick_guides', lang)}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-gutter gap-y-stack-md">
            {remainingGrid.map(item => {
              const itemImg = imageFor(item);
              const eyebrow = eyebrowFor(item);
              return (
                <div
                  key={item.id}
                  className="flex flex-col group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="w-full aspect-[4/5] arch-mask overflow-hidden border border-on-background/10 mb-2 relative bg-surface-variant">
                    {isRealImage(itemImg) ? (
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={itemImg}
                        alt={item.title}
                      />
                    ) : (
                      <MediaPlaceholder label={item.title} />
                    )}
                  </div>
                  {eyebrow && <span className="font-mono-badge text-mono-badge uppercase text-secondary mb-1">{eyebrow}</span>}
                  <h4 className="font-headline-md text-[18px] leading-tight text-on-background">{item.title}</h4>
                </div>
              );
            })}
          </div>

          {/* Featured guide — wide arch banner, matches the "Pool & Filtration" treatment */}
          {featuredItem && (
            <div
              className="flex flex-col group cursor-pointer mt-stack-md border-t border-on-background/10 pt-stack-md"
              onClick={() => setSelectedItem(featuredItem)}
            >
              {/* Banner apaisado: un arco de verdad no encaja en un recorte 16:9,
                  así que usa un radio pequeño de Tailwind en vez de .arch-mask. */}
              <div className="w-full aspect-[16/9] rounded-t-[64px] overflow-hidden border border-on-background/10 mb-4 relative bg-surface-variant">
                {isRealImage(imageFor(featuredItem)) ? (
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={imageFor(featuredItem)}
                    alt={featuredItem.title}
                  />
                ) : (
                  <MediaPlaceholder label={featuredItem.title} />
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  {eyebrowFor(featuredItem) && (
                    <span className="font-mono-badge text-mono-badge uppercase text-primary mb-2 block">{eyebrowFor(featuredItem)}</span>
                  )}
                  <h4 className="font-display-lg text-display-lg text-on-background">{featuredItem.title}</h4>
                </div>
                <button className="text-primary border border-primary px-4 py-2 font-label-caps text-label-caps uppercase hover:bg-primary hover:text-on-primary transition-colors w-fit shrink-0">
                  {getTranslation('show_more', lang)}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* WiFi */}
      {wifiItem && (
        <section>
          <h3 className="font-display-lg text-headline-lg md:text-display-lg text-on-background mb-stack-md">
            {getTranslation('connectivity', lang)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="bg-surface-container-lowest border border-on-background/10 p-6 flex flex-col justify-between h-40">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">wifi</span>
                <h4 className="font-label-caps text-label-caps uppercase text-on-surface-variant">{wifiItem.title}</h4>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">{getTranslation('network_password_label', lang)}</p>
                  <p className="font-mono-badge text-[15px] text-on-background whitespace-pre-wrap">{wifiItem.content}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(wifiItem.content, 'wifi')}
                  className="p-2 border border-on-background/10 text-primary hover:border-primary transition-colors flex items-center gap-1"
                  title={getTranslation('copy_btn', lang)}
                >
                  {copiedKey === 'wifi' && (
                    <span className="font-label-sm text-label-sm">{getTranslation('copied', lang)}</span>
                  )}
                  <span className="material-symbols-outlined text-[20px]">
                    {copiedKey === 'wifi' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal Popup for Details */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-background/60 animate-[fadeIn_0.2s_ease]"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-surface-container-lowest border border-on-background/10 w-full max-w-lg overflow-hidden animate-[slideUp_0.3s_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-64 md:h-80">
              {isRealImage(imageFor(selectedItem)) ? (
                <img
                  src={imageFor(selectedItem)}
                  className="w-full h-full object-cover"
                  alt={selectedItem.title}
                />
              ) : (
                <MediaPlaceholder label={selectedItem.title} />
              )}
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-on-background/50 text-crisp-white flex items-center justify-center hover:bg-on-background/70 transition-colors"
                onClick={() => setSelectedItem(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-transparent to-transparent pointer-events-none" />
              <h3 className="absolute bottom-6 left-6 right-6 font-headline-md text-headline-md text-crisp-white">
                {selectedItem.title}
              </h3>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {selectedItem.is_sequential && selectedItem.steps && selectedItem.steps.length > 0 ? (
                <div>
                  {selectedItem.steps.map(step => (
                    <div key={step.id} className="flex gap-4 mb-6">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-on-primary flex items-center justify-center font-mono-badge text-mono-badge">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-label-caps text-label-caps uppercase text-on-background mb-1">{step.title}</h4>
                        <p className="font-body-md text-body-md text-on-surface-variant">{step.content}</p>
                        {step.media?.[0] && <img src={step.media[0].url} className="mt-3 w-full object-cover max-h-48 border border-on-background/10" alt={step.title} />}
                        {step.checklist_items && step.checklist_items.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {step.checklist_items.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {selectedItem.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
