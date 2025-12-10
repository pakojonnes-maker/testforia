-- =====================================================
-- LOCALIZATION STRINGS MIGRATION
-- Poblar textos de UI para la landing page multilingüe
-- =====================================================

-- Context: landing page UI strings
-- Estos strings se usan para textos de interfaz que no son contenido del restaurante

-- ═══════════════════════════════════════
-- SECCIÓN: CONTACT
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Visit Us
  ('landing', 'contact_visit_us', 'es', 'VISÍTANOS', 'Título principal de sección contacto'),
  ('landing', 'contact_visit_us', 'en', 'VISIT US', 'Contact section main title'),
  ('landing', 'contact_visit_us', 'fr', 'NOUS RENDRE VISITE', 'Titre principal section contact'),
  ('landing', 'contact_visit_us', 'de', 'BESUCH UNS', 'Kontakt Haupttitel'),
  ('landing', 'contact_visit_us', 'it', 'VISITACI', 'Titolo principale sezione contatti'),
  ('landing', 'contact_visit_us', 'pt', 'VISITE-NOS', 'Título principal seção contato'),
  
  -- Daily
  ('landing', 'contact_daily', 'es', 'Diario', 'Horario diario'),
  ('landing', 'contact_daily', 'en', 'Daily', 'Daily schedule'),
  ('landing', 'contact_daily', 'fr', 'Quotidien', 'Horaire quotidien'),
  ('landing', 'contact_daily', 'de', 'Täglich', 'Täglicher Zeitplan'),
  ('landing', 'contact_daily', 'it', 'Giornaliero', 'Orario giornaliero'),
  ('landing', 'contact_daily', 'pt', 'Diário', 'Horário diário'),
  
  -- Booking Request
  ('landing', 'contact_booking', 'es', 'Solicitud de Reserva', 'Texto para reservas'),
  ('landing', 'contact_booking', 'en', 'Booking Request', 'Booking text'),
  ('landing', 'contact_booking', 'fr', 'Demande de Réservation', 'Texte de réservation'),
  ('landing', 'contact_booking', 'de', 'Buchungsanfrage', 'Buchungstext'),
  ('landing', 'contact_booking', 'it', 'Richiesta di Prenotazione', 'Testo prenotazione'),
  ('landing', 'contact_booking', 'pt', 'Pedido de Reserva', 'Texto de reserva'),
  
  -- Get Directions
  ('landing', 'contact_directions', 'es', 'Cómo llegar', 'Link de direcciones'),
  ('landing', 'contact_directions', 'en', 'Get directions', 'Directions link'),
  ('landing', 'contact_directions', 'fr', 'Itinéraire', 'Lien itinéraire'),
  ('landing', 'contact_directions', 'de', 'Wegbeschreibung', 'Wegbeschreibungslink'),
  ('landing', 'contact_directions', 'it', 'Come arrivare', 'Link indicazioni'),
  ('landing', 'contact_directions', 'pt', 'Como chegar', 'Link de direções'),
  
  -- Newsletter Title
  ('landing', 'contact_newsletter_title', 'es', 'Nuestro Boletín', 'Título newsletter'),
  ('landing', 'contact_newsletter_title', 'en', 'Our Newsletter', 'Newsletter title'),
  ('landing', 'contact_newsletter_title', 'fr', 'Notre Newsletter', 'Titre newsletter'),
  ('landing', 'contact_newsletter_title', 'de', 'Unser Newsletter', 'Newsletter-Titel'),
  ('landing', 'contact_newsletter_title', 'it', 'La Nostra Newsletter', 'Titolo newsletter'),
  ('landing', 'contact_newsletter_title', 'pt', 'Nossa Newsletter', 'Título newsletter'),
  
  -- Newsletter Text
  ('landing', 'contact_newsletter_text', 'es', 'Suscríbete y obtén 25% de descuento. Recibe las últimas novedades.', 'Texto promoción newsletter'),
  ('landing', 'contact_newsletter_text', 'en', 'Subscribe & Get 25% Off. Get latest updates.', 'Newsletter promo text'),
  ('landing', 'contact_newsletter_text', 'fr', 'Abonnez-vous et obtenez 25% de réduction. Recevez les dernières mises à jour.', 'Texte promo newsletter'),
  ('landing', 'contact_newsletter_text', 'de', 'Abonnieren & 25% Rabatt erhalten. Erhalten Sie die neuesten Updates.', 'Newsletter-Promo-Text'),
  ('landing', 'contact_newsletter_text', 'it', 'Iscriviti e ricevi il 25% di sconto. Ricevi gli ultimi aggiornamenti.', 'Testo promo newsletter'),
  ('landing', 'contact_newsletter_text', 'pt', 'Inscreva-se e ganhe 25% de desconto. Receba as últimas novidades.', 'Texto promo newsletter'),
  
  -- Email Placeholder
  ('landing', 'contact_newsletter_placeholder', 'es', 'Ingresa tu email', 'Placeholder input email'),
  ('landing', 'contact_newsletter_placeholder', 'en', 'Enter your email', 'Email input placeholder'),
  ('landing', 'contact_newsletter_placeholder', 'fr', 'Entrez votre email', 'Placeholder email'),
  ('landing', 'contact_newsletter_placeholder', 'de', 'Geben Sie Ihre E-Mail ein', 'E-Mail-Platzhalter'),
  ('landing', 'contact_newsletter_placeholder', 'it', 'Inserisci la tua email', 'Segnaposto email'),
  ('landing', 'contact_newsletter_placeholder', 'pt', 'Digite seu email', 'Placeholder de email'),
  
  -- Subscribe Button
  ('landing', 'contact_subscribe', 'es', 'SUSCRIBIRSE', 'Botón suscribir'),
  ('landing', 'contact_subscribe', 'en', 'SUBSCRIBE', 'Subscribe button'),
  ('landing', 'contact_subscribe', 'fr', 'S''ABONNER', 'Bouton s''abonner'),
  ('landing', 'contact_subscribe', 'de', 'ABONNIEREN', 'Abonnieren-Button'),
  ('landing', 'contact_subscribe', 'it', 'ISCRIVITI', 'Pulsante iscriviti'),
  ('landing', 'contact_subscribe', 'pt', 'INSCREVER-SE', 'Botão inscrever'),
  
  -- Closed
  ('landing', 'contact_closed', 'es', 'Cerrado', 'Estado cerrado'),
  ('landing', 'contact_closed', 'en', 'Closed', 'Closed status'),
  ('landing', 'contact_closed', 'fr', 'Fermé', 'Statut fermé'),
  ('landing', 'contact_closed', 'de', 'Geschlossen', 'Geschlossen-Status'),
  ('landing', 'contact_closed', 'it', 'Chiuso', 'Stato chiuso'),
  ('landing', 'contact_closed', 'pt', 'Fechado', 'Status fechado');

