export const UI_STRINGS: Record<string, Record<string, string>> = {
  tab_info: { es: 'Inicio', en: 'Home', fr: 'Accueil', de: 'Start', it: 'Inizio', pt: 'Início', nl: 'Home' },
  tab_discover: { es: 'Descubrir', en: 'Discover', fr: 'Découvrir', de: 'Entdecken', it: 'Scoprire', pt: 'Descobrir', nl: 'Ontdekken' },
  tab_eat: { es: 'Comer', en: 'Eat', fr: 'Manger', de: 'Essen', it: 'Mangiare', pt: 'Comer', nl: 'Eten' },
  tab_services: { es: 'Servicios', en: 'Services', fr: 'Services', de: 'Services', it: 'Servizi', pt: 'Serviços', nl: 'Diensten' },
  wifi_network: { es: 'Red', en: 'Network', fr: 'Réseau', de: 'Netzwerk', it: 'Rete', pt: 'Rede', nl: 'Netwerk' },
  wifi_password: { es: 'Contraseña', en: 'Password', fr: 'Mot de passe', de: 'Passwort', it: 'Password', pt: 'Senha', nl: 'Wachtwoord' },
  copy_btn: { es: 'Copiar', en: 'Copy', fr: 'Copier', de: 'Kopieren', it: 'Copia', pt: 'Copiar', nl: 'Kopiëren' },
  copied: { es: '¡Copiado!', en: 'Copied!', fr: 'Copié!', de: 'Kopiert!', it: 'Copiato!', pt: 'Copiado!', nl: 'Gekopieerd!' },
  directions: { es: 'Cómo llegar', en: 'Directions', fr: 'Itinéraire', de: 'Route', it: 'Indicazioni', pt: 'Direções', nl: 'Route' },
  recommended: { es: 'Recomendado', en: 'Recommended', fr: 'Recommandé', de: 'Empfohlen', it: 'Consigliato', pt: 'Recomendado', nl: 'Aanbevolen' },
  popular: { es: 'Popular', en: 'Popular', fr: 'Populaire', de: 'Beliebt', it: 'Popolare', pt: 'Popular', nl: 'Populair' },
  see_menu: { es: 'Ver carta', en: 'See menu', fr: 'Voir la carte', de: 'Speisekarte', it: 'Vedi menù', pt: 'Ver menu', nl: 'Menu bekijken' },
  book_whatsapp: { es: 'Reservar por WhatsApp', en: 'Book via WhatsApp', fr: 'Réserver par WhatsApp', de: 'Per WhatsApp buchen', it: 'Prenota via WhatsApp', pt: 'Reservar por WhatsApp', nl: 'Boeken via WhatsApp' },
  book_online: { es: 'Reservar online', en: 'Book online', fr: 'Réserver en ligne', de: 'Online buchen', it: 'Prenota online', pt: 'Reservar online', nl: 'Online boeken' },
  call_now: { es: 'Llamar ahora', en: 'Call now', fr: 'Appeler', de: 'Jetzt anrufen', it: 'Chiama ora', pt: 'Ligar agora', nl: 'Nu bellen' },
  explore_zone: { es: 'Explora', en: 'Explore', fr: 'Explorer', de: 'Erkunden', it: 'Esplora', pt: 'Explorar', nl: 'Verkennen' },
  where_to_eat: { es: 'Dónde comer', en: 'Where to eat', fr: 'Où manger', de: 'Wo essen', it: 'Dove mangiare', pt: 'Onde comer', nl: 'Waar eten' },
  activities: { es: 'Experiencias', en: 'Experiences', fr: 'Expériences', de: 'Erlebnisse', it: 'Esperienze', pt: 'Experiências', nl: 'Ervaringen' },
  loading: { es: 'Cargando tu guía...', en: 'Loading your guide...', fr: 'Chargement...', de: 'Laden...', it: 'Caricamento...', pt: 'A carregar...', nl: 'Laden...' },
  no_info: { es: 'Sin información disponible', en: 'No information available', fr: 'Aucune information', de: 'Keine Informationen', it: 'Nessuna informazione', pt: 'Sem informação', nl: 'Geen informatie' },
  show_more: { es: 'Ver más', en: 'Show more', fr: 'Voir plus', de: 'Mehr anzeigen', it: 'Mostra altro', pt: 'Ver mais', nl: 'Meer tonen' },
  show_less: { es: 'Ver menos', en: 'Show less', fr: 'Voir moins', de: 'Weniger', it: 'Meno', pt: 'Ver menos', nl: 'Minder tonen' },
};

export function getTranslation(key: string, lang: string): string {
  if (!UI_STRINGS[key]) return key;
  return UI_STRINGS[key][lang] || UI_STRINGS[key]['en'] || UI_STRINGS[key]['es'] || key;
}
