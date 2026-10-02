-- ============================================================
-- Optional Performance Indexes for Phase 9 Analytics
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at_status ON payments(paid_at, status);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status_total ON invoices(status, total_amount);
