-- =====================================================
-- LOCALIZATION STRINGS MIGRATION - PART 2
-- Strings adicionales y fallbacks para componentes
-- =====================================================

-- ═══════════════════════════════════════
-- HERO SECTION
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Ya creados en Part 1, solo agregando idiomas faltantes
  ('landing', 'hero_fallback_title', 'cn', '美味体验', 'Hero fallback title'),
  ('landing', 'hero_fallback_title', 'kr', '즐거운 경험', 'Hero fallback title'),
  ('landing', 'hero_fallback_title', 'ru', 'Восхитительный Опыт', 'Hero fallback title'),
  ('landing', 'hero_fallback_title', 'ua', 'Чудовий Досвід', 'Hero fallback title'),
  
  ('landing', 'hero_fallback_subtitle', 'cn', '每道菜都完美无缺 - 精致餐饮与现代风格', 'Hero fallback subtitle'),
  ('landing', 'hero_fallback_subtitle', 'kr', '모든 요리의 완벽함 - 현대적 감각의 고급 요리', 'Hero fallback subtitle'),
  ('landing', 'hero_fallback_subtitle', 'ru', 'Вкус совершенства в каждом блюде', 'Hero fallback subtitle'),
  ('landing', 'hero_fallback_subtitle', 'ua', 'Смак досконалості в кожній страві', 'Hero fallback subtitle');

