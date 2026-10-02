-- ============================================================
-- SHMS Phase 2 Migration: Break Windows & Unique Indexes
-- ============================================================

-- 1. Add break window columns to schedules table
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS break_start_time TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS break_end_time TIME;

-- 2. Partial unique index to prevent doctor double-booking (only for active appointments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_doctor_appointment 
ON appointments (doctor_id, appointment_date, appointment_time) 
WHERE status IN ('pending', 'approved', 'completed');

-- 3. Partial unique index to prevent patient double-booking at the exact same date and time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_patient_appointment 
ON appointments (patient_id, appointment_date, appointment_time) 
WHERE status IN ('pending', 'approved', 'completed');
