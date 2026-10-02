-- ============================================================
-- Smart Hospital Management System (SHMS)
-- Migration Phase 6: Prescription Management & Items
-- ============================================================

-- 1. Create sequence for human-readable prescription numbers
CREATE SEQUENCE IF NOT EXISTS prescription_seq START WITH 100001;

-- 2. Upgrade prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(50) UNIQUE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS advice TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up_date DATE;

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON prescriptions(prescription_number);

-- 3. Create prescription_items table for structured medicines
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    timing VARCHAR(100) DEFAULT 'After food',
    instructions TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine_name ON prescription_items(medicine_name);
