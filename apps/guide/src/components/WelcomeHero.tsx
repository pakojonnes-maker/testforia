import React from 'react';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';

interface WelcomeHeroProps {
  apartmentName: string;
  address?: string;
  coverImageUrl?: string;
  agencyLogoUrl?: string;
  agencyName?: string;
  currentLang: string;
}

// "Home & House Manual" (Stitch) hero: arch-masked image, horizon rule, then
// name/address as a separate editorial block below — not overlaid as text on
// the photo, which is the "Mediterranean Horizon" pattern this replaces.
export default function WelcomeHero({
  apartmentName,
  address,
  coverImageUrl,
  agencyLogoUrl,
  agencyName,
  currentLang
}: WelcomeHeroProps) {
  const handleVerDireccion = () => {
    if (address) {
      const q = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }
  };

  return (
    <section className="flex flex-col gap-stack-md">
      <div className="w-full flex justify-center">
        <div className="relative w-full md:w-10/12 aspect-[3/4] md:aspect-video arch-mask overflow-hidden border border-on-background/10 bg-surface-variant">
          {isRealImage(coverImageUrl) ? (
            <img
              className="w-full h-full object-cover absolute inset-0"
              src={coverImageUrl}
              alt={apartmentName}
            />
          ) : (
            <MediaPlaceholder label={apartmentName} className="absolute inset-0" />
          )}
          {agencyLogoUrl && (
            <div className="absolute top-4 right-4 bg-surface-container-lowest border border-on-background/10 p-2">
              <img
                src={agencyLogoUrl}
                alt={agencyName || ''}
                className="h-8 md:h-10 max-w-[120px] object-contain"
              />
            </div>
          )}
        </div>
      </div>

      <div className="horizon-rule" />

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <h1 className="font-display-xl text-display-lg md:text-display-xl text-primary max-w-2xl">
          {apartmentName}
        </h1>
        {address && (
          <div className="flex flex-col gap-3 md:items-end shrink-0">
            <p className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                location_on
              </span>
              {address}
            </p>
            <button
              onClick={handleVerDireccion}
              className="border border-primary text-primary px-6 py-3 font-label-caps text-label-caps uppercase hover:bg-primary hover:text-on-primary transition-colors w-full md:w-auto"
            >
              {getTranslation('view_address', currentLang)}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
