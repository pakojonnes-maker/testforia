import { getTranslation } from '../../lib/i18n';
import { LanguageSwitcher } from '../Header';
import CategoryChipRail from './CategoryChipRail';
import ExperienceToggles from './ExperienceToggles';

interface ExploreTopBarProps {
  lang: string;
  onLanguageChange?: (lang: string) => void;
  cityName: string;
  isHomeZone: boolean;
  homeCityName: string;
  onOpenSearch: () => void;
  onGoHome: () => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  /** Los chips de categoría se esconden hasta que el huésped pulsa «Filtros»: no deben ensuciar el mapa por defecto. */
  filtersOpen: boolean;
  onToggleFilters: () => void;
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
}

// Lo que flota sobre el mapa: la cápsula de búsqueda («A dónde» + la ciudad + «Filtros»), el idioma, los dos
// conmutadores y, si se piden, los chips de categoría. Cuando se mira otra ciudad, una pastilla con el nombre
// de la ciudad base devuelve al huésped a «su zona».
export default function ExploreTopBar({
  lang, onLanguageChange, cityName, isHomeZone, homeCityName, onOpenSearch, onGoHome,
  categories, activeCategory, onCategoryChange, filtersOpen, onToggleFilters,
  free, paid, onToggleFree, onTogglePaid,
}: ExploreTopBarProps) {
  return (
    <div className="g-mtop">
      <div className="g-mrow">
        <div className="g-search2">
          <button type="button" className="g-where" onClick={onOpenSearch}>
            <span>{getTranslation('explore_where_to', lang)}</span>
            <b>{cityName}</b>
          </button>
          <button type="button" className={`g-tune${filtersOpen ? ' on' : ''}`} aria-pressed={filtersOpen} onClick={onToggleFilters}>
            {getTranslation('explore_filters', lang)}
          </button>
        </div>
        <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} variant="floating" />
      </div>
      <div className="g-mrow2">
        {!isHomeZone && (
          <button type="button" className="g-chip" onClick={onGoHome} aria-label={`${getTranslation('explore_home_city_badge', lang)}: ${homeCityName}`}>
            {homeCityName}
          </button>
        )}
        <ExperienceToggles free={free} paid={paid} onToggleFree={onToggleFree} onTogglePaid={onTogglePaid} lang={lang} />
      </div>
      {filtersOpen && categories.length > 0 && (
        <CategoryChipRail categories={categories} active={activeCategory} onChange={onCategoryChange} lang={lang} />
      )}
    </div>
  );
}
