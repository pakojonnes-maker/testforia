-- =====================================================
-- MIGRACIÓN 0112: un bloque de la guía en varios pisos de la misma agencia
-- =====================================================
-- Por qué: en un edificio con diez pisos, «Acceso al edificio», «Piscina» o
-- «Normas de la comunidad» son el mismo texto. Hasta ahora había que escribirlo
-- (y traducirlo a 13 idiomas) diez veces, y corregirlo diez veces.
--
-- Modelo: el bloque sigue siendo UNA fila de guide_apartment_info, de su piso de
-- origen (apartment_id), con sus traducciones, fotos y pasos. Esta tabla lo añade
-- a otros pisos de la MISMA agencia, cada uno con su propio orden. Editarlo desde
-- cualquiera de ellos lo cambia en todos.
--
-- No se reconstruye guide_apartment_info (apartment_id NULL + agency_id): en D1
-- un DROP TABLE dispara los ON DELETE CASCADE y se llevaría fotos y pasos.
--
-- Si se borra el piso de origen, el bloque pasa a uno de los pisos con los que
-- se comparte (deleteApartment / transferSharedBlocks en workerGuideAdmin.js).
-- =====================================================

CREATE TABLE IF NOT EXISTS guide_info_shares (
    info_id      TEXT NOT NULL,
    apartment_id TEXT NOT NULL,
    -- Posición del bloque en la guía de ESTE piso (la del piso de origen va en
    -- guide_apartment_info.order_index).
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (info_id, apartment_id),
    FOREIGN KEY (info_id) REFERENCES guide_apartment_info(id) ON DELETE CASCADE,
    FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

-- La guía pública busca por piso.
CREATE INDEX IF NOT EXISTS idx_guide_info_shares_apartment ON guide_info_shares(apartment_id);
