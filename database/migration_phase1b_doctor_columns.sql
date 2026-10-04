-- ============================================================
-- SHMS Phase 1b Migration: Doctor Room Number
-- ============================================================

-- Add room_number column to doctors table if it does not exist
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
