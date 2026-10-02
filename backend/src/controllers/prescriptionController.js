const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const { generatePrescriptionPDF } = require('../utils/pdfGenerator');

const EDIT_WINDOW_HOURS = 24;

const prescriptionController = {
  // POST /api/prescriptions
  async create(req, res) {
    if (req.user.role !== 'doctor') {
      return sendError(res, 'Only doctors can create prescriptions', 403);
    }

    const doctorId = req.user.doctorId;
    const { patientId, appointmentId, medicalRecordId, diagnosis, advice, followUpDate, items } = req.body;

    if (!patientId) return sendError(res, 'Patient ID is required', 400);
    if (!diagnosis || !diagnosis.trim()) return sendError(res, 'Diagnosis is required', 400);
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Prescription must contain at least 1 medicine item', 400);
    }
    if (items.length > 20) {
      return sendError(res, 'Prescription cannot exceed 20 medicine items', 400);
    }

    // Validate doctor relationship
    const hasRelation = await MedicalRecord.hasDoctorPatientRelationship(doctorId, patientId);
    if (!hasRelation) {
      return sendError(res, 'Access denied. You can only create prescriptions for patients with a valid appointment.', 403);
    }

    // Validate item fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.medicineName || !item.medicineName.trim()) {
        return sendError(res, `Medicine #${i + 1}: Name is required`, 400);
      }
      if (!item.dosage || !item.dosage.trim()) {
        return sendError(res, `Medicine #${i + 1} (${item.medicineName}): Dosage is required`, 400);
      }
      if (!item.frequency || !item.frequency.trim()) {
        return sendError(res, `Medicine #${i + 1} (${item.medicineName}): Frequency is required`, 400);
      }
      const duration = parseInt(item.durationDays, 10);
      if (isNaN(duration) || duration <= 0) {
        return sendError(res, `Medicine #${i + 1} (${item.medicineName}): Duration must be a positive number of days`, 400);
      }
    }

    // Allergy check (Advisory only)
    const warnings = await Prescription.checkAllergies(patientId, items);

    // Transactional save
    const prescription = await Prescription.createWithTransaction({
      patientId,
      doctorId,
      appointmentId,
      medicalRecordId,
      diagnosis,
      advice,
      followUpDate,
      items
    });

    await auditService.log(req, 'create', 'prescription', prescription.id, `Created prescription ${prescription.prescription_number}`);

    // Notify patient
    const patient = await Patient.findById(patientId);
    if (patient && patient.user_id) {
      const doctor = await Doctor.findById(doctorId);
      notificationService.notify(patient.user_id, {
        type: 'prescription_generated',
        title: 'New Prescription Available 💊',
        message: `Dr. ${doctor?.first_name || 'Doctor'} has issued a prescription (${prescription.prescription_number}) for your visit.`,
        link: '/patient/prescriptions',
        data: { prescriptionId: prescription.id }
      }).catch(console.error);
    }

    const fullPrescription = await Prescription.findById(prescription.id);
    return res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: fullPrescription,
      warnings
    });
  },

  // PUT /api/prescriptions/:id
  async update(req, res) {
    if (req.user.role !== 'doctor') {
      return sendError(res, 'Only the prescribing doctor can edit this prescription', 403);
    }

    const { id } = req.params;
    const existing = await Prescription.findById(id);
    if (!existing) return sendError(res, 'Prescription not found', 404);

    if (existing.doctor_id !== req.user.doctorId) {
      return sendError(res, 'Access denied. You can only edit your own prescriptions.', 403);
    }

    // Check 24 hour edit window
    const hoursDiff = (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursDiff > EDIT_WINDOW_HOURS) {
      return sendError(res, 'Edit window closed. Prescriptions can only be edited within 24 hours of creation.', 403);
    }

    const { diagnosis, advice, followUpDate, items } = req.body;

    if (!diagnosis || !diagnosis.trim()) return sendError(res, 'Diagnosis is required', 400);
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Prescription must contain at least 1 medicine item', 400);
    }
    if (items.length > 20) {
      return sendError(res, 'Prescription cannot exceed 20 medicine items', 400);
    }

    // Validate item fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.medicineName || !item.medicineName.trim()) {
        return sendError(res, `Medicine #${i + 1}: Name is required`, 400);
      }
      if (!item.dosage || !item.dosage.trim()) {
        return sendError(res, `Medicine #${i + 1} (${item.medicineName}): Dosage is required`, 400);
      }
      if (!item.frequency || !item.frequency.trim()) {
        return sendError(res, `Medicine #${i + 1} (${item.medicineName}): Frequency is required`, 400);
      }
      const duration = parseInt(item.durationDays, 10);
      if (isNaN(duration) || duration <= 0) {
        return sendError(res, `Medicine #${i + 1} (${item.medicineName}): Duration must be a positive number of days`, 400);
      }
    }

    const warnings = await Prescription.checkAllergies(existing.patient_id, items);

    await Prescription.updateWithTransaction(id, {
      diagnosis,
      advice,
      followUpDate,
      items
    });

    await auditService.log(req, 'update', 'prescription', id, `Updated prescription ${existing.prescription_number}`);

    const fullPrescription = await Prescription.findById(id);
    return res.status(200).json({
      success: true,
      message: 'Prescription updated successfully',
      data: fullPrescription,
      warnings
    });
  },

  // GET /api/prescriptions/my (Patient)
  async getMyPrescriptions(req, res) {
    if (req.user.role !== 'patient') {
      return sendError(res, 'Access denied', 403);
    }
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const { page, limit } = getPagination(req.query);
    const data = await Prescription.getByPatient(patient.id, { page, limit });

    return sendPaginated(res, data.prescriptions, buildPaginationMeta(data.total, page, limit));
  },

  // GET /api/prescriptions/doctor (Doctor)
  async getDoctorPrescriptions(req, res) {
    if (req.user.role !== 'doctor') {
      return sendError(res, 'Access denied', 403);
    }
    const { page, limit } = getPagination(req.query);
    const { search } = req.query;

    const data = await Prescription.getByDoctor(req.user.doctorId, { page, limit, search });
    return sendPaginated(res, data.prescriptions, buildPaginationMeta(data.total, page, limit));
  },

  // GET /api/prescriptions (Admin)
  async getAllPrescriptions(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }
    const { page, limit } = getPagination(req.query);
    const { search } = req.query;

    const data = await Prescription.getAll({ page, limit, search });
    return sendPaginated(res, data.prescriptions, buildPaginationMeta(data.total, page, limit));
  },

  // GET /api/prescriptions/medicine-suggestions
  async getMedicineSuggestions(req, res) {
    const { q } = req.query;
    const suggestions = await Prescription.getMedicineSuggestions(q);
    return sendSuccess(res, suggestions);
  },

  // GET /api/prescriptions/:id
  async getById(req, res) {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);
    if (!prescription) return sendError(res, 'Prescription not found', 404);

    if (req.user.role === 'patient') {
      const ownPatient = await Patient.findByUserId(req.user.userId);
      if (!ownPatient || ownPatient.id !== prescription.patient_id) {
        return sendError(res, 'Prescription not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      if (prescription.doctor_id !== req.user.doctorId) {
        return sendError(res, 'Prescription not found', 404);
      }
    }

    const hoursDiff = (Date.now() - new Date(prescription.created_at).getTime()) / (1000 * 60 * 60);
    const isEditable = req.user.role === 'doctor' && prescription.doctor_id === req.user.doctorId && hoursDiff <= EDIT_WINDOW_HOURS;

    return sendSuccess(res, {
      ...prescription,
      isEditable,
      editWindowRemainingHours: Math.max(0, (EDIT_WINDOW_HOURS - hoursDiff).toFixed(1))
    });
  },

  // GET /api/prescriptions/:id/pdf
  async downloadPDF(req, res) {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);
    if (!prescription) return sendError(res, 'Prescription not found', 404);

    if (req.user.role === 'patient') {
      const ownPatient = await Patient.findByUserId(req.user.userId);
      if (!ownPatient || ownPatient.id !== prescription.patient_id) {
        return sendError(res, 'Prescription not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      if (prescription.doctor_id !== req.user.doctorId) {
        return sendError(res, 'Prescription not found', 404);
      }
    }

    await auditService.log(req, 'download', 'prescription_pdf', id, `Downloaded PDF for ${prescription.prescription_number}`);
    return generatePrescriptionPDF(prescription, res);
  }
};

module.exports = prescriptionController;
