-- 0105 — Láminas con QR para enmarcar («QR para enmarcar» del admin del guidebook).
--
-- 1. guide_qr_posters: la lámina de fondo de cada zona. Una fila activa por zona. Sustituirla
--    desactiva la anterior y crea otra con clave R2 NUEVA: /media/ se sirve con caché de 24 h,
--    así que reutilizar la clave enseñaría la lámina vieja un día entero.
--    qr_x / qr_y: dónde cae el centro del marco, en fracción de la lámina (cada dibujo tiene
--    su hueco: en Málaga el centro es cielo, en Mijas es el pueblo).
-- 2. guide_agencies.qr_design: el diseño del QR y del marco, JSON, uno por agencia. Lo escribe
--    workerGuideQr.js, NO updateAgency: ese sube la versión de caché KV de cada piso y aquí no
--    cambia nada de lo que ve el huésped.
-- 3. guide_sessions.entry_source: por dónde entró el huésped. Hoy solo 'marco' (el QR impreso
--    lleva ?o=marco). Viaja en la URL, no se guarda nada en el móvil: el modelo anónimo no cambia.
--
-- Las siete láminas ya están en R2 (subidas el 2026-10-10). Se siembran por slug de zona: si
-- una zona no existiera, su fila no se inserta y el resto sigue.

CREATE TABLE IF NOT EXISTS guide_qr_posters (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  qr_x REAL NOT NULL DEFAULT 0.5,
  qr_y REAL NOT NULL DEFAULT 0.55,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_guide_qr_posters_zone ON guide_qr_posters(zone_id, is_active);

ALTER TABLE guide_agencies ADD COLUMN qr_design TEXT;

ALTER TABLE guide_sessions ADD COLUMN entry_source TEXT;

-- Casi todas las sesiones llevan entry_source NULL: el índice parcial solo guarda las del marco.
CREATE INDEX IF NOT EXISTS idx_guide_sessions_entry_source
  ON guide_sessions(apartment_id, started_at) WHERE entry_source IS NOT NULL;

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_benalmadena', id, 'Póster vintage · Benalmádena', 'guide/qr-posters/poster-vintage-benalmadena.png', 896, 1200, 0.5, 0.52
FROM guide_zones WHERE slug = 'benalmadena' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_benalmadena');

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_fuengirola', id, 'Póster vintage · Fuengirola', 'guide/qr-posters/poster-vintage-fuengirola.png', 896, 1200, 0.5, 0.56
FROM guide_zones WHERE slug = 'fuengirola' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_fuengirola');

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_malaga', id, 'Póster vintage · Málaga', 'guide/qr-posters/poster-vintage-malaga.png', 896, 1200, 0.5, 0.545
FROM guide_zones WHERE slug = 'malaga' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_malaga');

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_marbella', id, 'Póster vintage · Marbella', 'guide/qr-posters/poster-vintage-marbella.png', 896, 1200, 0.5, 0.55
FROM guide_zones WHERE slug = 'marbella' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_marbella');

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_mijas', id, 'Póster vintage · Mijas Pueblo', 'guide/qr-posters/poster-vintage-mijas-pueblo.png', 896, 1200, 0.5, 0.56
FROM guide_zones WHERE slug = 'mijas' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_mijas');

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_nerja', id, 'Póster vintage · Nerja', 'guide/qr-posters/poster-vintage-nerja.png', 896, 1200, 0.5, 0.56
FROM guide_zones WHERE slug = 'nerja' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_nerja');

INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
SELECT 'qrp_torremolinos', id, 'Póster vintage · Torremolinos', 'guide/qr-posters/poster-vintage-torremolinos.png', 896, 1200, 0.5, 0.52
FROM guide_zones WHERE slug = 'torremolinos' AND NOT EXISTS (SELECT 1 FROM guide_qr_posters WHERE id = 'qrp_torremolinos');
