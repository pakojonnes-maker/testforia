-- Migration: Reservations Module
-- Author: Antigravity
-- Date: 2025-12-14

-- 1. Reservation Settings (Configuration per restaurant)
CREATE TABLE reservation_settings (
  restaurant_id TEXT PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT FALSE, -- Master toggle
  
  -- Capacity and Timing
  max_capacity INTEGER NOT NULL DEFAULT 50, -- Total capacity (default fallback)
  max_party_size INTEGER DEFAULT 10,
  min_party_size INTEGER DEFAULT 1,
  slot_duration_minutes INTEGER DEFAULT 90,
  gap_between_slots_minutes INTEGER DEFAULT 15,
  
  -- Business Rules (Future proofing for No-shows)
  requires_deposit BOOLEAN DEFAULT FALSE, 
  deposit_amount_per_person REAL DEFAULT 0, 
  auto_confirm BOOLEAN DEFAULT TRUE,
  
  -- Messages & Legal
  terms_and_conditions TEXT,
  privacy_policy_link TEXT,
  
  -- Availability Schedule (JSON)
  -- Format: { "monday": [{ "start": "13:00", "end": "15:30" }], ... }
  booking_availability JSON, 
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 2. Reservations (Transactional)
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  user_id TEXT, -- Optional, if user is logged in
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  
  reservation_date TEXT NOT NULL, -- YYYY-MM-DD
  reservation_time TEXT NOT NULL, -- HH:MM
  party_size INTEGER NOT NULL,
  
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled_user, cancelled_restaurant, completed, no_show
  
  special_requests TEXT,
  occasion TEXT,
  cancellation_reason TEXT,
  
  -- Legal / System Data
  accepted_policy BOOLEAN DEFAULT FALSE, -- GDPR Critical
  accepted_marketing BOOLEAN DEFAULT FALSE, -- Separate GDPR
  ip_address TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 3. Waitlist
CREATE TABLE reservation_waitlist (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_contact_method TEXT NOT NULL, -- 'email', 'whatsapp', 'phone'
  client_contact_value TEXT NOT NULL,
  
  desired_date TEXT NOT NULL,
  desired_time_range TEXT, -- "20:00-22:00"
  party_size INTEGER NOT NULL,
  
  notes TEXT,
  status TEXT DEFAULT 'waiting', -- waiting, contacted, converted, cancelled
  
  accepted_policy BOOLEAN DEFAULT FALSE, -- GDPR Critical
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 4. Audit Logs
CREATE TABLE reservation_logs (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'status_change', 'modified', 'cancelled'
  previous_state TEXT, 
  new_state TEXT, 
  changed_by TEXT, -- 'system', 'user', 'staff:ID'
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_reservations_restaurant_date ON reservations(restaurant_id, reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_waitlist_restaurant_date ON reservation_waitlist(restaurant_id, desired_date);
