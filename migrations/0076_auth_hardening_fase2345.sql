-- Fase 2, 3, 4, 5 del endurecimiento del login (ver conversación con Claude,
-- julio 2026). Todo aditivo: ninguna columna ni tabla existente se toca, así
-- que no hay downtime ni backfill que hacer a mano.

-- ---------------------------------------------------------------------------
-- Fase 5 — log de auditoría de seguridad
-- ---------------------------------------------------------------------------
-- No sustituye a los logs de Cloudflare (efímeros); esto es la fuente de
-- verdad para "¿quién hizo qué" de cara a RGPD Art. 33 y a investigar un
-- incidente. Escritura best-effort desde el código: un fallo al loguear
-- nunca debe romper la operación real.
CREATE TABLE security_audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,            -- NULL si el login falló contra un email inexistente
  target_user_id TEXT,     -- para acciones sobre otra cuenta (invitar, resetear)
  restaurant_id TEXT,
  ip TEXT,
  user_agent TEXT,
  detail TEXT,             -- JSON libre con contexto adicional
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_audit_created ON security_audit_log(created_at);
CREATE INDEX idx_audit_event ON security_audit_log(event_type);

-- ---------------------------------------------------------------------------
-- Fase 2 — sesiones revocables
-- ---------------------------------------------------------------------------
-- No hay tabla de sesiones por dispositivo (eso exigiría refresh tokens +
-- cookies + mover el worker a un dominio propio, ver SECRETS.md). En su lugar,
-- un contador por usuario: cada JWT lleva el valor vigente en el momento de
-- emitirse; si no coincide con el de `users` en el momento de la request, el
-- token se trata como revocado. Logout y cambio de contraseña incrementan
-- este contador, así que invalidan TODOS los tokens de esa cuenta a la vez
-- (no solo el del dispositivo que hizo logout) — limitación aceptada mientras
-- no haya sesiones por dispositivo.
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Fase 3 — altas por invitación (sin contraseñas en claro)
-- ---------------------------------------------------------------------------
-- Sustituye a "generar una contraseña aleatoria y devolverla en la respuesta".
-- Solo se guarda el HASH del token; el token en claro únicamente existe en el
-- enlace que se envía (por email o, si no hay proveedor configurado, a mano).
-- Sirve tanto para altas nuevas como para "olvidé mi contraseña": el
-- comportamiento en la redención depende de si el email ya tiene cuenta.
CREATE TABLE admin_invitations (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  restaurant_id TEXT,
  agency_id TEXT,          -- reservado: hoy solo se emiten invitaciones de restaurante
  role TEXT NOT NULL DEFAULT 'staff',
  invited_by TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invited_by) REFERENCES users(id)
);
CREATE INDEX idx_invitations_email ON admin_invitations(email);
CREATE INDEX idx_invitations_token_hash ON admin_invitations(token_hash);

-- ---------------------------------------------------------------------------
-- Fase 4 — MFA (TOTP, RFC 6238)
-- ---------------------------------------------------------------------------
-- totp_secret es sensible (equivale a la contraseña mientras MFA esté activo)
-- pero D1 no ofrece cifrado a nivel de columna; se acepta el mismo riesgo que
-- ya existe para password_hash. totp_recovery_codes guarda HASHES, nunca los
-- códigos en claro.
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_recovery_codes TEXT;
