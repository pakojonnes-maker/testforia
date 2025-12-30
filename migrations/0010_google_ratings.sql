-- Migration: Google Ratings
-- Date: 2025-12-18
-- Description: Add restaurant_ratings table and google_review_url column to restaurant_details

-- 1. Add google_review_url to restaurant_details
ALTER TABLE restaurant_details ADD COLUMN google_review_url TEXT;

-- 2. Create restaurant_ratings table
CREATE TABLE restaurant_ratings (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  rating INTEGER NOT NULL, -- 1-5
  comment TEXT,
  
  -- Tracking Identity
  user_id TEXT,             -- Optional: Link if logged in
  visitor_id TEXT,          -- Critical: Persistent anonymous ID
  session_id TEXT,          -- Context: Link to session metrics
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 3. Index for performance
CREATE INDEX idx_rest_ratings_visitor ON restaurant_ratings(restaurant_id, visitor_id);
