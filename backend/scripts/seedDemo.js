require('dotenv').config();
const { query, pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seedDemo() {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceProd = process.argv.includes('--force-production');

  if (isProduction && !forceProd) {
    console.error('❌ SAFETY LOCK: seedDemo.js refused to run in production mode without --force-production flag!');
    process.exit(1);
  }

  console.log('🌱 Starting Demo Data Seeding...');

  try {
    const salt = await bcrypt.genSalt(12);
    const doctorPasswordHash = await bcrypt.hash('Doctor@123456', salt);
    const patientPasswordHash = await bcrypt.hash('Patient@123456', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);

    // 1. Departments
    const deptData = [
      { name: 'Cardiology', description: 'Heart and cardiovascular system care', icon: 'heart' },
      { name: 'General Medicine', description: 'Primary health care and internal medicine', icon: 'stethoscope' },
      { name: 'Neurology', description: 'Brain and nervous system treatment', icon: 'activity' }
    ];

    const deptIds = {};
    for (const d of deptData) {
      let res = await query('SELECT id FROM departments WHERE name = $1', [d.name]);
      if (res.rows.length === 0) {
        res = await query(
          'INSERT INTO departments (name, description, icon) VALUES ($1, $2, $3) RETURNING id',
          [d.name, d.description, d.icon]
        );
      }
      deptIds[d.name] = res.rows[0].id;
    }
    console.log('  ✅ Departments verified / created');

    // 2. Demo Admin User
    let adminUserRes = await query('SELECT id FROM users WHERE email = $1', ['admin@shms.com']);
    let adminUserId;
    if (adminUserRes.rows.length === 0) {
      adminUserRes = await query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
         VALUES ($1, $2, 'admin', 'System', 'Admin', '555-0100', true, true) RETURNING id`,
        ['admin@shms.com', adminPasswordHash]
      );
    }
    adminUserId = adminUserRes.rows[0].id;
    console.log('  ✅ Admin demo user verified / created (admin@shms.com)');

    // 3. Demo Doctor Users & Profiles
    const doctorUsers = [
      {
        email: 'doctor.smith@example.com',
        firstName: 'John',
        lastName: 'Smith',
        dept: 'General Medicine',
        specialization: 'General Physician',
        registration: 'REG-10001',
        fee: 500.00
      },
      {
        email: 'doctor.patel@example.com',
        firstName: 'Aisha',
        lastName: 'Patel',
        dept: 'Cardiology',
        specialization: 'Cardiologist',
        registration: 'REG-10002',
        fee: 800.00
      }
    ];

    const doctorIds = [];
    for (const doc of doctorUsers) {
      let uRes = await query('SELECT id FROM users WHERE email = $1', [doc.email]);
      let uId;
      if (uRes.rows.length === 0) {
        uRes = await query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
           VALUES ($1, $2, 'doctor', $3, $4, '555-0101', true, true) RETURNING id`,
          [doc.email, doctorPasswordHash, doc.firstName, doc.lastName]
        );
      }
      uId = uRes.rows[0].id;

      let dRes = await query('SELECT id FROM doctors WHERE user_id = $1', [uId]);
      let dId;
      if (dRes.rows.length === 0) {
        dRes = await query(
          `INSERT INTO doctors (user_id, department_id, specialization, registration_number, consultation_fee, experience_years, rating, total_reviews)
           VALUES ($1, $2, $3, $4, $5, 10, 4.8, 5) RETURNING id`,
          [uId, deptIds[doc.dept], doc.specialization, doc.registration, doc.fee]
        );
      }
      dId = dRes.rows[0].id;
      doctorIds.push(dId);

      // Create schedule for doctor
      await query(
        `INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
         VALUES ($1, 'monday', '09:00:00', '17:00:00', 30)
         ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
        [dId]
      );
    }
    console.log('  ✅ Doctor demo users & schedules verified / created');

    // 4. Demo Patient User & Profile
    let pUserRes = await query('SELECT id FROM users WHERE email = $1', ['john.doe@example.com']);
    let pUserId;
    if (pUserRes.rows.length === 0) {
      pUserRes = await query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
         VALUES ($1, $2, 'patient', 'John', 'Doe', '555-0199', true, true) RETURNING id`,
        ['john.doe@example.com', patientPasswordHash]
      );
    }
    pUserId = pUserRes.rows[0].id;

    let pRes = await query('SELECT id FROM patients WHERE user_id = $1', [pUserId]);
    let patientId;
    if (pRes.rows.length === 0) {
      pRes = await query(
        `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, city)
         VALUES ($1, '1990-05-15', 'male', 'O+', 'New York') RETURNING id`,
        [pUserId]
      );
    }
    patientId = pRes.rows[0].id;
    console.log('  ✅ Patient demo user verified / created (john.doe@example.com)');

    // 5. Appointments
    let apptRes = await query('SELECT id FROM appointments WHERE patient_id = $1 AND doctor_id = $2', [patientId, doctorIds[0]]);
    let appointmentId;
    if (apptRes.rows.length === 0) {
      apptRes = await query(
        `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
         VALUES ($1, $2, $3, CURRENT_DATE, '10:00:00', 'completed', 'Annual health checkup', 500.00) RETURNING id`,
        [patientId, doctorIds[0], deptIds['General Medicine']]
      );
    }
    appointmentId = apptRes.rows[0].id;

    // Additional pending appointment
    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE + INTERVAL '2 days', '11:00:00', 'pending', 'Follow-up Consultation', 500.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'pending')`,
      [patientId, doctorIds[0], deptIds['General Medicine']]
    );
    console.log('  ✅ Appointments created / verified');

    // 6. Medical Record & Prescription
    let medRes = await query('SELECT id FROM medical_records WHERE patient_id = $1', [patientId]);
    let medicalRecordId;
    if (medRes.rows.length === 0) {
      medRes = await query(
        `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, chief_complaint, treatment_plan)
         VALUES ($1, $2, $3, 'Mild Hypertension', 'Mild headache and dizziness', 'Rest, low sodium diet, daily blood pressure monitor') RETURNING id`,
        [patientId, doctorIds[0], appointmentId]
      );
    }
    medicalRecordId = medRes.rows[0].id;

    let prescRes = await query('SELECT id FROM prescriptions WHERE patient_id = $1', [patientId]);
    if (prescRes.rows.length === 0) {
      const pInsert = await query(
        `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, medical_record_id, notes)
         VALUES ($1, $2, $3, $4, 'Take after meals with water') RETURNING id`,
        [patientId, doctorIds[0], appointmentId, medicalRecordId]
      );
      const prescId = pInsert.rows[0].id;

      await query(
        `INSERT INTO medicines (prescription_id, name, dosage, frequency, duration)
         VALUES ($1, 'Amlodipine', '5mg', 'Once daily', '30 days')`,
        [prescId]
      );
    }
    console.log('  ✅ Medical records & prescription verified / created');

    // 7. Invoice & Payment
    let invRes = await query('SELECT id FROM invoices WHERE patient_id = $1', [patientId]);
    if (invRes.rows.length === 0) {
      const invInsert = await query(
        `INSERT INTO invoices (invoice_number, patient_id, doctor_id, appointment_id, subtotal, tax_amount, total_amount, paid_amount, status, created_by)
         VALUES ('INV-2026-0001', $1, $2, $3, 500.00, 90.00, 590.00, 590.00, 'paid', $4) RETURNING id`,
        [patientId, doctorIds[0], appointmentId, adminUserId]
      );
      const invId = invInsert.rows[0].id;

      await query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
         VALUES ($1, 'General Consultation Fee', 1, 500.00, 500.00)`,
        [invId]
      );

      await query(
        `INSERT INTO payments (invoice_id, amount, payment_method, status, transaction_ref, recorded_by)
         VALUES ($1, 590.00, 'card', 'success', 'TXN-99887766', $2)`,
        [invId, adminUserId]
      );
    }
    console.log('  ✅ Invoices & payments verified / created');

    // 8. Doctor Review
    await query(
      `INSERT INTO doctor_reviews (doctor_id, patient_id, appointment_id, rating, review_text)
       SELECT $1, $2, $3, 5, 'Great experience! Very attentive doctor.'
       WHERE NOT EXISTS (SELECT 1 FROM doctor_reviews WHERE patient_id = $2 AND doctor_id = $1)`,
      [doctorIds[0], patientId, appointmentId]
    );
    console.log('  ✅ Doctor reviews verified / created');

    console.log('\n🎉 Demo Data Seeding Completed Successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Credentials for Local Development:');
    console.log('  - Admin:   admin@shms.com           / Admin@123456');
    console.log('  - Doctor:  doctor.smith@example.com / Doctor@123456');
    console.log('  - Patient: john.doe@example.com     / Patient@123456');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Demo Data Seeding Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDemo();