-- ═══════════════════════════════════════
-- SECCIÓN: MENU
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Menu Title
  ('landing', 'menu_title', 'es', 'Menú del Chef', 'Título sección menú'),
  ('landing', 'menu_title', 'en', 'Chef''s Menu', 'Menu section title'),
  ('landing', 'menu_title', 'fr', 'Menu du Chef', 'Titre section menu'),
  ('landing', 'menu_title', 'de', 'Menü des Chefs', 'Menüabschnittstitel'),
  ('landing', 'menu_title', 'it', 'Menu dello Chef', 'Titolo sezione menu'),
  ('landing', 'menu_title', 'pt', 'Menu do Chef', 'Título seção menu'),
  
  -- Menu Subtitle
  ('landing', 'menu_subtitle', 'es', 'Elige un menú y descubre una experiencia visual y gastronómica', 'Subtítulo menú'),
  ('landing', 'menu_subtitle', 'en', 'Choose a menu and discover a visual and gastronomic experience', 'Menu subtitle'),
  ('landing', 'menu_subtitle', 'fr', 'Choisissez un menu et découvrez une expérience visuelle et gastronomique', 'Sous-titre menu'),
  ('landing', 'menu_subtitle', 'de', 'Wählen Sie ein Menü und entdecken Sie ein visuelles und gastronomisches Erlebnis', 'Menü-Untertitel'),
  ('landing', 'menu_subtitle', 'it', 'Scegli un menu e scopri un''esperienza visiva e gastronomica', 'Sottotitolo menu'),
  ('landing', 'menu_subtitle', 'pt', 'Escolha um menu e descubra uma experiência visual e gastronômica', 'Subtítulo menu'),
  
  -- View Menu Button
  ('landing', 'menu_view_btn', 'es', 'Ver Menú', 'Botón ver menú'),
  ('landing', 'menu_view_btn', 'en', 'View Menu', 'View menu button'),
  ('landing', 'menu_view_btn', 'fr', 'Voir le Menu', 'Bouton voir menu'),
  ('landing', 'menu_view_btn', 'de', 'Menü ansehen', 'Menü ansehen Button'),
  ('landing', 'menu_view_btn', 'it', 'Vedi Menu', 'Pulsante vedi menu'),
  ('landing', 'menu_view_btn', 'pt', 'Ver Menu', 'Botão ver menu');

