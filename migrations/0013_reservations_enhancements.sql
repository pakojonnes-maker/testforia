-- Migration: Reservations Enhancements
-- Description: Add magic link token for self-service and reminder tracking

ALTER TABLE reservations ADD COLUMN magic_link_token TEXT;
ALTER TABLE reservations ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reservations_token ON reservations(magic_link_token);
