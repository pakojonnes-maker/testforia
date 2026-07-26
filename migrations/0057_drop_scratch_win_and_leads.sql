-- ==================================================================================
-- REWORK DE PROMOCIONES: eliminar Scratch & Win, eventos y captura de leads.
-- El welcome_modal pasa a ser puramente informativo (sin leads ni magic links).
-- El sistema de lealtad (tarjeta de sellos) se construye desde cero en una
-- migración posterior con sus propias tablas (loyalty_programs, loyalty_cards,
-- loyalty_stamps) — no reutiliza campaign_claims/campaign_rewards.
--
-- ⚠️ IRREVERSIBLE: borra histórico de leads, premios y canjes de scratch&win.
-- Ejecutar solo tras confirmación explícita, y primero en local:
--   npx wrangler d1 execute restaurant-menu-saas --file=migrations/0057_drop_scratch_win_and_leads.sql
-- En producción (tras verificar en local):
--   npx wrangler d1 execute restaurant-menu-saas --remote --file=migrations/0057_drop_scratch_win_and_leads.sql
-- ==================================================================================

-- 1. Tablas de scratch&win / claims / tracking de campañas
DROP TABLE IF EXISTS campaign_events;
DROP TABLE IF EXISTS campaign_claims;
DROP TABLE IF EXISTS campaign_rewards;

-- 2. Captura de leads (el welcome_modal ya no captura contacto)
DROP TABLE IF EXISTS marketing_leads;

-- 3. Limpia marketing_campaigns de tipos obsoletos (scratch_win, event, exit_intent,
--    banner, newsletter). Solo queda 'welcome_modal'.
DELETE FROM marketing_campaigns WHERE type != 'welcome_modal';
