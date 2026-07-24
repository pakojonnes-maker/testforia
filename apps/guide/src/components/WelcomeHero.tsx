import React from 'react';
import { getTranslation } from '../lib/i18n';

interface WelcomeHeroProps {
  apartmentName: string;
  address?: string;
  coverImageUrl?: string;
  agencyLogoUrl?: string; // Kept for backwards compatibility if needed elsewhere
  agencyName?: string;
  currentLang: string;
  onLanguageChange: (lang: string) => void;
  brandPrimaryColor?: string;
}

export default function WelcomeHero({
  apartmentName,
  address,
  coverImageUrl,
  currentLang
}: WelcomeHeroProps) {
  // Use provided cover image or a placeholder if missing
  const bgImage = coverImageUrl || 'https://placehold.co/1200x800/e5e2dd/55433d?text=No+Image';

  const handleVerDireccion = () => {
    if (address) {
      const q = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }
  };

  return (
    <section className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-[0px_4px_20px_rgba(201,109,75,0.08)]">
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: `url('${bgImage}')` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-deep-sea/80 via-transparent to-transparent"></div>
      
      <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full text-crisp-white">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-headline-lg-mobile md:text-display-lg font-headline-lg-mobile md:font-display-lg mb-2">
              {apartmentName}
            </h2>
            {address && (
              <p className="flex items-center gap-2 text-body-md font-body-md opacity-90">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  location_on
                </span>
                {address}
              </p>
            )}
          </div>
          <button onClick={handleVerDireccion} className="bg-crisp-white text-terracotta px-6 py-3 rounded-full font-label-lg text-label-lg shadow-md hover:bg-warm-sand transition-colors hidden md:block">
            {getTranslation('view_address', currentLang)}
          </button>
        </div>
      </div>
    </section>
  );
}
