-- ============================================================
-- Smart Hospital Management System (SHMS)
-- Migration Phase 7: Lab Tests Catalog, Lab Orders & Report Files
-- ============================================================

-- 1. Lab Tests Catalog Table
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    sample_type VARCHAR(100),
    preparation_instructions TEXT,
    turnaround_hours INT,
    unit VARCHAR(50),
    normal_min NUMERIC(10,2),
    normal_max NUMERIC(10,2),
    normal_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_lab_tests_normal_min_max CHECK (normal_min IS NULL OR normal_max IS NULL OR normal_min <= normal_max)
);

CREATE INDEX IF NOT EXISTS idx_lab_tests_category ON lab_tests(category);
CREATE INDEX IF NOT EXISTS idx_lab_tests_is_active ON lab_tests(is_active);

-- 2. Lab Orders Table
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    ordered_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'sample_collected', 'processing', 'completed', 'cancelled')),
    scheduled_date DATE,
    scheduled_time VARCHAR(20),
    notes TEXT,
    result_value TEXT,
    result_numeric NUMERIC(10,2),
    result_flag VARCHAR(20) CHECK (result_flag IN ('normal', 'low', 'high', 'abnormal', 'unknown')),
    result_notes TEXT,
    resulted_at TIMESTAMPTZ,
    resulted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invoice_item_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_number ON lab_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON lab_orders(ordered_by_doctor_id);

-- 3. Lab Report Files Table
CREATE TABLE IF NOT EXISTS lab_report_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_report_files_order ON lab_report_files(order_id);
