import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';

interface InfoItem {
  id: string;
  key: string;
  icon: string;
  title: string;
  content: string;
  media: any[];
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
  lang: string;
}

export default function InfoSection({ infoItems, lang }: InfoSectionProps) {
  const [selectedItem, setSelectedItem] = useState<InfoItem | null>(null);
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

  const wifiItem = infoItems.find(item => item.key.toLowerCase() === 'wifi');
  const doorCodeItem = infoItems.find(item => item.key.toLowerCase() === 'door_code');
  const guideItems = infoItems.filter(item => item.key.toLowerCase() !== 'wifi' && item.key.toLowerCase() !== 'door_code');
  const gridItems = guideItems.slice(0, -1);
  const featuredItem = guideItems.length > 4 ? guideItems[guideItems.length - 1] : null;
  const remainingGrid = featuredItem ? gridItems : guideItems;

  return (
    <div className="flex flex-col gap-stack-lg">
      {doorCodeItem && (
        <div className="bg-primary/5 border border-primary/25 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>door_front</span>
            <div>
              <p className="font-label-caps text-label-caps text-primary uppercase">{getTranslation('door_code_title', lang)}</p>
              <p className="font-mono-badge text-[20px] text-on-background tracking-widest">{doorCodeItem.content}</p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(doorCodeItem.content, 'door_code')}
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
        </div>
      )}

      {/* House Manual grid — arch-masked images, eyebrow key + headline */}
      {remainingGrid.length > 0 && (
        <section>
          <h3 className="font-display-lg text-headline-lg md:text-display-lg text-on-background mb-stack-md">
            {getTranslation('quick_guides', lang)}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-gutter gap-y-stack-md">
            {remainingGrid.map(item => {
              const itemImg = item.media?.[0]?.url;
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
                  <span className="font-mono-badge text-mono-badge uppercase text-secondary mb-1">{item.key}</span>
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
                {isRealImage(featuredItem.media?.[0]?.url) ? (
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={featuredItem.media?.[0]?.url}
                    alt={featuredItem.title}
                  />
                ) : (
                  <MediaPlaceholder label={featuredItem.title} />
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-mono-badge text-mono-badge uppercase text-primary mb-2 block">{featuredItem.key}</span>
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
              {isRealImage(selectedItem.media?.[0]?.url) ? (
                <img
                  src={selectedItem.media?.[0]?.url}
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
