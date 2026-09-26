const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const prescriptionController = {
  async create(req, res) {
    const { patientId, appointmentId, medicines, notes, validUntil, medicalRecordId } = req.body;

    const prescription = await Prescription.create({
      patientId,
      doctorId: req.user.doctorId,
      appointmentId,
      medicalRecordId,
      notes,
      validUntil
    });

    // Add medicines
    if (medicines && medicines.length > 0) {
      for (const med of medicines) {
        await Prescription.addMedicine(prescription.id, med);
      }
    }

    const fullPrescription = await Prescription.findById(prescription.id);

    // Notify patient
    notificationService.prescriptionGenerated({
      patientUserId: req.body.patientUserId,
      doctorName: `${req.user.firstName} ${req.user.lastName}`,
      prescriptionId: prescription.id
    }).catch(console.error);

    await auditService.log(req, 'create', 'prescription', prescription.id, `Prescription created for patient`);

    return sendCreated(res, fullPrescription, 'Prescription created successfully');
  },

  async getById(req, res) {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 'Prescription not found', 404);
    return sendSuccess(res, prescription);
  },

  async getMyPrescriptions(req, res) {
    const { page, limit } = getPagination(req.query);

    let data;
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) return sendError(res, 'Patient profile not found', 404);
      data = await Prescription.getByPatient(patient.id, { page, limit });
      return sendPaginated(res, data.prescriptions, buildPaginationMeta(data.total, page, limit));
    } else if (req.user.role === 'doctor') {
      const prescriptions = await Prescription.getByDoctor(req.user.doctorId, { page, limit });
      return sendSuccess(res, prescriptions);
    }

    return sendError(res, 'Unauthorized', 403);
  },

  async downloadPDF(req, res) {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 'Prescription not found', 404);

    const pdfBuffer = await pdfService.generatePrescription(prescription);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescription.id.substring(0, 8)}.pdf"`);
    res.send(pdfBuffer);

    await auditService.log(req, 'download', 'prescription', prescription.id, 'Prescription PDF downloaded');
  }
};

module.exports = prescriptionController;
