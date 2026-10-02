const { query } = require("../src/config/database");
const Review = require("../src/models/Review");

async function seedReviews() {
  console.log("🌱 Starting doctor reviews seed script...");

  try {
    // 1. Fetch completed appointments
    let appointmentsRes = await query(`
      SELECT a.id as appointment_id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_time
      FROM appointments a
      WHERE a.status = 'completed'
      ORDER BY a.appointment_date DESC
    `);

    // If no completed appointments exist, let's complete existing past appointments or create sample completed appointments
    if (appointmentsRes.rows.length === 0) {
      console.log("ℹ️ No completed appointments found. Updating sample appointments to completed...");
      await query(`
        UPDATE appointments 
        SET status = 'completed' 
        WHERE id IN (SELECT id FROM appointments LIMIT 3)
      `);

      appointmentsRes = await query(`
        SELECT a.id as appointment_id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_time
        FROM appointments a
        WHERE a.status = 'completed'
        ORDER BY a.appointment_date DESC
      `);
    }

    if (appointmentsRes.rows.length === 0) {
      console.log("⚠️ No appointments exist to seed reviews for. Please create appointments first.");
      process.exit(0);
    }

    const sampleComments = [
      { rating: 5, comment: "Dr. Sharma was extremely polite and thorough with his diagnosis. Highly recommended!" },
      { rating: 5, comment: "Excellent consultation! Very patient listener and prescribed very effective treatment." },
      { rating: 4, comment: "Very professional experience. The clinic was clean and appointment started on time." },
      { rating: 5, comment: "Great doctor! Explained everything in simple terms. Felt very comfortable." },
      { rating: 4, comment: "Good experience overall, clear advice provided." }
    ];

    let seededCount = 0;
    for (let i = 0; i < appointmentsRes.rows.length; i++) {
      const appt = appointmentsRes.rows[i];

      // Check if review already exists for this appointment
      const existing = await query(
        "SELECT id FROM doctor_reviews WHERE appointment_id = $1",
        [appt.appointment_id]
      );

      if (existing.rows.length === 0) {
        const sample = sampleComments[i % sampleComments.length];
        await query(
          `INSERT INTO doctor_reviews (doctor_id, patient_id, appointment_id, rating, comment)
           VALUES ($1, $2, $3, $4, $5)`,
          [appt.doctor_id, appt.patient_id, appt.appointment_id, sample.rating, sample.comment]
        );
        await Review.updateDoctorRatingStats(appt.doctor_id);
        seededCount++;
        console.log(`✅ Added review for Doctor ID ${appt.doctor_id} (${sample.rating}★)`);
      } else {
        console.log(`ℹ️ Review already exists for appointment ${appt.appointment_id}`);
      }
    }

    console.log(`🎉 Seeded ${seededCount} doctor reviews successfully!`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding reviews:", err);
    process.exit(1);
  }
}

seedReviews();
