-- Migration Phase 14.4: Family & Dependent Profiles
-- Safe to run multiple times (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS patient_guardians (
    id SERIAL PRIMARY KEY,
    guardian_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dependent_patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    relation VARCHAR(20) NOT NULL CHECK (relation IN ('parent', 'child', 'spouse', 'sibling', 'grandparent', 'other')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_guardians_guardian ON patient_guardians(guardian_patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_guardians_dependent ON patient_guardians(dependent_patient_id);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_dependent BOOLEAN DEFAULT false;
