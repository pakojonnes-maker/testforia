-- 0109 — Índice por visitante en guide_store_orders
--
-- El límite de pedidos de la Tienda (POST /guide/store/orders, ruta pública) deja
-- de contar en KV y pasa a contar los pedidos que ya se guardan aquí:
-- overHourlyLimit() en workerGuideStore.js pide, en cada pedido, cuántos envíos
-- ha hecho ese apartamento y ese visitante en la última hora.
--
-- La mitad por apartamento ya tiene índice (idx_guide_store_orders_apt, de la
-- 0080). La mitad por visitante no: sin este índice recorre la tabla entera en
-- cada pedido. Hoy la tabla es pequeña y da igual; el día que alguien la llene a
-- propósito, cada pedido leería todas sus filas y el cupo diario de lecturas de
-- D1 (plan Free) se iría en protegerse.
--
-- No cambia datos. El worker funciona igual antes y después de aplicarla.
--
-- (La 0108 es el índice por IP de security_audit_log, del mismo cambio en el
-- login y el PIN de sellos.)

CREATE INDEX IF NOT EXISTS idx_guide_store_orders_visitor ON guide_store_orders(visitor_id, created_at);