-- ═══════════════════════════════════════
-- NAVEGACIÓN
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Previous
  ('landing', 'nav_previous', 'es', 'Anterior', 'Botón anterior'),
  ('landing', 'nav_previous', 'en', 'Previous', 'Previous button'),
  ('landing', 'nav_previous', 'fr', 'Précédent', 'Bouton précédent'),
  ('landing', 'nav_previous', 'de', 'Zurück', 'Zurück-Button'),
  ('landing', 'nav_previous', 'it', 'Precedente', 'Pulsante precedente'),
  ('landing', 'nav_previous', 'pt', 'Anterior', 'Botão anterior'),
  
  -- Next
  ('landing', 'nav_next', 'es', 'Siguiente', 'Botón siguiente'),
  ('landing', 'nav_next', 'en', 'Next', 'Next button'),
  ('landing', 'nav_next', 'fr', 'Suivant', 'Bouton suivant'),
  ('landing', 'nav_next', 'de', 'Weiter', 'Weiter-Button'),
  ('landing', 'nav_next', 'it', 'Successivo', 'Pulsante successivo'),
  ('landing', 'nav_next', 'pt', 'Próximo', 'Botão próximo'),
  
  -- Page indicator
  ('landing', 'nav_page', 'es', 'Página', 'Indicador de página'),
  ('landing', 'nav_page', 'en', 'Page', 'Page indicator'),
  ('landing', 'nav_page', 'fr', 'Page', 'Indicateur de page'),
  ('landing', 'nav_page', 'de', 'Seite', 'Seitenanzeiger'),
  ('landing', 'nav_page', 'it', 'Pagina', 'Indicatore pagina'),
  ('landing', 'nav_page', 'pt', 'Página', 'Indicador de página');

-- ═══════════════════════════════════════
-- HERO SECTION
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Fallback Title
  ('landing', 'hero_fallback_title', 'es', 'Experiencia Deliciosa', 'Título fallback hero'),
  ('landing', 'hero_fallback_title', 'en', 'Delightful Experience', 'Hero fallback title'),
  ('landing', 'hero_fallback_title', 'fr', 'Expérience Délicieuse', 'Titre fallback hero'),
  ('landing', 'hero_fallback_title', 'de', 'Köstliches Erlebnis', 'Hero-Fallback-Titel'),
  ('landing', 'hero_fallback_title', 'it', 'Esperienza Deliziosa', 'Titolo fallback hero'),
  ('landing', 'hero_fallback_title', 'pt', 'Experiência Deliciosa', 'Título fallback banner'),
  
  -- Fallback Subtitle
  ('landing', 'hero_fallback_subtitle', 'es', 'Un sabor de perfección en cada plato - gastronomía refinada con un toque moderno.', 'Subtítulo fallback hero'),
  ('landing', 'hero_fallback_subtitle', 'en', 'A taste of perfection in every dish - fine dining with a modern twist.', 'Hero fallback subtitle'),
  ('landing', 'hero_fallback_subtitle', 'fr', 'Un goût de perfection dans chaque plat - gastronomie raffinée avec une touche moderne.', 'Sous-titre fallback hero'),
  ('landing', 'hero_fallback_subtitle', 'de', 'Ein Geschmack der Perfektion in jedem Gericht - gehobene Küche mit modernem Touch.', 'Hero-Fallback-Untertitel'),
  ('landing', 'hero_fallback_subtitle', 'it', 'Un sapore di perfezione in ogni piatto - cucina raffinata con un tocco moderno.', 'Sottotitolo fallback hero'),
  ('landing', 'hero_fallback_subtitle', 'pt', 'Um sabor de perfeição em cada prato - gastronomia refinada com um toque moderno.', 'Subtítulo fallback banner');

-- ═══════════════════════════════════════
-- STRINGS ADICIONALES ÚTILES
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- View More
  ('landing', 'view_more', 'es', 'Ver más', 'Botón ver más'),
  ('landing', 'view_more', 'en', 'View more', 'View more button'),
  ('landing', 'view_more', 'fr', 'Voir plus', 'Bouton voir plus'),
  ('landing', 'view_more', 'de', 'Mehr sehen', 'Mehr sehen Button'),
  ('landing', 'view_more', 'it', 'Vedi altro', 'Pulsante vedi altro'),
  ('landing', 'view_more', 'pt', 'Ver mais', 'Botão ver mais'),
  
  -- View Less
  ('landing', 'view_less', 'es', 'Ver menos', 'Botón ver menos'),
  ('landing', 'view_less', 'en', 'View less', 'View less button'),
  ('landing', 'view_less', 'fr', 'Voir moins', 'Bouton voir moins'),
  ('landing', 'view_less', 'de', 'Weniger sehen', 'Weniger sehen Button'),
  ('landing', 'view_less', 'it', 'Vedi meno', 'Pulsante vedi meno'),
  ('landing', 'view_less', 'pt', 'Ver menos', 'Botão ver menos'),
  
  -- Loading
  ('landing', 'loading', 'es', 'Cargando...', 'Texto de carga'),
  ('landing', 'loading', 'en', 'Loading...', 'Loading text'),
  ('landing', 'loading', 'fr', 'Chargement...', 'Texte de chargement'),
  ('landing', 'loading', 'de', 'Laden...', 'Ladetext'),
  ('landing', 'loading', 'it', 'Caricamento...', 'Testo di caricamento'),
  ('landing', 'loading', 'pt', 'Carregando...', 'Texto de carregamento');

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
-- Total: ~120 strings insertados
-- Idiomas: ES, EN, FR, DE, IT, PT
-- Contexto: landing
-- =====================================================
