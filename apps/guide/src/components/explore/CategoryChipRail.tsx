import { getTranslation, getCategoryLabel } from '../../lib/i18n';

interface CategoryChipRailProps {
  /** Categorías en bruto de la zona activa, ya en orden canónico — ver useExploreState. */
  categories: string[];
  active: string; // 'all' o una categoría
  onChange: (category: string) => void;
  lang: string;
}

// Chips de texto: sin el icono de cada categoría. Se ven al pulsar «Filtros».
export default function CategoryChipRail({ categories, active, onChange, lang }: CategoryChipRailProps) {
  const items = ['all', ...categories];
  return (
    <div className="g-chips hide-scrollbar" data-no-tab-swipe>
      {items.map(cat => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          aria-pressed={cat === active}
          className={`g-chip${cat === active ? ' on' : ''}`}
        >
          {cat === 'all' ? getTranslation('filter_all', lang) : getCategoryLabel(cat, lang)}
        </button>
      ))}
    </div>
  );
}
