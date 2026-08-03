-- =====================================================
-- MIGRATION 0084: Ubicación de recogida en info items + teléfonos por apartamento
-- =====================================================
-- Por qué: dos peticiones separadas que comparten migración porque las dos
-- tocan guidebook y son pequeñas.
--
-- (A) Código de entrada como modal propio. Hoy guide_apartment_info guarda el
-- código en texto plano (content), pero no hay dónde explicar DÓNDE se recoge
-- (caja fuerte junto a la puerta, agencia, etc.) ni sus coordenadas si el
-- punto de recogida no es el propio apartamento. latitude/longitude se añaden
-- a guide_apartment_info en vez de a una tabla nueva porque es información
-- opcional de UN item concreto, no una entidad con vida propia — y es
-- deliberadamente genérico (no "door_code_latitude"): cualquier item
-- (parking, check-in) puede tener un punto de recogida distinto al del
-- apartamento. El texto de instrucciones NO necesita columna: es un field
-- más en translations (EAV), igual que ya existen 'title' y 'content' — no
-- hay que tocar el esquema para añadir 'pickup_instructions'.
--
-- (B) Teléfonos por apartamento. Verificado antes de escribir esto: no existe
-- ningún concepto de teléfono estructurado en todo el guidebook (ni en
-- guide_apartment_info/guide_info_categories de la migración 0083, que son
-- bloques de texto libre). Un teléfono necesita número + "la agencia va
-- siempre primero", que no encaja en ese modelo de texto libre. Se construye
-- en paralelo al patrón catálogo+instancia de 0083 (guide_info_categories /
-- guide_apartment_info) en vez de reutilizarlo, porque mezclar "bloque de
-- texto" y "número de teléfono con orden fijo" en la misma tabla habría
-- forzado columnas nullable a medias en ambos sentidos.
--
-- guide_phone_categories es el catálogo global (5 categorías: agencia sale
-- SIEMPRE primera por order_index, luego policía/bomberos/ambulancia/otro).
-- guide_agencies.contact_phone (existe desde 0050) es solo una sugerencia de
-- partida en el admin al crear la entrada 'agency' — cada apartamento puede
-- tener un contacto distinto al de la agencia matriz, así que NO se hace
-- ningún backfill automático desde ahí.
-- =====================================================

-- ---------------------------------------------------------
-- (A) Ubicación de recogida opcional en info items
-- ---------------------------------------------------------
ALTER TABLE guide_apartment_info ADD COLUMN latitude REAL;
ALTER TABLE guide_apartment_info ADD COLUMN longitude REAL;

