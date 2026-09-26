-- ============================================================
-- SHMS Seed Data
-- ============================================================

-- System Settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('hospital_name', 'Smart Hospital Management System', 'Hospital Name', true),
('hospital_phone', '+91-9876543210', 'Hospital Phone', true),
('hospital_email', 'info@smarthospital.com', 'Hospital Email', true),
('hospital_address', '123 Healthcare Blvd, Medical District, Mumbai 400001', 'Hospital Address', true),
('tax_percentage', '18', 'Default GST percentage', false),
('appointment_slot_duration', '30', 'Appointment slot duration in minutes', false),
('max_appointments_per_day', '20', 'Max appointments per doctor per day', false),
('currency', 'INR', 'Default currency', true),
('currency_symbol', '₹', 'Currency symbol', true);

-- Departments
INSERT INTO departments (id, name, description, icon) VALUES
('d1000000-0000-0000-0000-000000000001', 'Cardiology', 'Heart and cardiovascular system diseases', 'heart'),
('d1000000-0000-0000-0000-000000000002', 'Neurology', 'Nervous system and brain disorders', 'brain'),
('d1000000-0000-0000-0000-000000000003', 'Orthopedics', 'Bone, joint and musculoskeletal conditions', 'bone'),
('d1000000-0000-0000-0000-000000000004', 'Pediatrics', 'Medical care for infants, children and adolescents', 'baby'),
('d1000000-0000-0000-0000-000000000005', 'Dermatology', 'Skin, hair, and nail conditions', 'shield'),
('d1000000-0000-0000-0000-000000000006', 'Ophthalmology', 'Eye care and vision disorders', 'eye'),
('d1000000-0000-0000-0000-000000000007', 'Psychiatry', 'Mental health and behavioral disorders', 'brain'),
('d1000000-0000-0000-0000-000000000008', 'Gynecology', 'Women''s reproductive health', 'heart'),
('d1000000-0000-0000-0000-000000000009', 'Oncology', 'Cancer diagnosis and treatment', 'activity'),
('d1000000-0000-0000-0000-000000000010', 'General Medicine', 'Primary care and general health', 'stethoscope');

