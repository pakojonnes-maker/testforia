-- Migration: Add is_superadmin to users table
ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE;
