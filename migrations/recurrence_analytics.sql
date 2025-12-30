-- Migration: Recurrence Analytics (Smart Session)
-- Author: Antigravity
-- Date: 2025-12-17
-- Description: Adds persistent visitor tracking and recurrence metrics.

-- 1. Update Sessions Table
ALTER TABLE sessions ADD COLUMN visitor_id TEXT;
ALTER TABLE sessions ADD COLUMN visit_count INTEGER DEFAULT 1;

-- 2. Update Daily Analytics Table
ALTER TABLE daily_analytics ADD COLUMN new_visitors INTEGER DEFAULT 0;
ALTER TABLE daily_analytics ADD COLUMN returning_visitors INTEGER DEFAULT 0;

-- 3. Create Index for fast lookups (Recurrence Check)
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id, restaurant_id);