-- ═══════════════════════════════════════
-- ABOUT SECTION
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Título principal
  ('landing', 'about_fallback_title', 'es', 'Disfruta Cada Momento con Sabor', 'About section title'),
  ('landing', 'about_fallback_title', 'en', 'Enjoy Every Moment with Tasty', 'About section title'),
  ('landing', 'about_fallback_title', 'fr', 'Profitez de Chaque Moment avec Saveur', 'About section title'),
  ('landing', 'about_fallback_title', 'de', 'Genießen Sie Jeden Moment mit Geschmack', 'About section title'),
  ('landing', 'about_fallback_title', 'it', 'Goditi Ogni Momento con Gusto', 'About section title'),
  ('landing', 'about_fallback_title', 'pt', 'Aproveite Cada Momento com Sabor', 'About section title'),
  
  -- Descripción
  ('landing', 'about_fallback_description', 'es', 'Experimenta el arte culinario en su máxima expresión donde los sabores tradicionales se encuentran con la innovación moderna creando momentos gastronómicos inolvidables.', 'About section description'),
  ('landing', 'about_fallback_description', 'en', 'Experience culinary artistry at its finest where traditional flavors meet modern innovation creating unforgettable dining moments.', 'About section description'),
  ('landing', 'about_fallback_description', 'fr', 'Découvrez l''art culinaire à son meilleur où les saveurs traditionnelles rencontrent l''innovation moderne créant des moments gastronomiques inoubliables.', 'About section description'),
  ('landing', 'about_fallback_description', 'de', 'Erleben Sie kulinarische Kunst vom Feinsten, wo traditionelle Aromen auf moderne Innovation treffen und unvergessliche kulinarische Momente schaffen.', 'About section description'),
  ('landing', 'about_fallback_description', 'it', 'Sperimenta l''arte culinaria al suo meglio dove i sapori tradizionali incontrano l''innovazione moderna creando momenti gastronomici indimenticabili.', 'About section description'),
  ('landing', 'about_fallback_description', 'pt', 'Experimente a arte culinária em seu melhor onde os sabores tradicionais encontram a inovação moderna criando momentos gastronômicos inesquecíveis.', 'About section description'),
  
  -- Features
  ('landing', 'about_feature_quality_title', 'es', 'Calidad Premium', 'Quality feature title'),
  ('landing', 'about_feature_quality_title', 'en', 'Premium Quality', 'Quality feature title'),
  ('landing', 'about_feature_quality_title', 'fr', 'Qualité Premium', 'Quality feature title'),
  ('landing', 'about_feature_quality_title', 'de', 'Premium-Qualität', 'Quality feature title'),
  ('landing', 'about_feature_quality_title', 'it', 'Qualità Premium', 'Quality feature title'),
  ('landing', 'about_feature_quality_title', 'pt', 'Qualidade Premium', 'Quality feature title'),
  
  ('landing', 'about_feature_quality_desc', 'es', 'Ingredientes de primera calidad', 'Quality feature description'),
  ('landing', 'about_feature_quality_desc', 'en', 'First-class ingredients', 'Quality feature description'),
  ('landing', 'about_feature_quality_desc', 'fr', 'Ingrédients de première qualité', 'Quality feature description'),
  ('landing', 'about_feature_quality_desc', 'de', 'Erstklassige Zutaten', 'Quality feature description'),
  ('landing', 'about_feature_quality_desc', 'it', 'Ingredienti di prima qualità', 'Quality feature description'),
  ('landing', 'about_feature_quality_desc', 'pt', 'Ingredientes de primeira qualidade', 'Quality feature description'),
  
  ('landing', 'about_feature_authentic_title', 'es', 'Recetas Auténticas', 'Authentic feature title'),
  ('landing', 'about_feature_authentic_title', 'en', 'Authentic Recipes', 'Authentic feature title'),
  ('landing', 'about_feature_authentic_title', 'fr', 'Recettes Authentiques', 'Authentic feature title'),
  ('landing', 'about_feature_authentic_title', 'de', 'Authentische Rezepte', 'Authentic feature title'),
  ('landing', 'about_feature_authentic_title', 'it', 'Ricette Autentiche', 'Authentic feature title'),
  ('landing', 'about_feature_authentic_title', 'pt', 'Receitas Autênticas', 'Authentic feature title'),
  
  ('landing', 'about_feature_authentic_desc', 'es', 'Tradición en cada plato', 'Authentic feature description'),
  ('landing', 'about_feature_authentic_desc', 'en', 'Tradition in every dish', 'Authentic feature description'),
  ('landing', 'about_feature_authentic_desc', 'fr', 'Tradition dans chaque plat', 'Authentic feature description'),
  ('landing', 'about_feature_authentic_desc', 'de', 'Tradition in jedem Gericht', 'Authentic feature description'),
  ('landing', 'about_feature_authentic_desc', 'it', 'Tradizione in ogni piatto', 'Authentic feature description'),
  ('landing', 'about_feature_authentic_desc', 'pt', 'Tradição em cada prato', 'Authentic feature description'),
  
  ('landing', 'about_feature_experience_title', 'es', 'Experiencia Única', 'Experience feature title'),
  ('landing', 'about_feature_experience_title', 'en', 'Unique Experience', 'Experience feature title'),
  ('landing', 'about_feature_experience_title', 'fr', 'Expérience Unique', 'Experience feature title'),
  ('landing', 'about_feature_experience_title', 'de', 'Einzigartige Erfahrung', 'Experience feature title'),
  ('landing', 'about_feature_experience_title', 'it', 'Esperienza Unica', 'Experience feature title'),
  ('landing', 'about_feature_experience_title', 'pt', 'Experiência Única', 'Experience feature title'),
  
  ('landing', 'about_feature_experience_desc', 'es', 'Servicio excepcional', 'Experience feature description'),
  ('landing', 'about_feature_experience_desc', 'en', 'Exceptional service', 'Experience feature description'),
  ('landing', 'about_feature_experience_desc', 'fr', 'Service exceptionnel', 'Experience feature description'),
  ('landing', 'about_feature_experience_desc', 'de', 'Ausgezeichneter Service', 'Experience feature description'),
  ('landing', 'about_feature_experience_desc', 'it', 'Servizio eccezionale', 'Experience feature description'),
  ('landing', 'about_feature_experience_desc', 'pt', 'Serviço excepcional', 'Experience feature description'),
  
  -- Label "Sobre Nosotros"
  ('landing', 'about_label', 'es', 'Sobre Nosotros', 'About us label'),
  ('landing', 'about_label', 'en', 'About Us', 'About us label'),
  ('landing', 'about_label', 'fr', 'À Propos', 'About us label'),
  ('landing', 'about_label', 'de', 'Über Uns', 'About us label'),
  ('landing', 'about_label', 'it', 'Chi Siamo', 'About us label'),
  ('landing', 'about_label', 'pt', 'Sobre Nós', 'About us label');

