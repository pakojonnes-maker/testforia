-- 0096_ai_usage_daily.sql
-- =====================================================
-- Gasto diario de Workers AI, en neuronas reales, por ámbito.
--
-- Por qué existe: el chat del guidebook (workerGuideAI.js) y el traductor
-- (workerGuideTranslate.js) comparten las 10.000 neuronas gratis al día de la
-- cuenta (plan Workers Free: al pasarlas, Workers AI da error 3036). Antes cada
-- uno contaba a su manera en KV: el chat, mensajes (no neuronas) y con 4
-- escrituras KV por mensaje; el traductor, 1 escritura por llamada. En el plan
-- Free KV admite solo 1.000 escrituras al día para TODA la cuenta, y la caché de
-- las guías también escribe ahí: agotarla rompía las guías. D1 admite 100.000
-- escrituras/día y el upsert es atómico. La lógica vive en workerAiBudget.js.
--
-- scope: 'chat' | 'translate' | 'chat:apt:<apartment_id>'
-- day:   YYYY-MM-DD en UTC, el mismo reloj con el que Cloudflare reinicia el cupo.
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_usage_daily (
    day      TEXT    NOT NULL,
    scope    TEXT    NOT NULL,
    neurons  REAL    NOT NULL DEFAULT 0,
    calls    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, scope)
);
