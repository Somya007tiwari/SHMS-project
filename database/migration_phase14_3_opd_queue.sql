-- Migration Phase 14.3: OPD Token System and Live Queue
-- Safe to run multiple times (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS queue_tokens (
    id SERIAL PRIMARY KEY,
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    queue_date DATE NOT NULL,
    token_number INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_consultation', 'completed', 'skipped', 'no_show')),
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_doctor_date_token UNIQUE (doctor_id, queue_date, token_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_tokens_doctor_date_status ON queue_tokens(doctor_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_appointment_id ON queue_tokens(appointment_id);
