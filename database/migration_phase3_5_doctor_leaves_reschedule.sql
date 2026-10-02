-- ============================================================
-- SHMS Phase 3.5 Migration: Doctor Leaves & Rescheduling
-- ============================================================

-- 1. Safely add 'needs_reschedule' to appointment_status enum
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'needs_reschedule';

-- 2. Create doctor_leaves table
CREATE TABLE IF NOT EXISTS doctor_leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

-- 3. Create index for efficient leave range lookup
CREATE INDEX IF NOT EXISTS idx_doctor_leaves_doctor_dates 
ON doctor_leaves (doctor_id, start_date, end_date);

-- 4. Add rescheduling columns to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;
