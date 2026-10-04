-- ============================================================
-- SHMS Phase 3.5b Migration: Appointment Status Enum Enhancement
-- ============================================================

-- Safely add 'needs_reschedule' to appointment_status enum in a standalone file
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'needs_reschedule';
