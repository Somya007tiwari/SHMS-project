const Review = require("../models/Review");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const {
  sendSuccess,
  sendError,
  sendCreated,
  sendPaginated,
} = require("../utils/responseHandler");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { sanitizeString } = require("../utils/helpers");

const reviewController = {
  async create(req, res) {
    const doctorId = req.params.id;
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId) return sendError(res, "Appointment ID is required", 400);

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return sendError(res, "Rating must be an integer between 1 and 5", 400);
    }

    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, "Patient profile not found", 404);

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return sendError(res, "Appointment not found", 404);

    if (appointment.patient_id !== patient.id || appointment.doctor_id !== doctorId) {
      return sendError(
        res,
        "You can only review your own completed appointments with this doctor",
        403
      );
    }

    if (appointment.status !== "completed") {
      return sendError(
        res,
        "Only completed appointments can be reviewed",
        400
      );
    }

    const existingReview = await Review.findByAppointmentId(appointmentId);
    if (existingReview) {
      return sendError(
        res,
        "You have already submitted a review for this appointment",
        409
      );
    }

    const cleanComment = comment ? sanitizeString(comment).substring(0, 1000) : null;

    const review = await Review.create({
      doctorId,
      patientId: patient.id,
      appointmentId,
      rating: numericRating,
      comment: cleanComment,
    });

    const fullReview = await Review.findById(review.id);
    return sendCreated(res, fullReview, "Review submitted successfully");
  },

  async update(req, res) {
    const reviewId = req.params.id;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) return sendError(res, "Review not found", 404);

    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient || review.patient_id !== patient.id) {
      return sendError(res, "You can only edit your own reviews", 403);
    }

    let numericRating = undefined;
    if (rating !== undefined) {
      numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return sendError(res, "Rating must be an integer between 1 and 5", 400);
      }
    }

    const cleanComment = comment !== undefined ? (comment ? sanitizeString(comment).substring(0, 1000) : null) : undefined;

    const updated = await Review.update(reviewId, {
      rating: numericRating,
      comment: cleanComment,
    });

    const fullUpdated = await Review.findById(reviewId);
    return sendSuccess(res, fullUpdated, "Review updated successfully");
  },

  async delete(req, res) {
    const reviewId = req.params.id;
    const review = await Review.findById(reviewId);
    if (!review) return sendError(res, "Review not found", 404);

    if (req.user.role !== "admin") {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient || review.patient_id !== patient.id) {
        return sendError(res, "You can only delete your own reviews", 403);
      }
    }

    await Review.delete(reviewId);
    return sendSuccess(res, null, "Review deleted successfully");
  },

  async getByDoctor(req, res) {
    const doctorId = req.params.id;
    const { page, limit } = getPagination(req.query);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return sendError(res, "Doctor not found", 404);

    const data = await Review.getByDoctorId(doctorId, { page, limit });
    return sendPaginated(
      res,
      data.reviews,
      buildPaginationMeta(data.total, page, limit)
    );
  },

  async getSummary(req, res) {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return sendError(res, "Doctor not found", 404);

    const summary = await Review.getRatingSummary(doctorId);
    return sendSuccess(res, summary);
  },
};

module.exports = reviewController;
