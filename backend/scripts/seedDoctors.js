const { query } = require("../src/config/database");
const bcrypt = require("bcryptjs");

async function seedDoctors() {
  console.log("🌱 Starting doctor seed script...");

  try {
    // 1. Get departments
    const deptsRes = await query("SELECT id, name FROM departments ORDER BY name ASC");
    if (deptsRes.rows.length === 0) {
      console.error("❌ No departments found in database! Please run database/seed.sql first.");
      process.exit(1);
    }

    const deptsByName = {};
    deptsRes.rows.forEach((d) => {
      deptsByName[d.name.toLowerCase()] = d.id;
    });

    const fallbackDeptId = deptsRes.rows[0].id;

    // 2. Define 3 sample doctors
    const sampleDoctors = [
      {
        email: "dr.sharma@shms.com",
        firstName: "Rajesh",
        lastName: "Sharma",
        phone: "+91-9876543210",
        specialization: "Interventional Cardiology",
        qualification: "MD, DM Cardiology (AIIMS Delhi)",
        experienceYears: 15,
        consultationFee: 1500.0,
        roomNumber: "101",
        bio: "Dr. Rajesh Sharma is a leading interventional cardiologist with over 15 years of experience in treating complex heart conditions.",
        deptId: deptsByName["cardiology"] || fallbackDeptId,
      },
      {
        email: "dr.patel@shms.com",
        firstName: "Priya",
        lastName: "Patel",
        phone: "+91-9876543211",
        specialization: "Neurology",
        qualification: "MD, DM Neurology (PGI Chandigarh)",
        experienceYears: 12,
        consultationFee: 1200.0,
        roomNumber: "204",
        bio: "Dr. Priya Patel specializes in diagnosing and treating disorders of the nervous system including epilepsy and stroke.",
        deptId: deptsByName["neurology"] || fallbackDeptId,
      },
      {
        email: "dr.khan@shms.com",
        firstName: "Arjun",
        lastName: "Khan",
        phone: "+91-9876543212",
        specialization: "Orthopedic Surgery",
        qualification: "MS Orthopedics (KEM Hospital)",
        experienceYears: 10,
        consultationFee: 1000.0,
        roomNumber: "305",
        bio: "Dr. Arjun Khan is an expert in joint replacement surgery and sports medicine.",
        deptId: deptsByName["orthopedics"] || fallbackDeptId,
      },
    ];

    const passwordHash = await bcrypt.hash("Doctor@123456", 12);

    for (const docData of sampleDoctors) {
      // Check if user already exists
      const existingUserRes = await query("SELECT id FROM users WHERE email = $1", [docData.email]);

      let userId;
      if (existingUserRes.rows.length > 0) {
        userId = existingUserRes.rows[0].id;
        console.log(`ℹ️ User ${docData.email} already exists.`);
      } else {
        const userRes = await query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
           VALUES ($1, $2, 'doctor', $3, $4, $5, true, true)
           RETURNING id`,
          [docData.email, passwordHash, docData.firstName, docData.lastName, docData.phone]
        );
        userId = userRes.rows[0].id;
        console.log(`✅ Created user: ${docData.email}`);
      }

      // Check if doctor profile already exists
      const existingDocRes = await query("SELECT id FROM doctors WHERE user_id = $1", [userId]);
      let doctorId;
      if (existingDocRes.rows.length > 0) {
        doctorId = existingDocRes.rows[0].id;
        console.log(`ℹ️ Doctor profile for ${docData.email} already exists.`);
      } else {
        const docRes = await query(
          `INSERT INTO doctors (user_id, department_id, specialization, qualification, experience_years, consultation_fee, room_number, bio, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
           RETURNING id`,
          [
            userId,
            docData.deptId,
            docData.specialization,
            docData.qualification,
            docData.experienceYears,
            docData.consultationFee,
            docData.roomNumber,
            docData.bio,
          ]
        );
        doctorId = docRes.rows[0].id;
        console.log(`✅ Created doctor profile for Dr. ${docData.firstName} ${docData.lastName}`);
      }

      // Add default schedules for Mon-Fri
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
      for (const day of days) {
        await query(
          `INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients, is_active)
           VALUES ($1, $2, '09:00', '17:00', 30, 10, true)
           ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
          [doctorId, day]
        );
      }
    }

    console.log("🎉 Seed doctors completed successfully! Default password for seeded doctors: Doctor@123456");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding doctors:", err);
    process.exit(1);
  }
}

seedDoctors();
