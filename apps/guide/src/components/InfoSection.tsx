import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
import EntryCodeModal from './EntryCodeModal';
import PhonesModal, { PhoneEntry } from './PhonesModal';
import GuideDetailModal, { type InfoItem } from './GuideDetailModal';

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

  // El modal de código de entrada solo aporta algo cuando el anfitrión ha
  // rellenado dónde recogerlo, sus coordenadas o una foto (migración 0084) —
  // si no, la fila se queda como código + copiar, sin abrir un modal vacío.
  const doorCodeHasPickupInfo = !!(doorCodeItem?.pickup_instructions || (doorCodeItem?.latitude != null && doorCodeItem?.longitude != null) || doorCodeItem?.media?.[0]?.url);
  const hasQuickAccessGroup = !!wifiItem || !!doorCodeItem || phones.length > 0;

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Grupo WiFi + Código de Entrada + Teléfonos — una sola tarjeta con filas
          apiladas separadas por hairline (como NETWORK/ENTRY CODE/HOUSE MANUAL
          en Stitch), justo debajo del hero. El WiFi va destacado (fondo de
          color) porque es lo primero que busca el huésped al llegar; los demás
          quedan como filas planas dentro del mismo borde. */}
      {hasQuickAccessGroup && (
        <div className="border border-on-background/10">
          {wifiItem && (
            <div className="bg-primary text-on-primary p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: "'FILL' 1"}}>wifi</span>
                <div className="min-w-0">
                  <p className="font-label-caps text-label-caps uppercase opacity-80">{getTranslation('connectivity', lang)}</p>
                  <p className="font-mono-badge text-[14px] whitespace-pre-wrap break-words">{wifiItem.content}</p>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(wifiItem.content, 'wifi')}
                className="p-2 hover:bg-on-primary/10 transition-colors flex items-center gap-1 shrink-0"
                aria-label={getTranslation('copy_btn', lang)}
              >
                {copiedKey === 'wifi' && <span className="font-label-sm text-label-sm">{getTranslation('copied', lang)}</span>}
                <span className="material-symbols-outlined text-[20px]">{copiedKey === 'wifi' ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          )}

          {doorCodeItem && (
            <div
              className={`p-4 flex items-center justify-between ${wifiItem ? 'border-t border-on-background/10' : ''}`}
              onClick={doorCodeHasPickupInfo ? () => setShowEntryCodeModal(true) : undefined}
              role={doorCodeHasPickupInfo ? 'button' : undefined}
              style={doorCodeHasPickupInfo ? { cursor: 'pointer' } : undefined}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>door_front</span>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">{getTranslation('door_code_title', lang)}</p>
                  <p className="font-mono-badge text-[16px] text-on-background tracking-widest">{doorCodeItem.content}</p>
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
                {doorCodeHasPickupInfo && (
                  <span className="material-symbols-outlined text-primary text-[20px] icon-directional">chevron_right</span>
                )}
              </div>
            </div>
          )}

          {phones.length > 0 && (
            <div
              className={`p-4 flex items-center justify-between cursor-pointer ${(wifiItem || doorCodeItem) ? 'border-t border-on-background/10' : ''}`}
              onClick={() => setShowPhonesModal(true)}
              role="button"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>call</span>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">{getTranslation('phones_title', lang)}</p>
              </div>
              <span className="material-symbols-outlined text-primary text-[20px] icon-directional">chevron_right</span>
            </div>
          )}
        </div>
      )}

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

      {showPhonesModal && (
        <PhonesModal phones={phones} lang={lang} onClose={() => setShowPhonesModal(false)} />
      )}

      {/* House Manual grid — arch-masked images, eyebrow key + headline */}
      {remainingGrid.length > 0 && (
        <section>
          <h3 className="font-display-lg text-headline-lg md:text-display-lg text-on-background uppercase tracking-wide mb-stack-md">
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
              {/* Centrado en móvil (a petición): en una columna estrecha, texto a la
                  izquierda + botón también a la izquierda quedaba descompensado
                  contra la imagen ancha de arriba. En escritorio se mantiene el
                  reparto original (texto a la izquierda, botón al final). */}
              <div className="flex flex-col items-center text-center gap-4 md:flex-row md:items-end md:justify-between md:text-left">
                <div>
                  {eyebrowFor(featuredItem) && (
                    <span className="font-mono-badge text-mono-badge uppercase text-primary mb-2 block">{eyebrowFor(featuredItem)}</span>
                  )}
                  <h4 className="font-display-lg text-display-lg text-on-background">{featuredItem.title}</h4>
                </div>
                <button className="text-primary border border-primary px-6 py-2.5 font-label-caps text-label-caps uppercase hover:bg-primary hover:text-on-primary transition-colors w-fit shrink-0">
                  {getTranslation('show_more', lang)}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {selectedItem && (
        <GuideDetailModal
          item={selectedItem}
          image={imageFor(selectedItem)}
          eyebrow={eyebrowFor(selectedItem)}
          lang={lang}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
