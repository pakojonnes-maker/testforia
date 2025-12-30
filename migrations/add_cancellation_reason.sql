-- Migration: Add cancellation_reason to reservations table
-- Date: 2025-12-17

ALTER TABLE reservations ADD COLUMN cancellation_reason TEXT;