-- Admin User (password: Admin@123456)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified) VALUES
('u1000000-0000-0000-0000-000000000001', 'admin@shms.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'admin', 'Super', 'Admin', '+91-9000000001', true, true);

-- Doctor Users (password: Doctor@123456)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified) VALUES
('u2000000-0000-0000-0000-000000000001', 'dr.sharma@shms.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'doctor', 'Rajesh', 'Sharma', '+91-9000000002', true, true),
('u2000000-0000-0000-0000-000000000002', 'dr.patel@shms.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'doctor', 'Priya', 'Patel', '+91-9000000003', true, true),
('u2000000-0000-0000-0000-000000000003', 'dr.khan@shms.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'doctor', 'Arjun', 'Khan', '+91-9000000004', true, true),
('u2000000-0000-0000-0000-000000000004', 'dr.gupta@shms.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'doctor', 'Sunita', 'Gupta', '+91-9000000005', true, true),
('u2000000-0000-0000-0000-000000000005', 'dr.mehta@shms.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'doctor', 'Vikram', 'Mehta', '+91-9000000006', true, true);

-- Patient Users (password: Patient@123456)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified) VALUES
('u3000000-0000-0000-0000-000000000001', 'john.doe@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'patient', 'John', 'Doe', '+91-9111111001', true, true),
('u3000000-0000-0000-0000-000000000002', 'jane.smith@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'patient', 'Jane', 'Smith', '+91-9111111002', true, true),
('u3000000-0000-0000-0000-000000000003', 'ravi.kumar@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'patient', 'Ravi', 'Kumar', '+91-9111111003', true, true),
('u3000000-0000-0000-0000-000000000004', 'anita.singh@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'patient', 'Anita', 'Singh', '+91-9111111004', true, true),
('u3000000-0000-0000-0000-000000000005', 'michael.brown@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgV8n7k6E3sP4U2Y3J9qG.', 'patient', 'Michael', 'Brown', '+91-9111111005', true, true);

-- Doctor Profiles
INSERT INTO doctors (id, user_id, department_id, specialization, qualification, experience_years, registration_number, consultation_fee, bio, languages_spoken, rating, total_reviews) VALUES
('doc00000-0000-0000-0000-000000000001', 'u2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Interventional Cardiology', 'MD, DM Cardiology - AIIMS Delhi', 15, 'MCI-2008-CAR-001', 1500.00, 'Dr. Rajesh Sharma is a leading interventional cardiologist with over 15 years of experience in treating complex heart conditions.', ARRAY['Hindi', 'English'], 4.8, 234),
('doc00000-0000-0000-0000-000000000002', 'u2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'Neurology', 'MD, DM Neurology - PGI Chandigarh', 12, 'MCI-2010-NEU-002', 1200.00, 'Dr. Priya Patel specializes in diagnosing and treating disorders of the nervous system including epilepsy and stroke.', ARRAY['Hindi', 'English', 'Gujarati'], 4.7, 189),
('doc00000-0000-0000-0000-000000000003', 'u2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'Orthopedic Surgery', 'MS Orthopedics - KEM Hospital Mumbai', 10, 'MCI-2012-ORT-003', 1000.00, 'Dr. Arjun Khan is an expert in joint replacement surgery and sports medicine.', ARRAY['Hindi', 'English', 'Urdu'], 4.6, 156),
('doc00000-0000-0000-0000-000000000004', 'u2000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 'Pediatrics', 'MD Pediatrics - Maulana Azad Medical College', 8, 'MCI-2014-PED-004', 800.00, 'Dr. Sunita Gupta provides comprehensive medical care to children from newborns to adolescents.', ARRAY['Hindi', 'English', 'Punjabi'], 4.9, 312),
('doc00000-0000-0000-0000-000000000005', 'u2000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 'Dermatology', 'MD Dermatology - Grant Medical College', 7, 'MCI-2015-DER-005', 900.00, 'Dr. Vikram Mehta is an experienced dermatologist specializing in medical and cosmetic dermatology.', ARRAY['Hindi', 'English', 'Marathi'], 4.5, 143);

-- Patient Profiles
INSERT INTO patients (id, user_id, date_of_birth, gender, blood_group, address, city, state, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions) VALUES
('pat00000-0000-0000-0000-000000000001', 'u3000000-0000-0000-0000-000000000001', '1985-03-15', 'male', 'O+', '45 Green Park, Vasant Kunj', 'New Delhi', 'Delhi', 'Mary Doe', '+91-9222222001', ARRAY['Penicillin'], ARRAY['Hypertension']),
('pat00000-0000-0000-0000-000000000002', 'u3000000-0000-0000-0000-000000000002', '1990-07-22', 'female', 'A+', '12 Rose Gardens, Banjara Hills', 'Hyderabad', 'Telangana', 'Robert Smith', '+91-9222222002', ARRAY[]::TEXT[], ARRAY['Diabetes Type 2']),
('pat00000-0000-0000-0000-000000000003', 'u3000000-0000-0000-0000-000000000003', '1978-11-08', 'male', 'B+', '78 Lake View, Koramangala', 'Bangalore', 'Karnataka', 'Meena Kumar', '+91-9222222003', ARRAY['Sulfa drugs', 'Aspirin'], ARRAY[]::TEXT[]),
('pat00000-0000-0000-0000-000000000004', 'u3000000-0000-0000-0000-000000000004', '1995-05-30', 'female', 'AB-', '23 Hill Road, Bandra', 'Mumbai', 'Maharashtra', 'Rajesh Singh', '+91-9222222004', ARRAY[]::TEXT[], ARRAY['Asthma']),
('pat00000-0000-0000-0000-000000000005', 'u3000000-0000-0000-0000-000000000005', '1970-09-12', 'male', 'O-', '67 Park Street, Park Street Area', 'Kolkata', 'West Bengal', 'Sarah Brown', '+91-9222222005', ARRAY['Latex'], ARRAY['Heart Disease', 'Hypertension']);

-- Doctor Schedules
INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients) VALUES
('doc00000-0000-0000-0000-000000000001', 'monday', '09:00', '13:00', 30, 8),
('doc00000-0000-0000-0000-000000000001', 'wednesday', '09:00', '13:00', 30, 8),
('doc00000-0000-0000-0000-000000000001', 'friday', '14:00', '18:00', 30, 8),
('doc00000-0000-0000-0000-000000000002', 'tuesday', '10:00', '14:00', 30, 8),
('doc00000-0000-0000-0000-000000000002', 'thursday', '10:00', '14:00', 30, 8),
('doc00000-0000-0000-0000-000000000002', 'saturday', '09:00', '12:00', 30, 6),
('doc00000-0000-0000-0000-000000000003', 'monday', '14:00', '18:00', 30, 8),
('doc00000-0000-0000-0000-000000000003', 'wednesday', '14:00', '18:00', 30, 8),
('doc00000-0000-0000-0000-000000000003', 'friday', '09:00', '13:00', 30, 8),
('doc00000-0000-0000-0000-000000000004', 'monday', '09:00', '17:00', 20, 16),
('doc00000-0000-0000-0000-000000000004', 'tuesday', '09:00', '17:00', 20, 16),
('doc00000-0000-0000-0000-000000000004', 'thursday', '09:00', '17:00', 20, 16),
('doc00000-0000-0000-0000-000000000005', 'tuesday', '11:00', '15:00', 30, 8),
('doc00000-0000-0000-0000-000000000005', 'thursday', '11:00', '15:00', 30, 8),
('doc00000-0000-0000-0000-000000000005', 'saturday', '10:00', '14:00', 30, 8);

-- Sample Appointments
INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee) VALUES
('pat00000-0000-0000-0000-000000000001', 'doc00000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', CURRENT_DATE + 2, '09:00', 'approved', 'Regular cardiac checkup', 1500.00),
('pat00000-0000-0000-0000-000000000002', 'doc00000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', CURRENT_DATE + 3, '10:00', 'pending', 'Persistent headache', 1200.00),
('pat00000-0000-0000-0000-000000000003', 'doc00000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', CURRENT_DATE - 5, '14:00', 'completed', 'Knee pain', 1000.00),
('pat00000-0000-0000-0000-000000000004', 'doc00000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, '09:30', 'completed', 'Child vaccination', 800.00),
('pat00000-0000-0000-0000-000000000005', 'doc00000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', CURRENT_DATE - 10, '11:00', 'completed', 'ECG and heart evaluation', 1500.00);
