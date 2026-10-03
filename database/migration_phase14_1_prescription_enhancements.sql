-- ============================================================
-- Migration: Phase 14.1 Prescription Enhancements
-- Adds verification codes, prescription shares, and doctor signature
-- Safe to execute multiple times (Idempotent)
-- ============================================================

-- 1. Add verification_code to prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS verification_code VARCHAR(64) UNIQUE;

-- 2. Add signature_url to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 3. Create prescription_shares table for time-limited share links
CREATE TABLE IF NOT EXISTS prescription_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_prescriptions_verification_code ON prescriptions(verification_code);
CREATE INDEX IF NOT EXISTS idx_prescription_shares_token_hash ON prescription_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_prescription_shares_prescription_id ON prescription_shares(prescription_id);