-- ═══════════════════════════════════════
-- GALLERY SECTION
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  ('landing', 'gallery_fallback_title', 'es', 'Momentos de nuestra mesa', 'Gallery title'),
  ('landing', 'gallery_fallback_title', 'en', 'Moments from our table', 'Gallery title'),
  ('landing', 'gallery_fallback_title', 'fr', 'Moments de notre table', 'Gallery title'),
  ('landing', 'gallery_fallback_title', 'de', 'Momente von unserem Tisch', 'Gallery title'),
  ('landing', 'gallery_fallback_title', 'it', 'Momenti dalla nostra tavola', 'Gallery title'),
  ('landing', 'gallery_fallback_title', 'pt', 'Momentos da nossa mesa', 'Gallery title'),
  
  ('landing', 'gallery_fallback_subtitle', 'es', 'Descubre el ambiente, la presentación y los pequeños detalles que hacen cada visita memorable.', 'Gallery subtitle'),
  ('landing', 'gallery_fallback_subtitle', 'en', 'Discover the ambience, plating and little details that make every visit memorable.', 'Gallery subtitle'),
  ('landing', 'gallery_fallback_subtitle', 'fr', 'Découvrez l''ambiance, le dressage et les petits détails qui rendent chaque visite mémorable.', 'Gallery subtitle'),
  ('landing', 'gallery_fallback_subtitle', 'de', 'Entdecken Sie das Ambiente, das Anrichten und die kleinen Details, die jeden Besuch unvergesslich machen.', 'Gallery subtitle'),
  ('landing', 'gallery_fallback_subtitle', 'it', 'Scopri l''atmosfera, l''impiattamento e i piccoli dettagli che rendono ogni visita memorabile.', 'Gallery subtitle'),
  ('landing', 'gallery_fallback_subtitle', 'pt', 'Descubra o ambiente, a apresentação e os pequenos detalhes que tornam cada visita memorável.', 'Gallery subtitle'),
  
  -- Default title "Galería"
  ('landing', 'gallery_title', 'es', 'Galería', 'Gallery'),
  ('landing', 'gallery_title', 'en', 'Gallery', 'Gallery'),
  ('landing', 'gallery_title', 'fr', 'Galerie', 'Gallery'),
  ('landing', 'gallery_title', 'de', 'Galerie', 'Gallery'),
  ('landing', 'gallery_title', 'it', 'Galleria', 'Gallery'),
  ('landing', 'gallery_title', 'pt', 'Galeria', 'Gallery'),
  
  ('landing', 'gallery_subtitle', 'es', 'Descubre nuestros platos en imágenes', 'Gallery default subtitle'),
  ('landing', 'gallery_subtitle', 'en', 'Discover our dishes in images', 'Gallery default subtitle'),
  ('landing', 'gallery_subtitle', 'fr', 'Découvrez nos plats en images', 'Gallery default subtitle'),
  ('landing', 'gallery_subtitle', 'de', 'Entdecken Sie unsere Gerichte in Bildern', 'Gallery default subtitle'),
  ('landing', 'gallery_subtitle', 'it', 'Scopri i nostri piatti in immagini', 'Gallery default subtitle'),
  ('landing', 'gallery_subtitle', 'pt', 'Descubra nossos pratos em imagens', 'Gallery default subtitle');

