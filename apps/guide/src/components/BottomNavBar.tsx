import { getTranslation } from '../lib/i18n';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
}

// Cinco pestañas, solo texto. Las etiquetas son las cortas (nav_*) porque caben en un quinto de 320 px;
// la activa lleva el trazo de la marca arriba y aria-current="page". Sin iconos: es una decisión de diseño.
export default function BottomNavBar({ activeTab, onTabChange, lang }: BottomNavBarProps) {
  const tabs: Array<{ id: TabKey; label: string }> = [
    { id: 'info', label: getTranslation('tab_info', lang) },
    { id: 'discover', label: getTranslation('nav_discover', lang) },
    { id: 'restaurants', label: getTranslation('nav_restaurants', lang) },
    { id: 'services', label: getTranslation('tab_services', lang) },
    { id: 'chat', label: getTranslation('nav_chat', lang) },
  ];

  return (
    <nav className="g-nav" aria-label={getTranslation('nav_label', lang)}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`g-navb${isActive ? ' on' : ''}`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
