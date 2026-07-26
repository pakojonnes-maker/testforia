-- =====================================================
-- BDschemaFinal.sql — ESQUEMA REAL DE PRODUCCION
-- =====================================================
-- Base de datos D1: restaurant-menu-saas (7e8d1efe-2a54-4849-9a06-4c47152392bd)
-- Exportado el 2026-07-26 desde la BD en produccion. 78 tablas, 81 indices.
--
-- NO editar a mano. Para regenerar:
--   npx wrangler d1 export restaurant-menu-saas --remote --no-data --output BDschemaFinal.sql
--
-- La version anterior de este archivo estaba 24 tablas por detras (le faltaba
-- todo el guidebook, TV, loyalty y delivery, y conservaba 3 tablas ya borradas
-- en la migracion 0057).
-- =====================================================

PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free',  -- free, starter, professional, enterprise
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  max_restaurants INTEGER DEFAULT 1,
  max_dishes_per_restaurant INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE menus (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  is_seasonal BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, featured_poster_url TEXT, featured_video_url TEXT, external_url TEXT,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  icon_url TEXT,
  bg_color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_visible BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (menu_id) REFERENCES menus(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE dishes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, out_of_stock, seasonal, hidden
  price REAL NOT NULL,
  discount_price REAL,
  discount_active BOOLEAN DEFAULT FALSE,
  calories INTEGER,
  preparation_time INTEGER, -- en minutos
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  avg_rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total_view_time INTEGER DEFAULT 0, has_half_portion BOOLEAN DEFAULT FALSE, half_price REAL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE section_dishes (
  section_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (section_id, dish_id),
  FOREIGN KEY (section_id) REFERENCES sections(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
);
CREATE TABLE languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  flag_emoji TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE translations (
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'dish', 'section', 'menu', 'allergen'
  language_code TEXT NOT NULL,
  field TEXT NOT NULL, -- 'name', 'description', etc.
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_id, entity_type, language_code, field),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE allergens (
  id TEXT PRIMARY KEY,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE dish_allergens (
  dish_id TEXT NOT NULL,
  allergen_id TEXT NOT NULL,
  PRIMARY KEY (dish_id, allergen_id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (allergen_id) REFERENCES allergens(id)
);
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE dish_ingredients (
  dish_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (dish_id, ingredient_id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  auth_provider TEXT, -- 'google', 'email', etc.
  preferred_language TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP, password_hash TEXT, is_superadmin BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (preferred_language) REFERENCES languages(code)
);
CREATE TABLE restaurant_staff (
  restaurant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'owner', 'manager', 'staff'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, user_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE user_favorites (
  user_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, dish_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE user_ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  deep_link TEXT,
  image_url TEXT,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  status TEXT DEFAULT 'draft',  -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  target_type TEXT DEFAULT 'all',  -- 'all', 'favorites', 'recent', 'custom'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE restaurant_languages (
  restaurant_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  priority INTEGER DEFAULT 10, -- Menor número = mayor prioridad
  completion_percentage INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, language_code),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE dietary_labels (
  feature_code TEXT NOT NULL,  -- 'vegetarian', 'vegan', 'gluten_free', etc.
  language_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (feature_code, language_code),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE ingredient_translations (
  ingredient_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (ingredient_id, language_code),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE dish_messages (
  dish_id TEXT NOT NULL,
  message_type TEXT NOT NULL,  -- 'warning', 'info', 'preparation', etc.
  language_code TEXT NOT NULL,
  message TEXT NOT NULL,
  PRIMARY KEY (dish_id, message_type, language_code),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE landing_seo (
  restaurant_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, language_code),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE restaurant_translations (
  restaurant_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  cuisine_type TEXT,
  specialties TEXT,
  chef_note TEXT,
  PRIMARY KEY (restaurant_id, language_code),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE dish_media (
  id TEXT PRIMARY KEY NOT NULL, -- Formato: media_[timestamp]_[hash]
  dish_id TEXT NOT NULL,
  media_type TEXT NOT NULL,     -- 'video', 'image', 'thumbnail'
  content_type TEXT NOT NULL,   -- 'video/mp4', 'image/jpeg'
  r2_key TEXT NOT NULL,         -- Clave única en R2
  display_name TEXT,            -- Nombre para mostrar (opcional)
  width INTEGER,
  height INTEGER,
  duration INTEGER,             -- Para videos (en ms)
  file_size INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, order_index INTEGER DEFAULT 0, role TEXT CHECK(role IN ('PRIMARY_VIDEO', 'PRIMARY_IMAGE', 'GALLERY_IMAGE')),
  
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
);
CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  location TEXT,          -- ubicación física (ej. "mesa 12", "escaparate")
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, type TEXT DEFAULT 'menu', assigned_staff_id TEXT,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  restaurant_id TEXT NOT NULL,
  device_type TEXT,
  os_name TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  language_code TEXT,
  timezone_offset INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  device_pixel_ratio REAL,
  network_type TEXT,
  pwa_installed INTEGER DEFAULT 0,         -- 0/1
  qr_code_id TEXT,
  consent_analytics INTEGER DEFAULT 1, visitor_id TEXT, visit_count INTEGER DEFAULT 1,     -- 0/1
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id)
);
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  restaurant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,                 -- view_dish, view_section, favorite, rating, share, click_reserve, click_call, click_directions, ...
  entity_id TEXT,                           -- id del plato, sección, etc.
  entity_type TEXT,                         -- dish, section, menu, landing, ...
  value TEXT,                               -- payload textual
  numeric_value REAL,                       -- rating, dwell, etc.
  props TEXT,                               -- JSON arbitrario
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE qr_scans (
  id TEXT PRIMARY KEY,
  qr_code_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE TABLE daily_analytics (
  restaurant_id TEXT NOT NULL,
  date TEXT NOT NULL,                        -- YYYY-MM-DD (UTC)
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration REAL DEFAULT 0,       -- segundos
  dish_views INTEGER DEFAULT 0,
  favorites_added INTEGER DEFAULT 0,
  ratings_submitted INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reserve_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  directions_clicks INTEGER DEFAULT 0, avg_dish_view_duration REAL DEFAULT 0, avg_section_time REAL DEFAULT 0, avg_scroll_depth REAL DEFAULT 0, media_errors INTEGER DEFAULT 0, new_visitors INTEGER DEFAULT 0, returning_visitors INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, date),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
) WITHOUT ROWID;
CREATE TABLE dish_daily_metrics (
  restaurant_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  date TEXT NOT NULL,                         -- YYYY-MM-DD (UTC)
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  avg_dwell_seconds REAL DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  ratings INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  reserve_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  directions_clicks INTEGER DEFAULT 0, avg_view_duration REAL DEFAULT 0, total_view_time INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, dish_id, date),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
) WITHOUT ROWID;
CREATE TABLE section_daily_metrics (
  restaurant_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  date TEXT NOT NULL,                         -- YYYY-MM-DD (UTC)
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  dish_views INTEGER DEFAULT 0,
  avg_dwell_seconds REAL DEFAULT 0,
  reserve_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  directions_clicks INTEGER DEFAULT 0, avg_time_spent REAL DEFAULT 0, avg_scroll_depth INTEGER DEFAULT 0, total_dishes_viewed INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, section_id, date),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
) WITHOUT ROWID;
CREATE TABLE entry_exit_flows (
  restaurant_id TEXT NOT NULL,
  date TEXT NOT NULL,                          -- YYYY-MM-DD (UTC)
  from_entity_type TEXT NOT NULL,              -- menu | section | dish | landing | ...
  from_entity_id TEXT,
  to_entity_type TEXT NOT NULL,
  to_entity_id TEXT,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, date, from_entity_type, from_entity_id, to_entity_type, to_entity_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
) WITHOUT ROWID;
CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  text_color TEXT,
  background_color TEXT,
  font_family TEXT,
  font_accent TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE reel_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  email TEXT,
  phone TEXT,
  theme_id TEXT REFERENCES themes(id),
  reel_template_id TEXT REFERENCES reel_templates(id),
  language_default TEXT DEFAULT 'es',
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, logo_url TEXT, address TEXT, website TEXT, city TEXT, country TEXT, cover_image_url TEXT);
CREATE TABLE localization_strings (
  context TEXT NOT NULL,
  key_name TEXT NOT NULL,
  language_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (context, key_name, language_code)
);
CREATE TABLE reel_template_configs (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES reel_templates(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT,
  value_type TEXT DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE web_customizations (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  override_theme BOOLEAN DEFAULT TRUE,
  override_colors JSON,
  override_fonts JSON,
  layout_style TEXT DEFAULT 'modern',
  layout_settings JSON,
  seo_title TEXT,
  seo_description TEXT,
  custom_meta JSON,
  custom_css TEXT,
  custom_js TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE restaurant_reel_configs (
  id TEXT PRIMARY KEY,                           -- ID único para la config
  restaurant_id TEXT NOT NULL,                   -- FK a restaurantes
  template_id TEXT NOT NULL,                     -- FK a plantilla de reels
  config_overrides JSON,                         -- JSON con overrides de comportamiento (e.g. duración, animaciones)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES reel_templates(id)
);
CREATE TABLE restaurant_details (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL UNIQUE,
  
  -- Horarios (JSON con estructura por día)
  opening_hours TEXT,                    -- JSON: {"monday": {"open": "9:00", "close": "22:00", "closed": false}, ...}
  timezone TEXT DEFAULT 'Europe/Madrid',
  special_hours TEXT,                    -- JSON: Horarios especiales (festivos, eventos)
  
  -- Reservas y contacto
  reservation_url TEXT,
  reservation_phone TEXT,
  reservation_email TEXT,
  whatsapp_number TEXT,
  
  -- Ubicación y mapa
  google_maps_url TEXT,
  latitude REAL,
  longitude REAL,
  parking_info TEXT,
  public_transport_info TEXT,
  neighborhood TEXT,                     -- Barrio o zona
  
  -- Redes sociales
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  tripadvisor_url TEXT,
  
  -- Información adicional
  accepts_credit_cards BOOLEAN DEFAULT TRUE,
  accepts_reservations BOOLEAN DEFAULT TRUE,
  has_wifi BOOLEAN DEFAULT TRUE,
  is_wheelchair_accessible BOOLEAN DEFAULT FALSE,
  has_outdoor_seating BOOLEAN DEFAULT FALSE,
  has_delivery BOOLEAN DEFAULT FALSE,
  has_takeaway BOOLEAN DEFAULT FALSE,
  pet_friendly BOOLEAN DEFAULT FALSE,
  
  -- Capacidad
  max_capacity INTEGER,
  private_room_capacity INTEGER,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, google_review_url TEXT, redeem_pin TEXT,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE landing_section_library (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,       -- 'hero', 'about', 'menu', 'gallery', 'location', 'contact'
  name TEXT NOT NULL,                     -- 'Hero Banner', 'Sobre Nosotros', etc.
  description TEXT,
  icon_name TEXT,                         -- 'HomeIcon', 'InfoIcon', etc. (Material UI)
  category TEXT DEFAULT 'content',        -- 'hero', 'content', 'media', 'contact'
  
  -- Variantes disponibles
  available_variants TEXT NOT NULL,       -- JSON: [{key, name, description}, ...]
  
  -- Props configurables
  customizable_props TEXT NOT NULL,       -- JSON: [{key, label, type, options, default}, ...]
  
  -- Config por defecto
  default_config TEXT,                    -- JSON con valores por defecto
  
  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,        -- Orden en el selector del admin
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE restaurant_landing_sections (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  section_key TEXT NOT NULL,              -- FK a landing_section_library.section_key
  
  -- Orden y estado
  order_index INTEGER NOT NULL,           -- 1, 2, 3... (orden de aparición)
  is_active BOOLEAN DEFAULT TRUE,         -- Mostrar/ocultar sin borrar
  
  -- Configuración
  variant TEXT DEFAULT 'default',         -- Variante elegida: 'fullscreen', 'grid', etc.
  config_data TEXT NOT NULL DEFAULT '{}', -- JSON con toda la personalización
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (section_key) REFERENCES landing_section_library(section_key) ON DELETE RESTRICT,
  
  UNIQUE(restaurant_id, section_key),     -- Solo 1 instancia de cada sección por restaurante
  UNIQUE(restaurant_id, order_index)      -- No puede haber 2 secciones en mismo orden
);
CREATE TABLE cart_daily_metrics (
  restaurantid TEXT NOT NULL,
  date TEXT NOT NULL,
  total_carts_created INTEGER DEFAULT 0,
  total_carts_shown INTEGER DEFAULT 0,
  total_carts_abandoned INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0.0,
  total_estimated_value REAL DEFAULT 0.0,
  avg_cart_value REAL DEFAULT 0.0,
  shown_carts_value REAL DEFAULT 0.0,
  total_items_added INTEGER DEFAULT 0,
  avg_items_per_cart REAL DEFAULT 0.0,
  avg_time_to_show INTEGER DEFAULT 0,
  avg_time_to_abandon INTEGER DEFAULT 0,
  top_dish_id TEXT,
  top_dish_count INTEGER DEFAULT 0,
  PRIMARY KEY (restaurantid, date),
  FOREIGN KEY (restaurantid) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (top_dish_id) REFERENCES dishes(id) ON DELETE SET NULL
) WITHOUT ROWID;
CREATE TABLE restaurant_media (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
    
    -- Context + Role pattern
    context TEXT NOT NULL,               -- 'hero' | 'about' | 'tag' | 'gallery' | 'cover'
    role TEXT,                           -- Rol específico dentro del contexto
    
    -- Metadata
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    file_size_bytes INTEGER,
    
    -- Control
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    metadata_json TEXT,                  -- JSON flexible para props custom
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE cart_sessions (
  id TEXT PRIMARY KEY,
  sessionid TEXT NOT NULL,
  restaurantid TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  showntostaffat TIMESTAMP,
  abandonedat TIMESTAMP,
  cartsnapshotjson TEXT,
  totalitems INTEGER DEFAULT 0,
  uniquedishes INTEGER DEFAULT 0,
  estimatedvalue REAL DEFAULT 0.0,
  timespentseconds INTEGER DEFAULT 0,
  modificationscount INTEGER DEFAULT 0,
  devicetype TEXT,
  languagecode TEXT,
  qrcodeid TEXT,
  FOREIGN KEY (sessionid) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurantid) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (qrcodeid) REFERENCES qr_codes(id) ON DELETE SET NULL
);
CREATE TABLE marketing_campaigns (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,              -- Internal name (e.g., "Welcome Summer 2025")
    type TEXT NOT NULL,              -- 'welcome_modal', 'exit_intent', 'banner', 'newsletter'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,      -- Higher number = higher priority
    
    -- Configuration & Content
    -- We use JSON for flexibility within the structured table.
    -- content: { title, description, image_url, ... }
    -- settings: { show_email, show_phone, auto_open, delay, ... }
    content JSON,
    settings JSON,
    
    -- Scheduling
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE reservation_settings (
  restaurant_id TEXT PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT FALSE, -- Master toggle
  
  -- Capacity and Timing
  max_capacity INTEGER NOT NULL DEFAULT 50, -- Total capacity (default fallback)
  max_party_size INTEGER DEFAULT 10,
  min_party_size INTEGER DEFAULT 1,
  slot_duration_minutes INTEGER DEFAULT 90,
  gap_between_slots_minutes INTEGER DEFAULT 15,
  
  -- Business Rules (Future proofing for No-shows)
  requires_deposit BOOLEAN DEFAULT FALSE, 
  deposit_amount_per_person REAL DEFAULT 0, 
  auto_confirm BOOLEAN DEFAULT TRUE,
  
  -- Messages & Legal
  terms_and_conditions TEXT,
  privacy_policy_link TEXT,
  
  -- Availability Schedule (JSON)
  -- Format: { "monday": [{ "start": "13:00", "end": "15:30" }], ... }
  booking_availability JSON, 
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, closed_dates TEXT, advance_days INTEGER DEFAULT 30, holiday_closures TEXT,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  user_id TEXT, -- Optional, if user is logged in
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  
  reservation_date TEXT NOT NULL, -- YYYY-MM-DD
  reservation_time TEXT NOT NULL, -- HH:MM
  party_size INTEGER NOT NULL,
  
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled_user, cancelled_restaurant, completed, no_show
  
  special_requests TEXT,
  occasion TEXT,
  
  -- Legal / System Data
  accepted_policy BOOLEAN DEFAULT FALSE, -- GDPR Critical
  accepted_marketing BOOLEAN DEFAULT FALSE, -- Separate GDPR
  ip_address TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, cancellation_reason TEXT, magic_link_token TEXT, reminder_sent BOOLEAN DEFAULT FALSE, admin_notes TEXT, table_assignment TEXT,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE reservation_waitlist (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_contact_method TEXT NOT NULL, -- 'email', 'whatsapp', 'phone'
  client_contact_value TEXT NOT NULL,
  
  desired_date TEXT NOT NULL,
  desired_time_range TEXT, -- "20:00-22:00"
  party_size INTEGER NOT NULL,
  
  notes TEXT,
  status TEXT DEFAULT 'waiting', -- waiting, contacted, converted, cancelled
  
  accepted_policy BOOLEAN DEFAULT FALSE, -- GDPR Critical
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE reservation_logs (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'status_change', 'modified', 'cancelled'
  previous_state TEXT, 
  new_state TEXT, 
  changed_by TEXT, -- 'system', 'user', 'staff:ID'
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);
CREATE TABLE restaurant_ratings (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  rating INTEGER NOT NULL, -- 1-5
  comment TEXT,
  
  -- Tracking Identity
  user_id TEXT,             -- Optional: Link if logged in
  visitor_id TEXT,          -- Critical: Persistent anonymous ID
  session_id TEXT,          -- Context: Link to session metrics
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE TABLE notification_tokens (id TEXT PRIMARY KEY, user_id TEXT, visitor_id TEXT, token TEXT NOT NULL, device_type TEXT, restaurant_id TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_used TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE notification_targets (
  notification_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,         -- Identificador principal del dispositivo (puede ser 'anon' o el ID real)
  user_id TEXT,                     -- Opcional: Solo si el usuario estaba logueado
  
  -- Estado
  sent BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  
  -- Constraints
  PRIMARY KEY (notification_id, visitor_id), -- Clave primaria compuesta correcta
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE delivery_settings (
  restaurant_id TEXT PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT FALSE,
  
  -- Contacto
  show_whatsapp BOOLEAN DEFAULT TRUE,
  show_phone BOOLEAN DEFAULT FALSE,
  custom_whatsapp TEXT,  -- Override de restaurant_details.whatsapp_number
  custom_phone TEXT,     -- Override de restaurants.phone
  
  -- Horarios y Disponibilidad (JSON)
  -- Formato: {"monday": [{"start":"12:00","end":"22:00"}], "tuesday": [], ...}
  delivery_hours TEXT,
  -- Formato: ["2026-01-25", "2026-01-26"]
  closed_dates TEXT,
  
  -- Métodos de Pago (JSON)
  -- Formato: {"cash": true, "card": false}
  payment_methods TEXT DEFAULT '{"cash":true,"card":false}',
  
  -- Costes
  shipping_cost REAL DEFAULT 0,            -- Coste fijo de envío en €
  free_shipping_threshold REAL DEFAULT 0,  -- 0 = siempre gratis si shipping_cost=0
  minimum_order REAL DEFAULT 0,            -- Pedido mínimo en €
  
  -- Mensaje personalizado (fallback si no hay traducción)
  custom_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE delivery_orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  -- Customer info
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_notes TEXT,
  -- Order details
  items TEXT NOT NULL, -- JSON array of {dish_id, name, quantity, price}
  subtotal REAL NOT NULL,
  shipping_cost REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT, -- 'cash' | 'card'
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, delivered, cancelled
  -- Metadata
  session_id TEXT,
  visitor_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, order_source TEXT DEFAULT 'whatsapp',
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE guide_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT DEFAULT 'ES',
  region TEXT,
  latitude REAL,
  longitude REAL,
  timezone TEXT DEFAULT 'Europe/Madrid',
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE guide_agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, primary_color TEXT, secondary_color TEXT, accent_color TEXT, font_family TEXT);
CREATE TABLE guide_agency_staff (
  agency_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agency_id, user_id),
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE guide_apartments (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  cover_image_url TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);
CREATE TABLE guide_apartment_info (
  id TEXT PRIMARY KEY,
  apartment_id TEXT NOT NULL,
  info_key TEXT NOT NULL,
  icon_name TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_sequential BOOLEAN DEFAULT FALSE, guide_group TEXT, has_checklist BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  UNIQUE(apartment_id, info_key)
);
CREATE TABLE guide_apartment_media (
  id TEXT PRIMARY KEY,
  apartment_info_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_info_id) REFERENCES guide_apartment_info(id) ON DELETE CASCADE
);
CREATE TABLE guide_pois (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  google_maps_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, rating REAL, travel_time_text TEXT, travel_mode TEXT CHECK(travel_mode IN ('walk', 'drive', 'bike')), distance_text TEXT, poi_type    TEXT NOT NULL DEFAULT 'sight', subcategory TEXT, access_type TEXT NOT NULL DEFAULT 'free', address          TEXT, google_place_id  TEXT, what3words        TEXT, rating_count        INTEGER, google_rating       REAL, google_rating_count INTEGER, opening_hours TEXT, phone         TEXT, website_url   TEXT, booking_url   TEXT, duration_text TEXT, price_amount           REAL, price_currency         TEXT DEFAULT 'EUR', price_display          TEXT, original_price_display TEXT, discount_display       TEXT, is_bookable             BOOLEAN DEFAULT FALSE, action_type             TEXT, action_data             TEXT, action_prefilled_message TEXT, commission_type         TEXT, commission_value        REAL DEFAULT 0, badge_type              TEXT, cover_image_url TEXT, is_featured     BOOLEAN DEFAULT FALSE, source          TEXT, external_id     TEXT,
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);
CREATE TABLE guide_poi_media (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video', 'thumbnail')),
  role TEXT CHECK(role IN ('PRIMARY_VIDEO', 'PRIMARY_IMAGE', 'GALLERY_IMAGE', 'THUMBNAIL')),
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  file_size INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES guide_pois(id) ON DELETE CASCADE
);
CREATE TABLE guide_experiences (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  category TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('URL', 'WHATSAPP', 'PHONE', 'COUPON', 'IN_APP')),
  action_data TEXT NOT NULL,
  action_prefilled_message TEXT,
  commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed', 'none')),
  commission_value REAL DEFAULT 0,
  price_display TEXT,
  cover_image_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, service_subcategory TEXT, discount_display TEXT, original_price_display TEXT, badge_type TEXT CHECK(badge_type IN ('discount', 'courtesy', 'exclusive', 'new')),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);
CREATE TABLE guide_zone_restaurants (
  zone_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK(tier IN ('basic', 'featured')),
  order_override INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, cuisine_type_override TEXT,
  PRIMARY KEY (zone_id, restaurant_id),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE guide_sessions (
  id TEXT PRIMARY KEY,
  apartment_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  device_type TEXT,
  os_name TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  language_code TEXT DEFAULT 'es',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER, device_fingerprint TEXT,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id)
);
CREATE TABLE guide_affiliate_intents (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  apartment_id TEXT,
  agency_id TEXT,
  zone_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('restaurant', 'experience', 'product')),
  target_id TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  user_agent TEXT,
  ip_country TEXT,
  ip_city TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES guide_sessions(id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id),
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);
CREATE TABLE guide_commission_ledger (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  intent_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid', 'disputed')),
  notes TEXT,
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id),
  FOREIGN KEY (intent_id) REFERENCES guide_affiliate_intents(id)
);
CREATE TABLE guide_section_views (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  apartment_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK(section IN ('info', 'discover', 'restaurants', 'services')),
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES guide_sessions(id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id)
);
CREATE TABLE guide_apartment_pois (
  apartment_id TEXT NOT NULL,
  poi_id       TEXT NOT NULL,
  order_override INTEGER DEFAULT 0,
  is_hidden    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP, travel_time_text TEXT, travel_mode      TEXT, distance_text    TEXT,
  PRIMARY KEY (apartment_id, poi_id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES guide_pois(id) ON DELETE CASCADE
);
CREATE TABLE guide_info_steps (
  id                  TEXT PRIMARY KEY,
  apartment_info_id   TEXT NOT NULL,
  step_number         INTEGER NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(apartment_info_id, step_number),
  FOREIGN KEY (apartment_info_id) REFERENCES guide_apartment_info(id) ON DELETE CASCADE
);
CREATE TABLE guide_info_step_media (
  id          TEXT PRIMARY KEY,
  step_id     TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  media_type  TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (step_id) REFERENCES guide_info_steps(id) ON DELETE CASCADE
);
CREATE TABLE guide_coupons (
  id              TEXT PRIMARY KEY,
  experience_id   TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  discount_type   TEXT CHECK(discount_type IN ('percentage', 'fixed')),
  discount_value  REAL NOT NULL,
  max_uses        INTEGER,
  current_uses    INTEGER DEFAULT 0,
  valid_from      TIMESTAMP,
  valid_until     TIMESTAMP,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP, poi_id TEXT,
  FOREIGN KEY (experience_id) REFERENCES guide_experiences(id)
);
CREATE TABLE guide_welcome_modals (
  id              TEXT PRIMARY KEY,
  apartment_id    TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN DEFAULT FALSE,
  image_url       TEXT,
  action_enabled  BOOLEAN DEFAULT FALSE,
  action_type     TEXT CHECK(action_type IN ('URL', 'WHATSAPP', 'PHONE')),
  action_data     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);
CREATE TABLE guide_tv_devices (
  id              TEXT PRIMARY KEY,
  apartment_id    TEXT NOT NULL,
  pairing_code    TEXT UNIQUE NOT NULL,
  device_label    TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  paired_at       TIMESTAMP,
  last_seen_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);
CREATE TABLE guide_tv_events (
  id              TEXT PRIMARY KEY,
  apartment_id    TEXT NOT NULL,
  device_id       TEXT,
  event_type      TEXT NOT NULL CHECK(event_type IN (
                    'impression', 'screen_view', 'wifi_reveal',
                    'poi_select', 'menu_qr_shown', 'booking_qr_shown'
                  )),
  screen          TEXT,
  lang            TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES guide_tv_devices(id) ON DELETE SET NULL
);
CREATE TABLE loyalty_programs (
  restaurant_id TEXT PRIMARY KEY,
  is_active INTEGER NOT NULL DEFAULT 0,
  stamps_required INTEGER NOT NULL DEFAULT 8,
  reward_name TEXT,
  reward_description TEXT,
  reward_image_url TEXT,
  stamp_icon TEXT DEFAULT '⭐',
  card_color TEXT,
  expiry_days INTEGER, -- null = sin caducidad tras completar
  terms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE loyalty_cards (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  stamps INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | redeemed | expired
  magic_link_token TEXT UNIQUE,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE loyalty_stamps (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES loyalty_cards(id) ON DELETE CASCADE
);
CREATE INDEX idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX idx_sections_restaurant ON sections(restaurant_id);
CREATE INDEX idx_translations_entity ON translations(entity_id, entity_type);
CREATE INDEX idx_translations_language ON translations(language_code);
CREATE INDEX idx_translations_lookup ON translations(entity_type, language_code);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_dish ON user_favorites(dish_id);
CREATE INDEX idx_dish_media ON dish_media (dish_id, media_type, is_primary);
CREATE INDEX idx_qr_codes_restaurant ON qr_codes(restaurant_id);
CREATE INDEX idx_sessions_rest_date ON sessions(restaurant_id, started_at);
CREATE INDEX idx_sessions_qr ON sessions(qr_code_id);
CREATE INDEX idx_events_rest_type_time ON events(restaurant_id, event_type, created_at);
CREATE INDEX idx_events_entity ON events(entity_id, entity_type);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_qr_scans_qr ON qr_scans(qr_code_id);
CREATE INDEX idx_qr_scans_session ON qr_scans(session_id);
CREATE INDEX idx_daily_rest_date ON daily_analytics(restaurant_id, date);
CREATE INDEX idx_dish_metrics_rest_date ON dish_daily_metrics(restaurant_id, date);
CREATE INDEX idx_dish_metrics_dish ON dish_daily_metrics(dish_id);
CREATE INDEX idx_section_metrics_rest_date ON section_daily_metrics(restaurant_id, date);
CREATE INDEX idx_section_metrics_section ON section_daily_metrics(section_id);
CREATE INDEX idx_flows_rest_date ON entry_exit_flows(restaurant_id, date);
CREATE INDEX idx_restaurant_details_restaurant ON restaurant_details(restaurant_id);
CREATE INDEX idx_lsl_active ON landing_section_library(is_active, display_order);
CREATE INDEX idx_rls_restaurant ON restaurant_landing_sections(restaurant_id);
CREATE INDEX idx_rls_order ON restaurant_landing_sections(restaurant_id, order_index);
CREATE INDEX idx_rls_active ON restaurant_landing_sections(restaurant_id, is_active);
CREATE INDEX idx_cartdaily_restaurant_date ON cart_daily_metrics(restaurantid, date);
CREATE INDEX idx_rm_restaurant ON restaurant_media(restaurant_id);
CREATE INDEX idx_rm_context_role ON restaurant_media(context, role);
CREATE INDEX idx_rm_active ON restaurant_media(is_active);
CREATE INDEX idx_events_type_date ON events(event_type, created_at);
CREATE INDEX idx_events_entity_type ON events(entity_id, entity_type, event_type);
CREATE INDEX idx_cartsessions_session ON cart_sessions(sessionid);
CREATE INDEX idx_cartsessions_restaurant_status ON cart_sessions(restaurantid, status);
CREATE INDEX idx_cartsessions_created ON cart_sessions(createdat);
CREATE INDEX idx_marketing_campaigns_restaurant ON marketing_campaigns(restaurant_id, is_active);
CREATE INDEX idx_reservations_restaurant_date ON reservations(restaurant_id, reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_waitlist_restaurant_date ON reservation_waitlist(restaurant_id, desired_date);
CREATE INDEX idx_sessions_visitor ON sessions(visitor_id, restaurant_id);
CREATE INDEX idx_rest_ratings_visitor ON restaurant_ratings(restaurant_id, visitor_id);
CREATE INDEX idx_sections_visible ON sections(restaurant_id, menu_id, is_visible, order_index);
CREATE INDEX idx_reservations_token ON reservations(magic_link_token);
CREATE INDEX idx_delivery_settings_enabled ON delivery_settings(restaurant_id, is_enabled);
CREATE INDEX idx_delivery_orders_restaurant ON delivery_orders(restaurant_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_created ON delivery_orders(created_at DESC);
CREATE INDEX idx_guide_apartments_zone ON guide_apartments(zone_id, is_active);
CREATE INDEX idx_guide_apartments_agency ON guide_apartments(agency_id);
CREATE INDEX idx_guide_apartments_slug ON guide_apartments(slug);
CREATE INDEX idx_guide_pois_zone ON guide_pois(zone_id, is_active, order_index);
CREATE INDEX idx_guide_experiences_zone ON guide_experiences(zone_id, is_active, order_index);
CREATE INDEX idx_guide_zone_rest_zone ON guide_zone_restaurants(zone_id, is_active);
CREATE INDEX idx_guide_zone_rest_tier ON guide_zone_restaurants(zone_id, tier, is_active);
CREATE INDEX idx_guide_intents_apartment ON guide_affiliate_intents(apartment_id, created_at);
CREATE INDEX idx_guide_intents_agency ON guide_affiliate_intents(agency_id, created_at);
CREATE INDEX idx_guide_intents_target ON guide_affiliate_intents(target_type, target_id, created_at);
CREATE INDEX idx_guide_ledger_agency ON guide_commission_ledger(agency_id, status);
CREATE INDEX idx_guide_sessions_apartment ON guide_sessions(apartment_id, started_at);
CREATE INDEX idx_guide_sessions_zone ON guide_sessions(zone_id, started_at);
CREATE INDEX idx_guide_agency_staff_user ON guide_agency_staff(user_id);
CREATE INDEX idx_guide_sessions_fingerprint ON guide_sessions(device_fingerprint, apartment_id);
CREATE INDEX idx_guide_section_views_apt ON guide_section_views(apartment_id, section, created_at);
CREATE INDEX idx_guide_section_views_session ON guide_section_views(session_id);
CREATE INDEX idx_guide_apt_pois_apt ON guide_apartment_pois(apartment_id, is_hidden, order_override);
CREATE INDEX idx_guide_info_steps ON guide_info_steps(apartment_info_id, step_number);
CREATE INDEX idx_guide_step_media ON guide_info_step_media(step_id, order_index);
CREATE INDEX idx_guide_coupons_exp ON guide_coupons(experience_id, is_active);
CREATE INDEX idx_guide_pois_zone_active ON guide_pois(zone_id, is_active, order_index);
CREATE INDEX idx_guide_welcome_modals_apartment ON guide_welcome_modals(apartment_id, is_active);
CREATE INDEX idx_guide_tv_devices_apartment ON guide_tv_devices(apartment_id);
CREATE INDEX idx_guide_tv_devices_pairing_code ON guide_tv_devices(pairing_code);
CREATE INDEX idx_guide_tv_events_apartment ON guide_tv_events(apartment_id, created_at);
CREATE INDEX idx_guide_tv_events_type ON guide_tv_events(event_type);
CREATE UNIQUE INDEX idx_loyalty_cards_open
  ON loyalty_cards(restaurant_id, visitor_id)
  WHERE status IN ('active', 'completed');
CREATE INDEX idx_loyalty_cards_token ON loyalty_cards(magic_link_token);
CREATE INDEX idx_loyalty_cards_restaurant_status ON loyalty_cards(restaurant_id, status);
CREATE INDEX idx_loyalty_stamps_card ON loyalty_stamps(card_id);
CREATE INDEX idx_guide_pois_bookable ON guide_pois(zone_id, is_bookable, is_active, is_featured, order_index);
CREATE INDEX idx_guide_pois_type     ON guide_pois(zone_id, poi_type, is_active);
CREATE INDEX idx_guide_pois_coords   ON guide_pois(zone_id, is_active, latitude);
