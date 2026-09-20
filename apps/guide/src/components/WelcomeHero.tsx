import { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { LanguageSwitcher } from './Header';
import PhotoFigure from './PhotoFigure';

interface WelcomeHeroProps {
  apartmentName: string;
  address?: string;
  coverImageUrl?: string;
  agencyLogoUrl?: string;
  agencyName?: string;
  currentLang: string;
  onLanguageChange?: (lang: string) => void;
}

// Arriba de Casa: la marca de la agencia y el idioma, la foto del piso en un arco con contorno de arena,
// y debajo el nombre, la dirección y «Ver dirección». Sin foto, el arco lleva la inicial del piso.
export default function WelcomeHero({
  apartmentName,
  address,
  coverImageUrl,
  agencyLogoUrl,
  agencyName,
  currentLang,
  onLanguageChange,
}: WelcomeHeroProps) {
  const openMap = () => {
    if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
    }
  };
  const [logoFailed, setLogoFailed] = useState(false);
  const initial = (agencyName || apartmentName || '·').trim().charAt(0).toUpperCase();

  return (
    <header>
      <div className="g-top">
        <div className="g-mark">
          {agencyLogoUrl && !logoFailed ? (
            <img className="g-logo-img" src={agencyLogoUrl} alt="" onError={() => setLogoFailed(true)} />
          ) : (
            <span className="g-logo" aria-hidden="true">{initial}</span>
          )}
          {agencyName && <span className="g-agency">{agencyName}</span>}
        </div>
        <LanguageSwitcher lang={currentLang} onLanguageChange={onLanguageChange} />
      </div>

      <PhotoFigure className="g-arch" src={coverImageUrl} alt={apartmentName} name={apartmentName} eager />

      <div className="g-name">
        <h1 className="g-h1">{apartmentName}</h1>
        {address && (
          <>
            <p className="g-addr">{address}</p>
            <button type="button" className="g-link" onClick={openMap}>
              {getTranslation('view_address', currentLang)}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
