import React from 'react';
import { getTranslation } from '../lib/i18n';
import CTAButton from './CTAButton';

interface Experience {
  id: string;
  name: string;
  description: string;
  category: string;
  service_subcategory: string | null;
  action_type: string;
  action_data: string;
  prefilled_message: string;
  price_display: string;
  is_featured: boolean;
  cta_label: string;
  cover_image_url?: string;
  discount_display?: string;
  original_price_display?: string;
  badge_type?: 'discount' | 'courtesy' | 'exclusive' | 'new';
}

interface ServicesSectionProps {
  experiences: Experience[];
  zoneName: string;
  lang: string;
  onIntent: (type: 'experience', id: string, action: string) => void;
}

export default function ServicesSection({ experiences, zoneName, lang, onIntent }: ServicesSectionProps) {
  if (!experiences || experiences.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl opacity-30">local_activity</span>
        <p className="mt-2 font-body-md text-body-md">{getTranslation('no_services', lang)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-8 md:mb-12">
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-deep-sea mb-2">
          {getTranslation('exclusive_promotions', lang)}
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant">
          {getTranslation('services_subtitle', lang).replace('{zone}', zoneName)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {experiences.map((exp, idx) => {
          const bgImg = exp.cover_image_url || 'https://placehold.co/600x400/e5e2dd/55433d?text=' + encodeURIComponent(exp.name);
          const isFeatured = exp.is_featured || idx === 0;

          if (isFeatured) {
            return (
              <article key={exp.id} className="md:col-span-8 bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col md:flex-row group transition-shadow hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)]">
                <div className="relative h-64 md:h-auto md:w-1/2 overflow-hidden">
                  <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={bgImg} alt={exp.name} />
                  {(exp.discount_display || exp.badge_type) ? (
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-label-sm font-label-sm uppercase tracking-wider backdrop-blur-sm ${
                      exp.badge_type === 'discount' || exp.discount_display ? 'bg-terracotta/90 text-crisp-white' :
                      exp.badge_type === 'courtesy' ? 'bg-deep-sea/90 text-crisp-white' :
                      exp.badge_type === 'exclusive' ? 'bg-olive/90 text-crisp-white' :
                      'bg-[#D4A853]/90 text-crisp-white'
                    }`}>
                      {exp.discount_display || (exp.badge_type === 'courtesy' ? getTranslation('badge_courtesy', lang) : exp.badge_type === 'exclusive' ? getTranslation('badge_exclusive', lang) : getTranslation('badge_new', lang))}
                    </div>
                  ) : (
                    <div className="absolute top-4 left-4 bg-terracotta/90 text-crisp-white px-3 py-1 rounded-full text-label-sm font-label-sm uppercase tracking-wider backdrop-blur-sm">
                      {getTranslation('recommended', lang)}
                    </div>
                  )}
                </div>
                <div className="p-6 md:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {exp.category && <span className="bg-deep-sea/10 text-deep-sea px-3 py-1 rounded-full text-label-sm font-label-sm">{exp.category}</span>}
                      {exp.service_subcategory && <span className="bg-olive/10 text-olive px-3 py-1 rounded-full text-label-sm font-label-sm">{exp.service_subcategory}</span>}
                    </div>
                    <h3 className="text-headline-md font-headline-md text-deep-sea mb-3">{exp.name}</h3>
                    <p className="text-body-md font-body-md text-on-surface-variant mb-6">{exp.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto gap-4">
                    <div className="flex flex-col">
                      {exp.original_price_display && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant line-through">{exp.original_price_display}</span>
                      )}
                      <span className="text-body-lg font-body-lg font-bold text-terracotta">{exp.price_display}</span>
                    </div>
                    <div className="w-auto">
                      <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent('experience', exp.id, action)} />
                    </div>
                  </div>
                </div>
              </article>
            );
          }

          return (
            <article key={exp.id} className="md:col-span-4 bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col group transition-shadow hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)]">
              <div className="relative h-48 overflow-hidden">
                <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={bgImg} alt={exp.name} />
                {(exp.discount_display || exp.badge_type) && (
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-label-sm font-label-sm uppercase tracking-wider backdrop-blur-sm ${
                    exp.badge_type === 'discount' || exp.discount_display ? 'bg-terracotta/90 text-crisp-white' :
                    exp.badge_type === 'courtesy' ? 'bg-deep-sea/90 text-crisp-white' :
                    exp.badge_type === 'exclusive' ? 'bg-olive/90 text-crisp-white' :
                    'bg-[#D4A853]/90 text-crisp-white'
                  }`}>
                    {exp.discount_display || (exp.badge_type === 'courtesy' ? getTranslation('badge_courtesy', lang) : exp.badge_type === 'exclusive' ? getTranslation('badge_exclusive', lang) : getTranslation('badge_new', lang))}
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-3">
                  {exp.category && <span className="bg-deep-sea/10 text-deep-sea px-3 py-1 rounded-full text-label-sm font-label-sm">{exp.category}</span>}
                  {exp.service_subcategory && <span className="bg-olive/10 text-olive px-3 py-1 rounded-full text-label-sm font-label-sm">{exp.service_subcategory}</span>}
                </div>
                <h3 className="text-headline-md font-headline-md text-deep-sea mb-2">{exp.name}</h3>
                <p className="text-body-md font-body-md text-on-surface-variant mb-6 line-clamp-2">{exp.description}</p>
                <div className="mt-auto flex justify-between items-center gap-4">
                  <div className="flex flex-col">
                    {exp.original_price_display && (
                      <span className="font-label-sm text-label-sm text-on-surface-variant line-through">{exp.original_price_display}</span>
                    )}
                    <span className="text-body-md font-bold text-deep-sea">{exp.price_display}</span>
                  </div>
                  <div className="flex-shrink-0">
                    <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent('experience', exp.id, action)} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}

      </div>
    </div>
  );
}
