require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query, pool } = require('../src/config/database');

// Migration table dependencies check map
const REQUIRED_TABLES_MAP = [
  { table: 'users', migration: 'database/schema.sql' },
  { table: 'patients', migration: 'database/schema.sql' },
  { table: 'doctors', migration: 'database/schema.sql' },
  { table: 'departments', migration: 'database/schema.sql' },
  { table: 'schedules', migration: 'database/schema.sql' },
  { table: 'appointments', migration: 'database/schema.sql' },
  { table: 'medical_records', migration: 'database/schema.sql' },
  { table: 'prescriptions', migration: 'database/schema.sql' },
  { table: 'lab_tests', migration: 'database/schema.sql' },
  { table: 'lab_orders', migration: 'database/schema.sql' },
  { table: 'bills', migration: 'database/schema.sql' },
  { table: 'payments', migration: 'database/schema.sql' },
  { table: 'notifications', migration: 'database/schema.sql' },
  { table: 'doctor_reviews', migration: 'database/migration_phase3_doctor_reviews.sql' },
  { table: 'doctor_leaves', migration: 'database/migration_phase3_5_doctor_leaves_reschedule.sql' },
  { table: 'medical_record_files', migration: 'database/migration_phase5_medical_records.sql' },
  { table: 'prescription_items', migration: 'database/migration_phase6_prescriptions.sql' },
  { table: 'lab_report_files', migration: 'database/migration_phase7_lab_tests_and_reports.sql' },
  { table: 'invoices', migration: 'database/migration_phase8_invoices_and_payments.sql' },
  { table: 'invoice_items', migration: 'database/migration_phase8_invoices_and_payments.sql' },
  { table: 'audit_logs', migration: 'database/migration_phase11_security_and_audit.sql' },
  { table: 'patient_health_profiles', migration: 'database/migration_phase11_security_and_audit.sql' },
  { table: 'prescription_shares', migration: 'database/migration_phase14_1_prescription_enhancements.sql' },
  { table: 'emergency_cards', migration: 'database/migration_phase14_2_emergency_card.sql' },
  { table: 'queue_tokens', migration: 'database/migration_phase14_3_opd_queue.sql' },
  { table: 'patient_guardians', migration: 'database/migration_phase14_4_family_guardians.sql' }
];

async function verifyTablesExist() {
  const res = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const existingTables = new Set(res.rows.map(r => r.table_name));
  const missingMigrations = [];

  for (const item of REQUIRED_TABLES_MAP) {
    if (!existingTables.has(item.table)) {
      if (!missingMigrations.includes(item.migration)) {
        missingMigrations.push(item.migration);
      }
    }
  }

  if (missingMigrations.length > 0) {
    console.error('❌ SAFETY LOCK: seedDemo.js cannot run because required database tables are missing!');
    console.error('Please run the following migration SQL files in order in pgAdmin first:');
    missingMigrations.forEach((m, idx) => console.error(`  ${idx + 1}. ${m}`));
    process.exit(1);
  }
}

