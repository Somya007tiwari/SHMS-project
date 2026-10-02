const crypto = require("crypto");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Department = require("../models/Department");
const { deleteOldProfilePhoto } = require("../middleware/upload");
const {
  sendSuccess,
  sendError,
  sendCreated,
  sendPaginated,
} = require("../utils/responseHandler");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const auditService = require("../services/auditService");
const emailService = require("../services/emailService");
const notificationService = require("../services/notificationService");
const { query: db } = require("../config/database");

const doctorController = {
  async getAll(req, res) {
    const { page, limit } = getPagination(req.query);
    const { departmentId, search, isAvailable } = req.query;
    const data = await Doctor.getAll({
      page,
      limit,
      departmentId: departmentId && departmentId.trim() ? departmentId.trim() : undefined,
      search: search && search.trim() ? search.trim() : undefined,
      isAvailable:
        isAvailable !== undefined && isAvailable !== ""
          ? isAvailable === "true"
          : undefined,
    });
    return sendPaginated(
      res,
      data.doctors,
      buildPaginationMeta(data.total, page, limit),
    );
  },

  async getById(req, res) {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return sendError(res, "Doctor not found", 404);
    return sendSuccess(res, doctor);
  },

  async create(req, res) {
    const {
      email,
      firstName,
      lastName,
      phone,
      departmentId,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      roomNumber,
      bio,
    } = req.body;

    // Required fields validation
    if (!email || !email.trim()) return sendError(res, "Email is required", 400);
    if (!firstName || !firstName.trim()) return sendError(res, "First name is required", 400);
    if (!lastName || !lastName.trim()) return sendError(res, "Last name is required", 400);
    if (!specialization || !specialization.trim()) return sendError(res, "Specialization is required", 400);

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return sendError(res, "Invalid email format", 400);

    // Unique email check
    const existingUser = await User.findByEmail(email.trim());
    if (existingUser) return sendError(res, "Email address already registered", 409);

    // Validate non-negative numbers
    if (experienceYears !== undefined && experienceYears !== "") {
      const expNum = parseInt(experienceYears, 10);
      if (isNaN(expNum) || expNum < 0) return sendError(res, "Experience years cannot be negative", 400);
    }
    if (consultationFee !== undefined && consultationFee !== "") {
      const feeNum = parseFloat(consultationFee);
      if (isNaN(feeNum) || feeNum < 0) return sendError(res, "Consultation fee cannot be negative", 400);
    }

    // Validate departmentId if provided
    if (departmentId && departmentId.trim()) {
      const dept = await Department.findById(departmentId.trim());
      if (!dept) return sendError(res, "Invalid department selected", 400);
    }

    // Generate random password
    const generatedPassword = crypto.randomBytes(5).toString("hex");

    // Atomic transaction creation
    const { user, doctor } = await Doctor.createWithUser({
      userData: {
        email: email.trim(),
        password: generatedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : null,
      },
      doctorData: {
        departmentId: departmentId && departmentId.trim() ? departmentId.trim() : null,
        specialization: specialization.trim(),
        qualification: qualification ? qualification.trim() : null,
        experienceYears,
        consultationFee,
        roomNumber: roomNumber ? roomNumber.trim() : null,
        bio: bio ? bio.trim() : null,
      },
      uploadedFile: req.uploadedFile,
    });

    const isEmailConfigured =
      process.env.EMAIL_USER &&
      process.env.EMAIL_USER !== "your_email@gmail.com";

    emailService
      .sendWelcome({
        email: email.trim(),
        name: `Dr. ${firstName} ${lastName}`,
        role: "doctor",
      })
      .catch(console.error);

    await auditService.log(
      req,
      "create",
      "doctor",
      doctor.id,
      `Doctor account created: ${email}`,
    );

    const fullDoctor = await Doctor.findById(doctor.id);

    const responsePayload = {
      user,
      doctor: fullDoctor,
      ...(!isEmailConfigured && { generatedPassword }),
    };

    return sendCreated(res, responsePayload, "Doctor created successfully");
  },

  async update(req, res) {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return sendError(res, "Doctor not found", 404);

    const {
      firstName,
      lastName,
      phone,
      departmentId,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      roomNumber,
      bio,
      isAvailable,
    } = req.body;

    // Validate non-negative numbers on update if provided
    if (experienceYears !== undefined && experienceYears !== "") {
      const expNum = parseInt(experienceYears, 10);
      if (isNaN(expNum) || expNum < 0) return sendError(res, "Experience years cannot be negative", 400);
    }
    if (consultationFee !== undefined && consultationFee !== "") {
      const feeNum = parseFloat(consultationFee);
      if (isNaN(feeNum) || feeNum < 0) return sendError(res, "Consultation fee cannot be negative", 400);
    }

    // Validate departmentId if provided
    if (departmentId && departmentId.trim()) {
      const dept = await Department.findById(departmentId.trim());
      if (!dept) return sendError(res, "Invalid department selected", 400);
    }

    // If new photo is uploaded, delete old profile photo safely
    if (req.uploadedFile) {
      await deleteOldProfilePhoto(doctor.profile_image_url, doctor.profile_image_public_id);
      await User.update(doctor.user_id, {
        profileImageUrl: req.uploadedFile.url,
        profileImagePublicId: req.uploadedFile.publicId,
      });
    }

    if (firstName || lastName || phone) {
      await User.update(doctor.user_id, {
        firstName: firstName ? firstName.trim() : undefined,
        lastName: lastName ? lastName.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
      });
    }

    await Doctor.update(req.params.id, {
      departmentId: departmentId !== undefined ? (departmentId.trim() || null) : undefined,
      specialization: specialization ? specialization.trim() : undefined,
      qualification: qualification !== undefined ? (qualification.trim() || null) : undefined,
      experienceYears,
      consultationFee,
      roomNumber: roomNumber !== undefined ? (roomNumber.trim() || null) : undefined,
      bio: bio !== undefined ? (bio.trim() || null) : undefined,
      isAvailable,
    });

    await auditService.log(
      req,
      "update",
      "doctor",
      req.params.id,
      "Doctor profile updated",
    );

    const updatedDoctor = await Doctor.findById(req.params.id);
    return sendSuccess(res, updatedDoctor, "Doctor updated successfully");
  },

  async getMyProfile(req, res) {
    const doctor = await Doctor.findByUserId(req.user.userId);
    if (!doctor) return sendError(res, "Doctor profile not found", 404);
    return sendSuccess(res, doctor);
  },

  async getSchedule(req, res) {
    const doctorId = req.params.id || req.user?.doctorId;
    if (!doctorId) return sendError(res, "Doctor ID is required", 400);

    const schedule = await Doctor.getSchedule(doctorId);
    return sendSuccess(res, schedule);
  },

  async updateSchedule(req, res) {
    const { schedule } = req.body;
    const doctorId = req.params.id || req.user?.doctorId;
    if (!doctorId) return sendError(res, "Doctor ID is required", 400);
    if (!Array.isArray(schedule)) return sendError(res, "Invalid schedule data format", 400);

    // Validate schedules
    for (const day of schedule) {
      const isActive = day.isActive !== false && day.is_active !== false;
      if (isActive) {
        const start = day.startTime || day.start_time;
        const end = day.endTime || day.end_time;
        const bStart = day.breakStartTime || day.break_start_time;
        const bEnd = day.breakEndTime || day.break_end_time;

        if (!start || !end) {
          return sendError(res, `Start and end times are required for ${day.dayOfWeek || day.day_of_week}`, 400);
        }

        if (start >= end) {
          return sendError(res, `End time must be after start time for ${day.dayOfWeek || day.day_of_week}`, 400);
        }

        if (bStart && bEnd) {
          if (bStart >= bEnd) {
            return sendError(res, `Break start time must be before break end time for ${day.dayOfWeek || day.day_of_week}`, 400);
          }
          if (bStart < start || bEnd > end) {
            return sendError(res, `Break window must be within working hours for ${day.dayOfWeek || day.day_of_week}`, 400);
          }
        }
      }
    }

    const results = [];
    for (const day of schedule) {
      const dayName = day.dayOfWeek || day.day_of_week;
      const isActive = day.isActive !== false && day.is_active !== false;

      if (!isActive) {
        await Doctor.deleteScheduleDay(doctorId, dayName);
        results.push({ day_of_week: dayName, is_active: false });
      } else {
        const updated = await Doctor.upsertSchedule(doctorId, dayName, day);
        results.push(updated);
      }
    }

    await auditService.log(
      req,
      "update",
      "schedule",
      doctorId,
      "Doctor schedule updated",
    );
    return sendSuccess(res, results, "Schedule updated successfully");
  },

  async getDashboard(req, res) {
    const stats = await Doctor.getDashboardStats(req.user.doctorId);
    return sendSuccess(res, stats);
  },

  async getPatients(req, res) {
    const { page, limit } = getPagination(req.query);

    const result = await db(
      `SELECT DISTINCT p.*, u.first_name, u.last_name, u.email, u.phone,
        MAX(a.appointment_date) as last_visit
       FROM patients p
       JOIN users u ON p.user_id = u.id
       JOIN appointments a ON p.id = a.patient_id
       WHERE a.doctor_id = $1 AND a.status = 'completed'
       GROUP BY p.id, u.first_name, u.last_name, u.email, u.phone
       ORDER BY last_visit DESC
       LIMIT $2 OFFSET $3`,
      [req.user.doctorId, limit, (page - 1) * limit],
    );

    return sendSuccess(res, result.rows);
  },

  async createLeave(req, res) {
    const { startDate, endDate, startTime, endTime, reason } = req.body;
    const doctorId = req.user.doctorId;

    if (!doctorId) return sendError(res, "Doctor profile not found", 404);
    if (!startDate) return sendError(res, "Start date is required", 400);
    if (!endDate) return sendError(res, "End date is required", 400);

    if (endDate < startDate) {
      return sendError(res, "End date cannot be before start date", 400);
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (startDate < todayStr) {
      return sendError(res, "Cannot apply leave for past dates", 400);
    }

    if ((startTime && !endTime) || (!startTime && endTime)) {
      return sendError(res, "Both start time and end time must be provided for partial-day leave", 400);
    }
    if (startTime && endTime && startTime >= endTime) {
      return sendError(res, "End time must be after start time", 400);
    }

    if (reason && reason.length > 300) {
      return sendError(res, "Reason cannot exceed 300 characters", 400);
    }

    const DoctorLeave = require("../models/DoctorLeave");
    const result = await DoctorLeave.create({
      doctorId,
      startDate,
      endDate,
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason ? reason.trim() : null,
    });

    const doctorProfile = await Doctor.findById(doctorId);
    const doctorName = doctorProfile ? `${doctorProfile.first_name} ${doctorProfile.last_name}` : 'your doctor';

    // Dispatch notifications & emails to affected patients (non-blocking)
    if (result.affectedAppointments && result.affectedAppointments.length > 0) {
      Promise.all(
        result.affectedAppointments.map((appt) => {
          const apptDateStr = new Date(appt.appointment_date).toISOString().split('T')[0];
          const apptTimeStr = String(appt.appointment_time).substring(0, 5);
          return Promise.all([
            notificationService.doctorLeaveAffected({
              patientUserId: appt.patient_user_id || appt.user_id,
              doctorName,
              leaveStartDate: startDate,
              leaveEndDate: endDate,
              date: apptDateStr,
              time: apptTimeStr,
              appointmentId: appt.id,
            }),
            emailService.sendDoctorLeaveAffected({
              email: appt.patient_email,
              patientName: appt.patient_name,
              doctorName,
              leaveStartDate: startDate,
              leaveEndDate: endDate,
              date: apptDateStr,
              time: apptTimeStr,
            }),
          ]);
        })
      ).catch(console.error);
    }

    await auditService.log(
      req,
      "create",
      "leave",
      result.leave.id,
      `Doctor leave created for ${startDate} to ${endDate}`
    );

    return sendCreated(
      res,
      result,
      `Leave scheduled successfully. ${result.affectedCount} appointment(s) need rescheduling.`
    );
  },

  async getMyLeaves(req, res) {
    const DoctorLeave = require("../models/DoctorLeave");
    const leaves = await DoctorLeave.getByDoctorId(req.user.doctorId);
    return sendSuccess(res, leaves);
  },

  async deleteLeave(req, res) {
    const DoctorLeave = require("../models/DoctorLeave");
    const deleted = await DoctorLeave.delete(req.params.id, req.user.doctorId);
    if (!deleted) return sendError(res, "Leave record not found or access denied", 404);

    await auditService.log(
      req,
      "delete",
      "leave",
      req.params.id,
      "Doctor leave deleted"
    );

    return sendSuccess(res, null, "Leave deleted successfully");
  },

  async getDoctorLeaves(req, res) {
    const DoctorLeave = require("../models/DoctorLeave");
    const leaves = await DoctorLeave.getByDoctorId(req.params.id);
    return sendSuccess(res, leaves);
  },
};

module.exports = doctorController;
