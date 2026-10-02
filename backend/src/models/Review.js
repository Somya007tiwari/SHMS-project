const { query } = require("../config/database");

class Review {
  static async updateDoctorRatingStats(doctorId) {
    const statsRes = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total_reviews
       FROM doctor_reviews
       WHERE doctor_id = $1`,
      [doctorId]
    );

    const avgRating = parseFloat(statsRes.rows[0].avg_rating).toFixed(2);
    const totalReviews = parseInt(statsRes.rows[0].total_reviews, 10);

    await query(
      `UPDATE doctors SET rating = $1, total_reviews = $2 WHERE id = $3`,
      [avgRating, totalReviews, doctorId]
    );
  }

  static async create({ doctorId, patientId, appointmentId, rating, comment }) {
    const result = await query(
      `INSERT INTO doctor_reviews (doctor_id, patient_id, appointment_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [doctorId, patientId, appointmentId, rating, comment || null]
    );

    await Review.updateDoctorRatingStats(doctorId);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT r.*, 
              u.first_name || ' ' || SUBSTRING(u.last_name FROM 1 FOR 1) || '.' as patient_name,
              u.profile_image_url as patient_image
       FROM doctor_reviews r
       JOIN patients p ON r.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByAppointmentId(appointmentId) {
    const result = await query(
      `SELECT * FROM doctor_reviews WHERE appointment_id = $1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  }

  static async update(id, { rating, comment }) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (rating !== undefined) {
      fields.push(`rating = $${paramCount++}`);
      values.push(rating);
    }
    if (comment !== undefined) {
      fields.push(`comment = $${paramCount++}`);
      values.push(comment || null);
    }

    if (fields.length === 0) return null;
    values.push(id);

    const result = await query(
      `UPDATE doctor_reviews SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const updatedReview = result.rows[0];
    if (updatedReview) {
      await Review.updateDoctorRatingStats(updatedReview.doctor_id);
    }
    return updatedReview;
  }

  static async delete(id) {
    const review = await Review.findById(id);
    if (!review) return false;

    await query("DELETE FROM doctor_reviews WHERE id = $1", [id]);
    await Review.updateDoctorRatingStats(review.doctor_id);
    return true;
  }

  static async getByDoctorId(doctorId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const countRes = await query(
      "SELECT COUNT(*) FROM doctor_reviews WHERE doctor_id = $1",
      [doctorId]
    );

    const result = await query(
      `SELECT r.id, r.doctor_id, r.patient_id, r.appointment_id, r.rating, r.comment, r.created_at,
              u.first_name || ' ' || SUBSTRING(u.last_name FROM 1 FOR 1) || '.' as patient_name,
              u.first_name, SUBSTRING(u.last_name FROM 1 FOR 1) as last_initial,
              u.profile_image_url as patient_image
       FROM doctor_reviews r
       JOIN patients p ON r.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE r.doctor_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );

    return {
      reviews: result.rows,
      total: parseInt(countRes.rows[0].count, 10),
    };
  }

  static async getRatingSummary(doctorId) {
    const summaryRes = await query(
      `SELECT 
         COALESCE(AVG(rating), 0) as average_rating,
         COUNT(*) as total_reviews,
         COUNT(CASE WHEN rating = 5 THEN 1 END) as star_5,
         COUNT(CASE WHEN rating = 4 THEN 1 END) as star_4,
         COUNT(CASE WHEN rating = 3 THEN 1 END) as star_3,
         COUNT(CASE WHEN rating = 2 THEN 1 END) as star_2,
         COUNT(CASE WHEN rating = 1 THEN 1 END) as star_1
       FROM doctor_reviews
       WHERE doctor_id = $1`,
      [doctorId]
    );

    const row = summaryRes.rows[0];
    const total = parseInt(row.total_reviews, 10);
    const avg = parseFloat(row.average_rating).toFixed(1);

    return {
      averageRating: total > 0 ? parseFloat(avg) : 0,
      totalReviews: total,
      stars: {
        5: parseInt(row.star_5, 10),
        4: parseInt(row.star_4, 10),
        3: parseInt(row.star_3, 10),
        2: parseInt(row.star_2, 10),
        1: parseInt(row.star_1, 10),
      },
    };
  }
}

module.exports = Review;
