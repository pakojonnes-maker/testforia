-- Migration: Reservation Schedule Improvements
-- Date: 2025-12-23

ALTER TABLE reservation_settings ADD COLUMN closed_dates TEXT; -- JSON array of YYYY-MM-DD
ALTER TABLE reservation_settings ADD COLUMN advance_days INTEGER DEFAULT 30; -- How many days in advance to allow booking
ALTER TABLE reservation_settings ADD COLUMN holiday_closures TEXT; -- JSON object for recurrence or labels
