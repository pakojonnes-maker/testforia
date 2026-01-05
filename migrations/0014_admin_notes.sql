-- Migration: Add admin_notes field for internal staff notes
-- This field is only visible/editable from the admin panel

ALTER TABLE reservations ADD COLUMN admin_notes TEXT;

-- Optional: Add table_assignment as a separate field for clarity
ALTER TABLE reservations ADD COLUMN table_assignment TEXT;
