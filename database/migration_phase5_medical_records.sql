-- ============================================================
-- Smart Hospital Management System (SHMS)
-- Migration Phase 5: Patient Health Profiles, Medical Records, Files & Access Logs
-- ============================================================

-- 1. Patient Health Profiles Table
CREATE TABLE IF NOT EXISTS patient_health_profiles (
    patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    allergies TEXT,
    chronic_conditions TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Medical Records Table (Ensure necessary columns & indexes exist)
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    symptoms TEXT,
    diagnosis TEXT NOT NULL,
    doctor_notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to medical_records if it was previously created with different schema
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS symptoms TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS doctor_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);

-- 3. Medical Record Files Table
CREATE TABLE IF NOT EXISTS medical_record_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_record_files_record ON medical_record_files(record_id);

-- 4. Record Access Audit Logs Table
CREATE TABLE IF NOT EXISTS record_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- view, create, update, delete, download
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_access_logs_record ON record_access_logs(record_id);