function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function seedDemo() {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceProd = process.argv.includes('--force-production');

  if (isProduction && !forceProd) {
    console.error('❌ SAFETY LOCK: seedDemo.js refused to run in production mode without --force-production flag!');
    process.exit(1);
  }

  console.log('🌱 Starting Enterprise Demo Data Seeding...');
  await verifyTablesExist();
  console.log('  ✅ Database tables verification passed');

  try {
    const salt = await bcrypt.genSalt(12);
    const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
    const doctorPasswordHash = await bcrypt.hash('Doctor@123456', salt);
    const patientPasswordHash = await bcrypt.hash('Patient@123456', salt);

    const todayDate = getTodayIST();

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. DEPARTMENTS
    // ─────────────────────────────────────────────────────────────────────────────
    const deptData = [
      { name: 'General Medicine', description: 'Primary health care and internal medicine', icon: 'stethoscope' },
      { name: 'Cardiology', description: 'Heart and cardiovascular health care', icon: 'heart' },
      { name: 'Neurology', description: 'Brain, spine and nervous system treatment', icon: 'activity' },
      { name: 'Pediatrics', description: 'Comprehensive infant, child, and adolescent care', icon: 'users' }
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

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. ADMIN USER
    // ─────────────────────────────────────────────────────────────────────────────
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
    console.log('  ✅ Admin user verified / created (admin@shms.com)');

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. DOCTOR USERS & PROFILES (5 Doctors with Room Assignments)
    // ─────────────────────────────────────────────────────────────────────────────
    const doctorUsers = [
      {
        email: 'doctor.smith@example.com',
        firstName: 'John',
        lastName: 'Smith',
        dept: 'General Medicine',
        specialization: 'General Physician',
        registration: 'REG-10001',
        fee: 500.00,
        room: 'Room 101',
        experience: 12,
        isAvailable: true
      },
      {
        email: 'doctor.patel@example.com',
        firstName: 'Aisha',
        lastName: 'Patel',
        dept: 'Cardiology',
        specialization: 'Senior Cardiologist',
        registration: 'REG-10002',
        fee: 800.00,
        room: 'Room 202',
        experience: 15,
        isAvailable: true
      },
      {
        email: 'doctor.sharma@example.com',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        dept: 'Neurology',
        specialization: 'Neurologist',
        registration: 'REG-10003',
        fee: 900.00,
        room: 'Room 303',
        experience: 10,
        isAvailable: true
      },
      {
        email: 'doctor.gupta@example.com',
        firstName: 'Priya',
        lastName: 'Gupta',
        dept: 'Pediatrics',
        specialization: 'Pediatric Specialist',
        registration: 'REG-10004',
        fee: 600.00,
        room: 'Room 104',
        experience: 8,
        isAvailable: false
      },
      {
        email: 'doctor.verma@example.com',
        firstName: 'Vikram',
        lastName: 'Verma',
        dept: 'General Medicine',
        specialization: 'Internal Medicine',
        registration: 'REG-10005',
        fee: 550.00,
        room: 'Room 105',
        experience: 7,
        isAvailable: true
      }
    ];

    const doctorIdsMap = {};
    for (const doc of doctorUsers) {
      let uRes = await query('SELECT id FROM users WHERE email = $1', [doc.email]);
      let uId;
      if (uRes.rows.length === 0) {
        uRes = await query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
           VALUES ($1, $2, 'doctor', $3, $4, '555-010' || FLOOR(RANDOM() * 90 + 10)::text, true, true) RETURNING id`,
          [doc.email, doctorPasswordHash, doc.firstName, doc.lastName]
        );
      }
      uId = uRes.rows[0].id;

      let dRes = await query('SELECT id FROM doctors WHERE user_id = $1', [uId]);
      let dId;
      if (dRes.rows.length === 0) {
        dRes = await query(
          `INSERT INTO doctors (user_id, department_id, specialization, registration_number, consultation_fee, experience_years, room_number, is_available, rating, total_reviews, has_digital_signature)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 4.9, 12, true) RETURNING id`,
          [uId, deptIds[doc.dept], doc.specialization, doc.registration, doc.fee, doc.experience, doc.room, doc.isAvailable]
        );
      }
      dId = dRes.rows[0].id;
      doctorIdsMap[doc.email] = dId;

      // Add weekly schedules
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (const day of days) {
        await query(
          `INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
           VALUES ($1, $2, '09:00:00', '17:00:00', 30)
           ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
          [dId, day]
        );
      }
    }

    // Set leave for Dr. Priya Gupta for today
    const docGuptaId = doctorIdsMap['doctor.gupta@example.com'];
    await query(
      `INSERT INTO doctor_leaves (doctor_id, leave_date, reason, status)
       SELECT $1, $2, 'Attending Pediatric Medical Conference', 'approved'
       WHERE NOT EXISTS (SELECT 1 FROM doctor_leaves WHERE doctor_id = $1 AND leave_date = $2)`,
      [docGuptaId, todayDate]
    );

    console.log('  ✅ 5 Doctor profiles, schedules & leave records verified / created');

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. PATIENT USERS & PROFILES (Primary Patients + Dependents)
    // ─────────────────────────────────────────────────────────────────────────────
    const primaryPatients = [
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dob: '1990-05-15',
        gender: 'male',
        bloodGroup: 'O+',
        allergies: 'Penicillin, Dust',
        contactPhone: '555-0999',
        contactName: 'Jane Doe (Spouse)'
      },
      {
        email: 'sarah.connor@example.com',
        firstName: 'Sarah',
        lastName: 'Connor',
        dob: '1985-08-22',
        gender: 'female',
        bloodGroup: 'B+',
        allergies: 'None',
        contactPhone: '555-0888',
        contactName: 'Kyle Connor (Brother)'
      },
      {
        email: 'robert.chen@example.com',
        firstName: 'Robert',
        lastName: 'Chen',
        dob: '1978-03-12',
        gender: 'male',
        bloodGroup: 'A-',
        allergies: 'Sulfa drugs',
        contactPhone: '555-0777',
        contactName: 'Linda Chen (Wife)'
      },
      {
        email: 'emily.watson@example.com',
        firstName: 'Emily',
        lastName: 'Watson',
        dob: '1995-12-04',
        gender: 'female',
        bloodGroup: 'AB+',
        allergies: 'Latex',
        contactPhone: '555-0666',
        contactName: 'David Watson (Father)'
      }
    ];

    const patientIdsMap = {};
    for (const pat of primaryPatients) {
      let uRes = await query('SELECT id FROM users WHERE email = $1', [pat.email]);
      let uId;
      if (uRes.rows.length === 0) {
        uRes = await query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
           VALUES ($1, $2, 'patient', $3, $4, '555-0199', true, true) RETURNING id`,
          [pat.email, patientPasswordHash, pat.firstName, pat.lastName]
        );
      }
      uId = uRes.rows[0].id;

      let pRes = await query('SELECT id FROM patients WHERE user_id = $1', [uId]);
      let pId;
      if (pRes.rows.length === 0) {
        pRes = await query(
          `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, allergies, city, is_dependent)
           VALUES ($1, $2, $3, $4, $5, 'Metropolis', false) RETURNING id`,
          [uId, pat.dob, pat.gender, pat.bloodGroup, pat.allergies]
        );
      }
      pId = pRes.rows[0].id;
      patientIdsMap[pat.email] = pId;

      // Upsert Patient Health Profile
      await query(
        `INSERT INTO patient_health_profiles 
          (patient_id, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
         VALUES ($1, $2, $3, 'Mild Hypertension', $4, $5, 'Family')
         ON CONFLICT (patient_id) DO UPDATE SET
          blood_group = EXCLUDED.blood_group,
          allergies = EXCLUDED.allergies,
          emergency_contact_name = EXCLUDED.emergency_contact_name,
          emergency_contact_phone = EXCLUDED.emergency_contact_phone`,
        [pId, pat.bloodGroup, pat.allergies, pat.contactName, pat.contactPhone]
      );
    }

    console.log('  ✅ Primary patients & health profiles created / verified');

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. FAMILY DEPENDENTS (Under Sarah Connor)
    // ─────────────────────────────────────────────────────────────────────────────
    const sarahPatientId = patientIdsMap['sarah.connor@example.com'];
    const dependentsData = [
      {
        firstName: 'Leo',
        lastName: 'Connor',
        relation: 'child',
        dob: '2018-06-10',
        gender: 'male',
        bloodGroup: 'A+',
        allergies: 'Peanuts'
      },
      {
        firstName: 'Mary',
        lastName: 'Connor',
        relation: 'parent',
        dob: '1955-11-20',
        gender: 'female',
        bloodGroup: 'O+',
        allergies: 'None'
      }
    ];

    const dependentPatientIds = [];
    for (const dep of dependentsData) {
      let depUserRes = await query(
        `SELECT u.id as user_id, p.id as patient_id 
         FROM users u JOIN patients p ON p.user_id = u.id 
         JOIN patient_guardians pg ON pg.dependent_patient_id = p.id
         WHERE pg.guardian_patient_id = $1 AND u.first_name = $2`,
        [sarahPatientId, dep.firstName]
      );

      let depPatientId;
      if (depUserRes.rows.length === 0) {
        const uIns = await query(
          `INSERT INTO users (first_name, last_name, role, is_active, email)
           VALUES ($1, $2, 'patient', true, NULL) RETURNING id`,
          [dep.firstName, dep.lastName]
        );
        const depUserId = uIns.rows[0].id;

        const pIns = await query(
          `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, allergies, is_dependent)
           VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
          [depUserId, dep.dob, dep.gender, dep.bloodGroup, dep.allergies]
        );
        depPatientId = pIns.rows[0].id;

        await query(
          `INSERT INTO patient_guardians (guardian_patient_id, dependent_patient_id, relation)
           VALUES ($1, $2, $3)`,
          [sarahPatientId, depPatientId, dep.relation]
        );
      } else {
        depPatientId = depUserRes.rows[0].patient_id;
      }
      dependentPatientIds.push(depPatientId);
    }

    console.log('  ✅ Family dependents (Child Leo & Parent Mary) linked under Sarah Connor');

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. EMERGENCY HEALTH CARD (Enabled for John Doe)
    // ─────────────────────────────────────────────────────────────────────────────
    const johnPatientId = patientIdsMap['john.doe@example.com'];
    const rawDemoCardToken = 'demo-emergency-token-john-doe-2026';
    const cardTokenHash = hashToken(rawDemoCardToken);

    await query(
      `INSERT INTO emergency_cards (patient_id, token_hash, is_enabled, show_blood_group, show_allergies, show_conditions, show_contact, show_age)
       VALUES ($1, $2, true, true, true, true, true, true)
       ON CONFLICT (patient_id) DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        is_enabled = true`,
      [johnPatientId, cardTokenHash]
    );

    console.log('  ✅ Emergency Health Card ENABLED for John Doe');

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. APPOINTMENTS (Varied Statuses + Today OPD Queue Demo)
    // ─────────────────────────────────────────────────────────────────────────────
    const docPatelId = doctorIdsMap['doctor.patel@example.com']; // Cardiology (OPD queue demo target)
    const docSmithId = doctorIdsMap['doctor.smith@example.com']; // General Medicine
    const docSharmaId = doctorIdsMap['doctor.sharma@example.com']; // Neurology
    const docVermaId = doctorIdsMap['doctor.verma@example.com']; // General Medicine

    // Today's Approved Appointments for Dr. Aisha Patel (Cardiology) - Un-checked-in for live OPD queue demo
    const todayAppointments = [
      { patientId: johnPatientId, time: '09:30:00', reason: 'Cardiology Follow-up & ECG Check' },
      { patientId: patientIdsMap['robert.chen@example.com'], time: '10:00:00', reason: 'Chest Tightness Evaluation' },
      { patientId: patientIdsMap['emily.watson@example.com'], time: '10:30:00', reason: 'Routine Heart Sound Check' }
    ];

    for (const appt of todayAppointments) {
      await query(
        `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
         SELECT $1, $2, $3, $4, $5, 'approved', $6, 800.00
         WHERE NOT EXISTS (
           SELECT 1 FROM appointments 
           WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date = $4 AND appointment_time = $5
         )`,
        [appt.patientId, docPatelId, deptIds['Cardiology'], todayDate, appt.time, appt.reason]
      );
    }

    // Checked-in token for Dr. John Smith (In Consultation)
    let checkInApptRes = await query(
      `SELECT id FROM appointments WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date = $3`,
      [patientIdsMap['robert.chen@example.com'], docSmithId, todayDate]
    );
    let checkInApptId;
    if (checkInApptRes.rows.length === 0) {
      checkInApptRes = await query(
        `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
         VALUES ($1, $2, $3, $4, '09:00:00', 'approved', 'General Checkup', 500.00) RETURNING id`,
        [patientIdsMap['robert.chen@example.com'], docSmithId, deptIds['General Medicine'], todayDate]
      );
    }
    checkInApptId = checkInApptRes.rows[0].id;

    await query(
      `INSERT INTO queue_tokens (appointment_id, doctor_id, queue_date, token_number, status, checked_in_at, called_at, started_at)
       SELECT $1, $2, $3, 1, 'in_consultation', NOW(), NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM queue_tokens WHERE appointment_id = $1)`,
      [checkInApptId, docSmithId, todayDate]
    );

    // Family Appointments for Sarah Connor & Dependents
    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE + INTERVAL '1 day', '10:00:00', 'approved', 'Routine Health Screening', 500.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'approved')`,
      [sarahPatientId, docSmithId, deptIds['General Medicine']]
    );

    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE + INTERVAL '2 days', '11:00:00', 'approved', 'Pediatric Vaccination & Checkup', 600.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'approved')`,
      [dependentPatientIds[0], docGuptaId, deptIds['Pediatrics']]
    );

    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE + INTERVAL '3 days', '11:30:00', 'approved', 'Hypertension & BP Management', 800.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'approved')`,
      [dependentPatientIds[1], docPatelId, deptIds['Cardiology']]
    );

    // Completed Appointment for John Doe with Dr. John Smith
    let completedApptRes = await query(
      `SELECT id FROM appointments WHERE patient_id = $1 AND status = 'completed'`,
      [johnPatientId]
    );
    let completedApptId;
    if (completedApptRes.rows.length === 0) {
      completedApptRes = await query(
        `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
         VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '5 days', '09:30:00', 'completed', 'Annual Physical Review', 500.00) RETURNING id`,
        [johnPatientId, docSmithId, deptIds['General Medicine']]
      );
    }
    completedApptId = completedApptRes.rows[0].id;

    // Additional appointment statuses
    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE + INTERVAL '4 days', '14:00:00', 'pending', 'Migraine & Tension Headache Review', 900.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'pending')`,
      [patientIdsMap['emily.watson@example.com'], docSharmaId, deptIds['Neurology']]
    );

    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE - INTERVAL '2 days', '15:00:00', 'cancelled', 'General Consultation', 550.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'cancelled')`,
      [patientIdsMap['emily.watson@example.com'], docVermaId, deptIds['General Medicine']]
    );

    await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, consultation_fee)
       SELECT $1, $2, $3, CURRENT_DATE - INTERVAL '3 days', '16:00:00', 'rejected', 'Neurology Specialist Consultation', 900.00
       WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = $1 AND status = 'rejected')`,
      [patientIdsMap['robert.chen@example.com'], docSharmaId, deptIds['Neurology']]
    );

    console.log('  ✅ Appointments across all statuses (pending, approved, completed, cancelled, rejected) created');

    // ─────────────────────────────────────────────────────────────────────────────
    // 8. MEDICAL RECORD, PRESCRIPTION, LAB ORDERS, INVOICES & REVIEWS
    // ─────────────────────────────────────────────────────────────────────────────
    // Medical Record
    let medRecRes = await query('SELECT id FROM medical_records WHERE appointment_id = $1', [completedApptId]);
    let medRecId;
    if (medRecRes.rows.length === 0) {
      medRecRes = await query(
        `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, chief_complaint, treatment_plan, notes)
         VALUES ($1, $2, $3, 'Mild Essential Hypertension & Hyperlipidemia', 'Occasional tension headaches and dizziness', 'Low sodium diet, daily 30-min walking, medication compliance', 'Patient advised to review blood pressure weekly.') RETURNING id`,
        [johnPatientId, docSmithId, completedApptId]
      );
    }
    medRecId = medRecRes.rows[0].id;

    await query(
      `INSERT INTO medical_record_files (medical_record_id, file_name, file_path, file_type, file_size)
       SELECT $1, 'ECG_Sample_Report.pdf', 'uploads/sample_ecg.pdf', 'application/pdf', 102400
       WHERE NOT EXISTS (SELECT 1 FROM medical_record_files WHERE medical_record_id = $1)`,
      [medRecId]
    );

    // Prescription & Items
    let prescRes = await query('SELECT id FROM prescriptions WHERE appointment_id = $1', [completedApptId]);
    let prescId;
    if (prescRes.rows.length === 0) {
      prescRes = await query(
        `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, medical_record_id, notes, verification_code, has_digital_signature)
         VALUES ($1, $2, $3, $4, 'Take medicines regularly after meals with water.', 'RX-VERIFY-998877', true) RETURNING id`,
        [johnPatientId, docSmithId, completedApptId, medRecId]
      );
    }
    prescId = prescRes.rows[0].id;

    // Insert medicines
    const medicines = [
      { name: 'Amlodipine 5mg', dosage: '5mg', frequency: '1-0-0', duration: '30 days', instructions: 'Take morning after breakfast' },
      { name: 'Telmisartan 40mg', dosage: '40mg', frequency: '0-0-1', duration: '30 days', instructions: 'Take night after dinner' },
      { name: 'Atorvastatin 10mg', dosage: '10mg', frequency: '0-0-1', duration: '30 days', instructions: 'Take night at bedtime' }
    ];

    for (const med of medicines) {
      await query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (SELECT 1 FROM prescription_items WHERE prescription_id = $1 AND medicine_name = $2)`,
        [prescId, med.name, med.dosage, med.frequency, med.duration, med.instructions]
      );
    }

    // Prescription share token
    await query(
      `INSERT INTO prescription_shares (prescription_id, patient_id, share_token, expires_at)
       SELECT $1, $2, 'demo-prescription-share-token-2026', CURRENT_TIMESTAMP + INTERVAL '7 days'
       WHERE NOT EXISTS (SELECT 1 FROM prescription_shares WHERE prescription_id = $1)`,
      [prescId, johnPatientId]
    );

    // Lab Catalog & Lab Orders
    let labTest1 = await query("SELECT id FROM lab_tests WHERE test_code = 'CBC-01'");
    let labTest1Id;
    if (labTest1.rows.length === 0) {
      labTest1 = await query(
        `INSERT INTO lab_tests (department_id, test_name, test_code, category, description, price, sample_type, normal_range, is_active)
         VALUES ($1, 'Complete Blood Count (CBC)', 'CBC-01', 'Hematology', 'Comprehensive blood count assay', 450.00, 'Blood', 'Hemoglobin: 13.5-17.5 g/dL', true) RETURNING id`,
        [deptIds['General Medicine']]
      );
    }
    labTest1Id = labTest1.rows[0].id;

    let labTest2 = await query("SELECT id FROM lab_tests WHERE test_code = 'LIPID-01'");
    let labTest2Id;
    if (labTest2.rows.length === 0) {
      labTest2 = await query(
        `INSERT INTO lab_tests (department_id, test_name, test_code, category, description, price, sample_type, normal_range, is_active)
         VALUES ($1, 'Lipid Profile Panel', 'LIPID-01', 'Biochemistry', 'Total cholesterol and HDL/LDL breakdown', 850.00, 'Blood', 'Desirable Cholesterol < 200 mg/dL', true) RETURNING id`,
        [deptIds['Cardiology']]
      );
    }
    labTest2Id = labTest2.rows[0].id;

    // Create Lab Orders & Reports
    let labOrder1Res = await query('SELECT id FROM lab_orders WHERE patient_id = $1 AND test_id = $2', [johnPatientId, labTest1Id]);
    let labOrder1Id;
    if (labOrder1Res.rows.length === 0) {
      labOrder1Res = await query(
        `INSERT INTO lab_orders (patient_id, doctor_id, test_id, appointment_id, status, notes)
         VALUES ($1, $2, $3, $4, 'completed', 'Routine health checkup panel') RETURNING id`,
        [johnPatientId, docSmithId, labTest1Id, completedApptId]
      );
    }
    labOrder1Id = labOrder1Res.rows[0].id;

    await query(
      `INSERT INTO lab_report_files (lab_order_id, file_name, file_path, file_type, file_size, result_summary, flag)
       SELECT $1, 'CBC_Lab_Report.pdf', 'uploads/cbc_report.pdf', 'application/pdf', 95000, 'Hemoglobin: 14.5 g/dL (Normal)', 'normal'
       WHERE NOT EXISTS (SELECT 1 FROM lab_report_files WHERE lab_order_id = $1)`,
      [labOrder1Id]
    );

    let labOrder2Res = await query('SELECT id FROM lab_orders WHERE patient_id = $1 AND test_id = $2', [johnPatientId, labTest2Id]);
    let labOrder2Id;
    if (labOrder2Res.rows.length === 0) {
      labOrder2Res = await query(
        `INSERT INTO lab_orders (patient_id, doctor_id, test_id, appointment_id, status, notes)
         VALUES ($1, $2, $3, $4, 'completed', 'Lipid panel check') RETURNING id`,
        [johnPatientId, docSmithId, labTest2Id, completedApptId]
      );
    }
    labOrder2Id = labOrder2Res.rows[0].id;

    await query(
      `INSERT INTO lab_report_files (lab_order_id, file_name, file_path, file_type, file_size, result_summary, flag)
       SELECT $1, 'Lipid_Panel_Report.pdf', 'uploads/lipid_report.pdf', 'application/pdf', 108000, 'Total Cholesterol: 245 mg/dL (High)', 'high'
       WHERE NOT EXISTS (SELECT 1 FROM lab_report_files WHERE lab_order_id = $1)`,
      [labOrder2Id]
    );

    // Invoices & Payments
    let inv1Res = await query("SELECT id FROM invoices WHERE invoice_number = 'INV-2026-0001'");
    if (inv1Res.rows.length === 0) {
      inv1Res = await query(
        `INSERT INTO invoices (invoice_number, patient_id, doctor_id, appointment_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, created_by)
         VALUES ('INV-2026-0001', $1, $2, $3, 1300.00, 180.00, 0.00, 1480.00, 1480.00, 'paid', $4) RETURNING id`,
        [johnPatientId, docSmithId, completedApptId, adminUserId]
      );
      const inv1Id = inv1Res.rows[0].id;

      await query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
         VALUES ($1, 'General Consultation Fee', 1, 500.00, 500.00),
                ($1, 'Lipid Profile Panel Test', 1, 850.00, 850.00)`,
        [inv1Id]
      );

      await query(
        `INSERT INTO payments (invoice_id, amount, payment_method, status, transaction_ref, recorded_by)
         VALUES ($1, 1480.00, 'card', 'success', 'TXN-CARD-998811', $2)`,
        [inv1Id, adminUserId]
      );
    }

    let inv2Res = await query("SELECT id FROM invoices WHERE invoice_number = 'INV-2026-0002'");
    if (inv2Res.rows.length === 0) {
      inv2Res = await query(
        `INSERT INTO invoices (invoice_number, patient_id, doctor_id, appointment_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, created_by)
         VALUES ('INV-2026-0002', $1, $2, $3, 1500.00, 225.00, 0.00, 1725.00, 800.00, 'partial', $4) RETURNING id`,
        [patientIdsMap['robert.chen@example.com'], docPatelId, checkInApptId, adminUserId]
      );
      const inv2Id = inv2Res.rows[0].id;

      await query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
         VALUES ($1, 'Cardiology Consultation Fee', 1, 800.00, 800.00),
                ($1, 'Advanced ECG Procedure', 1, 700.00, 700.00)`,
        [inv2Id]
      );

      await query(
        `INSERT INTO payments (invoice_id, amount, payment_method, status, transaction_ref, recorded_by)
         VALUES ($1, 800.00, 'upi', 'success', 'TXN-UPI-445566', $2)`,
        [inv2Id, adminUserId]
      );
    }

    // Doctor Review
    await query(
      `INSERT INTO doctor_reviews (doctor_id, patient_id, appointment_id, rating, review_text)
       SELECT $1, $2, $3, 5, 'Dr. Smith was extremely thorough, compassionate, and clear in explaining my treatment plan.'
       WHERE NOT EXISTS (SELECT 1 FROM doctor_reviews WHERE patient_id = $2 AND doctor_id = $1)`,
      [docSmithId, johnPatientId, completedApptId]
    );

    console.log('  ✅ Clinical records, digital prescriptions, lab orders, invoices & reviews created / verified');

    // ─────────────────────────────────────────────────────────────────────────────
    // 9. NOTIFICATIONS & AUDIT LOGS
    // ─────────────────────────────────────────────────────────────────────────────
    const johnUserId = (await query('SELECT user_id FROM patients WHERE id = $1', [johnPatientId])).rows[0].user_id;
    const sarahUserId = (await query('SELECT user_id FROM patients WHERE id = $1', [sarahPatientId])).rows[0].user_id;

    const notifs = [
      { userId: johnUserId, title: 'Appointment Confirmed', message: 'Your Cardiology appointment with Dr. Aisha Patel for Today at 09:30 AM is confirmed.', type: 'appointment', link: '/patient/appointments' },
      { userId: johnUserId, title: 'Prescription Digital Signature', message: 'Your prescription #RX-VERIFY-998877 has been digitally signed and is ready for download.', type: 'prescription', link: '/patient/prescriptions' },
      { userId: sarahUserId, title: 'Family Dependent Added', message: 'Dependent profiles for Leo Connor and Mary Connor are active under your account.', type: 'system', link: '/patient/family' }
    ];

    for (const n of notifs) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, link)
         SELECT $1, $2, $3, $4, false, $5
         WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $1 AND title = $2)`,
        [n.userId, n.title, n.message, n.type, n.link]
      );
    }

    // Audit entries
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'EMERGENCY_CARD_VIEWED', 'emergency_card', $2, '{"action":"public_access"}', '127.0.0.1'),
              ($3, 'PATIENT_ACTING_AS', 'patient', $4, '{"acting_as":"Leo Connor"}', '127.0.0.1')`,
      [johnUserId, johnPatientId, sarahUserId, dependentPatientIds[0]]
    );

    console.log('  ✅ Notifications and security audit trail records created');

    // ─────────────────────────────────────────────────────────────────────────────
    // SUMMARY REPORT
    // ─────────────────────────────────────────────────────────────────────────────
    const publicEmergencyCardUrl = `http://localhost:5173/emergency/${rawDemoCardToken}`;

    console.log('\n🎉 Demo Data Seeding Completed Successfully!');
    console.log('=============================================================================');
    console.log('📊 DEMO DATASET SUMMARY:');
    console.log('-----------------------------------------------------------------------------');
    console.log('  • Departments:           4 (General Medicine, Cardiology, Neurology, Pediatrics)');
    console.log('  • Doctors:               5 (Rooms 101-105; 4 Available, 1 On Leave Today)');
    console.log('  • Primary Patients:      4 (John Doe, Sarah Connor, Robert Chen, Emily Watson)');
    console.log('  • Family Dependents:     2 (Leo Connor [Child], Mary Connor [Parent] under Sarah)');
    console.log('  • Today OPD Appts:       3 Approved for Dr. Aisha Patel (Ready for Live Check-in)');
    console.log('  • OPD Queue Token:       1 Token In-Consultation for Dr. John Smith');
    console.log('  • Appt Status Coverage:  Completed, Approved, Pending, Cancelled, Rejected');
    console.log('  • Clinical Records:      1 Record with PDF File, 1 Digital Prescription (3 Medicines)');
    console.log('  • Lab Orders & Reports:  2 Orders (1 Normal CBC, 1 High Cholesterol Lipid)');
    console.log('  • Invoices & Payments:  2 Invoices (1 Paid via Card, 1 Partial via UPI)');
    console.log('  • Doctor Review:         1 Verified 5-Star Review');
    console.log('-----------------------------------------------------------------------------');
    console.log('🔑 DEMO LOGINS (Password for all: Demo@123456):');
    console.log('-----------------------------------------------------------------------------');
    console.log('  🛡️ Admin Role:    admin@shms.com           / Admin@123456');
    console.log('  🩺 Doctor Role:   doctor.patel@example.com / Doctor@123456 (Cardiology OPD Target)');
    console.log('  🩺 Doctor Role:   doctor.smith@example.com / Doctor@123456 (General Medicine)');
    console.log('  👤 Patient Role:  john.doe@example.com     / Patient@123456 (Emergency Card & OPD)');
    console.log('  👤 Patient Role:  sarah.connor@example.com / Patient@123456 (Family Profiles & Switcher)');
    console.log('-----------------------------------------------------------------------------');
    console.log('🚨 PUBLIC EMERGENCY CARD DEMO LINK (John Doe):');
    console.log(`   👉 ${publicEmergencyCardUrl}`);
    console.log('=============================================================================\n');

  } catch (error) {
    console.error('❌ Demo Data Seeding Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDemo();
