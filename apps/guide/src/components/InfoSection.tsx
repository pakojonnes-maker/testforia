import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';

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

  return (
    <div className="flex flex-col gap-12">
      {doorCodeItem && (
        <div className="bg-terracotta/10 border border-terracotta/30 rounded-2xl p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-terracotta" style={{fontVariationSettings: "'FILL' 1"}}>door_front</span>
            <div>
              <p className="font-label-sm text-label-sm text-terracotta uppercase tracking-wider">{getTranslation('door_code_title', lang)}</p>
              <p className="font-headline-md text-headline-md text-deep-sea tracking-widest">{doorCodeItem.content}</p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(doorCodeItem.content, 'door_code')}
            className="p-2 rounded-full hover:bg-terracotta/10 transition-colors flex items-center gap-1"
            aria-label={getTranslation('copy_btn', lang)}
          >
            {copiedKey === 'door_code' && (
              <span className="font-label-sm text-label-sm text-terracotta">{getTranslation('copied', lang)}</span>
            )}
            <span className="material-symbols-outlined text-terracotta text-[20px]">
              {copiedKey === 'door_code' ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
      )}

      {/* Quick Actions Grid */}
      {guideItems.length > 0 && (
        <section>
          <h3 className="text-headline-md font-headline-md text-deep-sea mb-6">{getTranslation('quick_guides', lang)}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {guideItems.map(item => {
              const bgImg = item.media?.[0]?.url || 'https://placehold.co/600x400/e5e2dd/55433d?text=' + encodeURIComponent(item.title);
              return (
                <div 
                  key={item.id} 
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <img 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    src={bgImg} 
                    alt={item.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-2">
                    <span className="font-label-md text-label-md text-white line-clamp-2 leading-tight">
                      {item.title}
                    </span>
                    <span className="material-symbols-outlined icon-directional text-white text-[18px] shrink-0">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Smart Home Controls */}
      {wifiItem && (
        <section>
          <h3 className="text-headline-md font-headline-md text-deep-sea mb-6">{getTranslation('connectivity', lang)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-crisp-white p-6 rounded-2xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] flex flex-col justify-between h-40">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-deep-sea">wifi</span>
                <h4 className="font-label-lg text-label-lg text-deep-sea">{wifiItem.title}</h4>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">{getTranslation('network_password_label', lang)}</p>
                  <p className="font-body-md text-body-md text-deep-sea font-medium whitespace-pre-wrap">{wifiItem.content}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(wifiItem.content, 'wifi')}
                  className="p-2 bg-warm-sand text-terracotta rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-1"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-[slideUp_0.3s_ease]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-64 md:h-80">
              <img 
                src={selectedItem.media?.[0]?.url || 'https://placehold.co/600x400/e5e2dd/55433d?text=' + encodeURIComponent(selectedItem.title)} 
                className="w-full h-full object-cover" 
                alt={selectedItem.title}
              />
              <button 
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm"
                onClick={() => setSelectedItem(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
              <h3 className="absolute bottom-6 left-6 right-6 text-headline-sm font-headline-sm text-white">
                {selectedItem.title}
              </h3>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {selectedItem.is_sequential && selectedItem.steps && selectedItem.steps.length > 0 ? (
                <div>
                  {selectedItem.steps.map(step => (
                    <div key={step.id} className="flex gap-4 mb-6">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-terracotta text-crisp-white flex items-center justify-center font-label-sm text-label-sm font-bold">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-label-lg text-label-lg text-deep-sea mb-1">{step.title}</h4>
                        <p className="font-body-md text-body-md text-on-surface-variant">{step.content}</p>
                        {step.media?.[0] && <img src={step.media[0].url} className="mt-3 rounded-xl w-full object-cover max-h-48" alt={step.title} />}
                        {step.checklist_items && step.checklist_items.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {step.checklist_items.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                                <span className="material-symbols-outlined text-olive text-[18px]">check_circle</span>
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
                <div className="text-body-md font-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
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