-- ═══════════════════════════════════════
-- CONTACT SECTION
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  -- Estadísticas
  ('landing', 'contact_stats_clients', 'es', 'Clientes Satisfechos', 'Satisfied clients stat'),
  ('landing', 'contact_stats_clients', 'en', 'Satisfied Clients', 'Satisfied clients stat'),
  ('landing', 'contact_stats_clients', 'fr', 'Clients Satisfaits', 'Satisfied clients stat'),
  ('landing', 'contact_stats_clients', 'de', 'Zufriedene Kunden', 'Satisfied clients stat'),
  ('landing', 'contact_stats_clients', 'it', 'Clienti Soddisfatti', 'Satisfied clients stat'),
  ('landing', 'contact_stats_clients', 'pt', 'Clientes Satisfeitos', 'Satisfied clients stat'),
  
  ('landing', 'contact_stats_dishes', 'es', 'Platos Servidos', 'Dishes served stat'),
  ('landing', 'contact_stats_dishes', 'en', 'Dishes Served', 'Dishes served stat'),
  ('landing', 'contact_stats_dishes', 'fr', 'Plats Servis', 'Dishes served stat'),
  ('landing', 'contact_stats_dishes', 'de', 'Servierte Gerichte', 'Dishes served stat'),
  ('landing', 'contact_stats_dishes', 'it', 'Piatti Serviti', 'Dishes served stat'),
  ('landing', 'contact_stats_dishes', 'pt', 'Pratos Servidos', 'Dishes served stat'),
  
  -- Subtitle
  ('landing', 'contact_subtitle', 'es', 'Reserva tu mesa ahora y descubre el sabor auténtico', 'Contact subtitle'),
  ('landing', 'contact_subtitle', 'en', 'Reserve your table now and discover authentic flavor', 'Contact subtitle'),
  ('landing', 'contact_subtitle', 'fr', 'Réservez votre table maintenant et découvrez la saveur authentique', 'Contact subtitle'),
  ('landing', 'contact_subtitle', 'de', 'Reservieren Sie jetzt Ihren Tisch und entdecken Sie authentischen Geschmack', 'Contact subtitle'),
  ('landing', 'contact_subtitle', 'it', 'Prenota il tuo tavolo ora e scopri il sapore autentico', 'Contact subtitle'),
  ('landing', 'contact_subtitle', 'pt', 'Reserve sua mesa agora e descubra o sabor autêntico', 'Contact subtitle');

-- ═══════════════════════════════════════
-- ARIA LABELS
-- ═══════════════════════════════════════
INSERT INTO localization_strings (context, key_name, language_code, label, description) VALUES
  ('landing', 'aria_close', 'es', 'Cerrar', 'Close button aria'),
  ('landing', 'aria_close', 'en', 'Close', 'Close button aria'),
  ('landing', 'aria_close', 'fr', 'Fermer', 'Close button aria'),
  ('landing', 'aria_close', 'de', 'Schließen', 'Close button aria'),
  ('landing', 'aria_close', 'it', 'Chiudi', 'Close button aria'),
  ('landing', 'aria_close', 'pt', 'Fechar', 'Close button aria'),
  
  ('landing', 'aria_menu', 'es', 'Menú', 'Menu button aria'),
  ('landing', 'aria_menu', 'en', 'Menu', 'Menu button aria'),
  ('landing', 'aria_menu', 'fr', 'Menu', 'Menu button aria'),
  ('landing', 'aria_menu', 'de', 'Menü', 'Menu button aria'),
  ('landing', 'aria_menu', 'it', 'Menu', 'Menu button aria'),
  ('landing', 'aria_menu', 'pt', 'Menu', 'Menu button aria');

-- =====================================================
-- FIN DE LA MIGRACIÓN PART 2
-- =====================================================
-- Total agregado: ~100 strings nuevos
-- Total acumulado: ~220 strings
-- =====================================================
