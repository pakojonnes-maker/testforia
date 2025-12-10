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
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total_view_time INTEGER DEFAULT 0,
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
  last_login TIMESTAMP, password_hash TEXT,
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
CREATE TABLE notification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  device_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
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
CREATE TABLE notification_targets (
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  consent_analytics INTEGER DEFAULT 1,     -- 0/1
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
  directions_clicks INTEGER DEFAULT 0, avg_dish_view_duration REAL DEFAULT 0, avg_section_time REAL DEFAULT 0, avg_scroll_depth REAL DEFAULT 0, media_errors INTEGER DEFAULT 0,
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
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
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