-- ---------------------------------------------------------
-- (B) Teléfonos por apartamento
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS guide_phone_categories (
  key           TEXT PRIMARY KEY,
  icon_name     TEXT NOT NULL,
  order_index   INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO guide_phone_categories (key, icon_name, order_index) VALUES
('agency', 'support_agent', 10),
('police', 'local_police', 20),
('firefighters', 'local_fire_department', 30),
('ambulance', 'emergency', 40),
('custom', 'call', 999);

CREATE TABLE IF NOT EXISTS guide_apartment_phones (
  id            TEXT PRIMARY KEY,
  apartment_id  TEXT NOT NULL,
  category_key  TEXT NOT NULL,
  phone_number  TEXT NOT NULL,
  label         TEXT,
  order_index   INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (category_key) REFERENCES guide_phone_categories(key)
);

CREATE INDEX IF NOT EXISTS idx_guide_apartment_phones_apartment ON guide_apartment_phones(apartment_id, order_index);

-- ---------------------------------------------------------
-- Traducciones: nombre de categoría de teléfono, 13 idiomas activos
-- (guest-facing, se muestra tal cual en el checklist del admin y en la
-- lista de teléfonos del huésped).
-- ---------------------------------------------------------
INSERT OR IGNORE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
('agency', 'phone_category', 'es', 'name', 'Agencia / Anfitrión'),
('agency', 'phone_category', 'en', 'name', 'Host / Agency'),
('agency', 'phone_category', 'fr', 'name', 'Agence / Hôte'),
('agency', 'phone_category', 'de', 'name', 'Vermieter / Agentur'),
('agency', 'phone_category', 'it', 'name', 'Agenzia / Host'),
('agency', 'phone_category', 'pt', 'name', 'Agência / Anfitrião'),
('agency', 'phone_category', 'ca', 'name', 'Agència / Amfitrió'),
('agency', 'phone_category', 'ar', 'name', 'الوكالة / المضيف'),
('agency', 'phone_category', 'ru', 'name', 'Агентство / Хозяин'),
('agency', 'phone_category', 'uk', 'name', 'Агентство / Господар'),
('agency', 'phone_category', 'zh', 'name', '房东／中介'),
('agency', 'phone_category', 'ja', 'name', 'ホスト・管理会社'),
('agency', 'phone_category', 'ko', 'name', '호스트 / 에이전시'),

('police', 'phone_category', 'es', 'name', 'Policía'),
('police', 'phone_category', 'en', 'name', 'Police'),
('police', 'phone_category', 'fr', 'name', 'Police'),
('police', 'phone_category', 'de', 'name', 'Polizei'),
('police', 'phone_category', 'it', 'name', 'Polizia'),
('police', 'phone_category', 'pt', 'name', 'Polícia'),
('police', 'phone_category', 'ca', 'name', 'Policia'),
('police', 'phone_category', 'ar', 'name', 'الشرطة'),
('police', 'phone_category', 'ru', 'name', 'Полиция'),
('police', 'phone_category', 'uk', 'name', 'Поліція'),
('police', 'phone_category', 'zh', 'name', '警察'),
('police', 'phone_category', 'ja', 'name', '警察'),
('police', 'phone_category', 'ko', 'name', '경찰'),

('firefighters', 'phone_category', 'es', 'name', 'Bomberos'),
('firefighters', 'phone_category', 'en', 'name', 'Fire Department'),
('firefighters', 'phone_category', 'fr', 'name', 'Pompiers'),
('firefighters', 'phone_category', 'de', 'name', 'Feuerwehr'),
('firefighters', 'phone_category', 'it', 'name', 'Vigili del Fuoco'),
('firefighters', 'phone_category', 'pt', 'name', 'Bombeiros'),
('firefighters', 'phone_category', 'ca', 'name', 'Bombers'),
('firefighters', 'phone_category', 'ar', 'name', 'الإطفاء'),
('firefighters', 'phone_category', 'ru', 'name', 'Пожарная служба'),
('firefighters', 'phone_category', 'uk', 'name', 'Пожежна служба'),
('firefighters', 'phone_category', 'zh', 'name', '消防队'),
('firefighters', 'phone_category', 'ja', 'name', '消防署'),
('firefighters', 'phone_category', 'ko', 'name', '소방서'),

('ambulance', 'phone_category', 'es', 'name', 'Ambulancia / Emergencias'),
('ambulance', 'phone_category', 'en', 'name', 'Ambulance / Emergency'),
('ambulance', 'phone_category', 'fr', 'name', 'Ambulance / Urgences'),
('ambulance', 'phone_category', 'de', 'name', 'Krankenwagen / Notruf'),
('ambulance', 'phone_category', 'it', 'name', 'Ambulanza / Emergenza'),
('ambulance', 'phone_category', 'pt', 'name', 'Ambulância / Emergência'),
('ambulance', 'phone_category', 'ca', 'name', 'Ambulància / Emergències'),
('ambulance', 'phone_category', 'ar', 'name', 'الإسعاف / الطوارئ'),
('ambulance', 'phone_category', 'ru', 'name', 'Скорая помощь'),
('ambulance', 'phone_category', 'uk', 'name', 'Швидка допомога'),
('ambulance', 'phone_category', 'zh', 'name', '救护车／紧急'),
('ambulance', 'phone_category', 'ja', 'name', '救急車・緊急'),
('ambulance', 'phone_category', 'ko', 'name', '구급차 / 응급'),

('custom', 'phone_category', 'es', 'name', 'Otro'),
('custom', 'phone_category', 'en', 'name', 'Other'),
('custom', 'phone_category', 'fr', 'name', 'Autre'),
('custom', 'phone_category', 'de', 'name', 'Sonstiges'),
('custom', 'phone_category', 'it', 'name', 'Altro'),
('custom', 'phone_category', 'pt', 'name', 'Outro'),
('custom', 'phone_category', 'ca', 'name', 'Altre'),
('custom', 'phone_category', 'ar', 'name', 'أخرى'),
('custom', 'phone_category', 'ru', 'name', 'Другое'),
('custom', 'phone_category', 'uk', 'name', 'Інше'),
('custom', 'phone_category', 'zh', 'name', '其他'),
('custom', 'phone_category', 'ja', 'name', 'その他'),
('custom', 'phone_category', 'ko', 'name', '기타');
