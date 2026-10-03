-- Migration Phase 14.2: Emergency Health Card
-- Safe to run multiple times (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS emergency_cards (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    show_blood_group BOOLEAN DEFAULT true,
    show_allergies BOOLEAN DEFAULT true,
    show_conditions BOOLEAN DEFAULT false,
    show_contact BOOLEAN DEFAULT true,
    show_age BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMP NULL,
    view_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_emergency_cards_patient_id ON emergency_cards(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_cards_token_hash ON emergency_cards(token_hash);
