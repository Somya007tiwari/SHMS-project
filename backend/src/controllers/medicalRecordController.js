const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const PatientHealthProfile = require('../models/PatientHealthProfile');
const Doctor = require('../models/Doctor');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const RECORDS_DIR = path.join(__dirname, '../../uploads/records');
if (!fs.existsSync(RECORDS_DIR)) {
  fs.mkdirSync(RECORDS_DIR, { recursive: true });
}

const medicalRecordController = {
  // GET /api/patients/me/health-profile
  async getMyHealthProfile(req, res) {
    if (req.user.role !== 'patient') {
      return sendError(res, 'Access denied', 403);
    }
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const profile = await PatientHealthProfile.getByPatientId(patient.id);
    return sendSuccess(res, profile);
  },

  // PUT /api/patients/me/health-profile
  async updateMyHealthProfile(req, res) {
    if (req.user.role !== 'patient') {
      return sendError(res, 'Only patients can update their health profile', 403);
    }
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const { bloodGroup, allergies, chronicConditions, emergencyContactName, emergencyContactPhone } = req.body;

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (bloodGroup && !validBloodGroups.includes(bloodGroup)) {
      return sendError(res, `Invalid blood group. Allowed: ${validBloodGroups.join(', ')}`, 400);
    }

    const updated = await PatientHealthProfile.upsert(patient.id, {
      bloodGroup,
      allergies,
      chronicConditions,
      emergencyContactName,
      emergencyContactPhone
    });

    await auditService.log(req, 'update', 'patient_health_profile', patient.id, 'Updated health profile');
    return sendSuccess(res, updated, 'Health profile updated successfully');
  },

  // GET /api/patients/:patientId/health-profile
  async getPatientHealthProfile(req, res) {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) return sendError(res, 'Patient not found', 404);

    if (req.user.role === 'patient') {
      const ownPatient = await Patient.findByUserId(req.user.userId);
      if (!ownPatient || ownPatient.id !== patientId) {
        return sendError(res, 'Patient health profile not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      const hasRelation = await MedicalRecord.hasDoctorPatientRelationship(req.user.doctorId, patientId);
      if (!hasRelation) {
        return sendError(res, 'Patient health profile not found', 404);
      }
    }

    const profile = await PatientHealthProfile.getByPatientId(patientId);
    return sendSuccess(res, profile);
  },

  // GET /api/medical-records/my (Patient own records)
  async getMyRecords(req, res) {
    if (req.user.role !== 'patient') {
      return sendError(res, 'Unauthorized', 403);
    }
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const { page, limit } = getPagination(req.query);
    const { search } = req.query;

    const data = await MedicalRecord.getByPatientId(patient.id, { page, limit, search });
    return sendPaginated(res, data.records, buildPaginationMeta(data.total, page, limit));
  },

  // GET /api/medical-records/patient/:patientId (Doctor or Admin)
  async getPatientRecords(req, res) {
    const { patientId } = req.params;
    const { page, limit } = getPagination(req.query);
    const { search } = req.query;

    if (req.user.role === 'doctor') {
      const hasRelation = await MedicalRecord.hasDoctorPatientRelationship(req.user.doctorId, patientId);
      if (!hasRelation) {
        return sendError(res, 'Patient medical records not found', 404);
      }
    } else if (req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }

    const data = await MedicalRecord.getByPatientId(patientId, { page, limit, search });
    return sendPaginated(res, data.records, buildPaginationMeta(data.total, page, limit));
  },

  // GET /api/medical-records/all (Admin or Doctor search)
  async getAllRecords(req, res) {
    const { page, limit } = getPagination(req.query);
    const { search, patientId, doctorId } = req.query;

    if (req.user.role === 'doctor') {
      const data = await MedicalRecord.getAll({ page, limit, search, doctorId: req.user.doctorId, patientId });
      return sendPaginated(res, data.records, buildPaginationMeta(data.total, page, limit));
    } else if (req.user.role === 'admin') {
      const data = await MedicalRecord.getAll({ page, limit, search, doctorId, patientId });
      return sendPaginated(res, data.records, buildPaginationMeta(data.total, page, limit));
    } else {
      return sendError(res, 'Access denied', 403);
    }
  },

  // GET /api/medical-records/:id
  async getById(req, res) {
    const { id } = req.params;
    const record = await MedicalRecord.findById(id);
    if (!record) return sendError(res, 'Medical record not found', 404);

    if (req.user.role === 'patient') {
      const ownPatient = await Patient.findByUserId(req.user.userId);
      if (!ownPatient || ownPatient.id !== record.patient_id) {
        return sendError(res, 'Medical record not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      const hasRelation = await MedicalRecord.hasDoctorPatientRelationship(req.user.doctorId, record.patient_id);
      if (!hasRelation) {
        return sendError(res, 'Medical record not found', 404);
      }
    }

    const files = await MedicalRecord.getFilesByRecordId(id);
    await MedicalRecord.logAccess(req.user.userId, id, 'view');

    return sendSuccess(res, { ...record, files });
  },

  // POST /api/medical-records
  async create(req, res) {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return sendError(res, 'Only doctors or administrators can create medical records', 403);
    }

    const { patientId, appointmentId, visitDate, symptoms, diagnosis, doctorNotes, followUpDate } = req.body;

    if (!patientId) return sendError(res, 'Patient ID is required', 400);
    if (!visitDate) return sendError(res, 'Visit date is required', 400);
    if (!symptoms || !symptoms.trim()) return sendError(res, 'Symptoms description is required', 400);
    if (!diagnosis || !diagnosis.trim()) return sendError(res, 'Diagnosis is required', 400);

    // Validate lengths
    if (symptoms.length > 5000) return sendError(res, 'Symptoms text cannot exceed 5000 characters', 400);
    if (diagnosis.length > 5000) return sendError(res, 'Diagnosis text cannot exceed 5000 characters', 400);
    if (doctorNotes && doctorNotes.length > 5000) return sendError(res, 'Doctor notes cannot exceed 5000 characters', 400);

    let doctorId = req.user.doctorId;

    if (req.user.role === 'doctor') {
      const hasRelation = await MedicalRecord.hasDoctorPatientRelationship(doctorId, patientId);
      if (!hasRelation) {
        return sendError(res, 'Access denied. You can only create records for patients with an active or previous appointment.', 403);
      }
    } else if (req.user.role === 'admin') {
      // If admin creates record, fallback doctor ID from appointment or patient
      if (req.body.doctorId) {
        doctorId = req.body.doctorId;
      }
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return sendError(res, 'Patient not found', 404);

    const record = await MedicalRecord.create({
      patientId,
      doctorId,
      appointmentId,
      visitDate,
      symptoms: symptoms.trim(),
      diagnosis: diagnosis.trim(),
      doctorNotes: doctorNotes ? doctorNotes.trim() : null,
      followUpDate
    });

    await MedicalRecord.logAccess(req.user.userId, record.id, 'create');
    await auditService.log(req, 'create', 'medical_record', record.id, 'Created medical record');

    // Notify patient
    if (patient.user_id) {
      const doctor = await Doctor.findById(doctorId);
      notificationService.notify(patient.user_id, {
        type: 'system',
        title: 'New Medical Record Added 📋',
        message: `Dr. ${doctor?.first_name || 'Doctor'} added a medical record for your visit on ${visitDate}.`,
        link: '/patient/medical-records',
        data: { recordId: record.id }
      }).catch(console.error);
    }

    const fullRecord = await MedicalRecord.findById(record.id);
    return sendCreated(res, fullRecord, 'Medical record created successfully');
  },

  // PUT /api/medical-records/:id
  async update(req, res) {
    const { id } = req.params;
    const record = await MedicalRecord.findById(id);
    if (!record) return sendError(res, 'Medical record not found', 404);

    if (req.user.role === 'patient') {
      return sendError(res, 'Patients cannot edit medical records', 403);
    } else if (req.user.role === 'doctor') {
      if (record.doctor_id !== req.user.doctorId) {
        return sendError(res, 'Access denied. You can only edit records you created.', 403);
      }
    }

    const { visitDate, symptoms, diagnosis, doctorNotes, followUpDate } = req.body;

    if (symptoms && symptoms.length > 5000) return sendError(res, 'Symptoms text cannot exceed 5000 characters', 400);
    if (diagnosis && diagnosis.length > 5000) return sendError(res, 'Diagnosis text cannot exceed 5000 characters', 400);
    if (doctorNotes && doctorNotes.length > 5000) return sendError(res, 'Doctor notes cannot exceed 5000 characters', 400);

    const updated = await MedicalRecord.update(id, {
      visitDate,
      symptoms,
      diagnosis,
      doctorNotes,
      followUpDate
    });

    await MedicalRecord.logAccess(req.user.userId, id, 'update');
    await auditService.log(req, 'update', 'medical_record', id, 'Updated medical record');

    const fullRecord = await MedicalRecord.findById(id);
    return sendSuccess(res, fullRecord, 'Medical record updated successfully');
  },

  // DELETE /api/medical-records/:id (Admin only)
  async delete(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can delete medical records', 403);
    }

    const { id } = req.params;
    const record = await MedicalRecord.findById(id);
    if (!record) return sendError(res, 'Medical record not found', 404);

    // Get attached files and delete from disk
    const files = await MedicalRecord.getFilesByRecordId(id);
    for (const f of files) {
      try {
        const filePath = path.join(RECORDS_DIR, f.stored_name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to delete disk asset ${f.stored_name}:`, err.message);
      }
    }

    await MedicalRecord.logAccess(req.user.userId, id, 'delete');
    await MedicalRecord.delete(id);
    await auditService.log(req, 'delete', 'medical_record', id, 'Deleted medical record');

    return sendSuccess(res, null, 'Medical record deleted successfully');
  },

  // POST /api/medical-records/:id/files (Creating doctor or Admin)
  async uploadFiles(req, res) {
    const { id } = req.params;
    const record = await MedicalRecord.findById(id);
    if (!record) return sendError(res, 'Medical record not found', 404);

    if (req.user.role === 'patient') {
      return sendError(res, 'Patients cannot attach files to medical records', 403);
    } else if (req.user.role === 'doctor') {
      if (record.doctor_id !== req.user.doctorId) {
        return sendError(res, 'Access denied. Only the creating doctor or admin can attach files.', 403);
      }
    }

    const existingFiles = await MedicalRecord.getFilesByRecordId(id);
    if (existingFiles.length + req.files.length > 5) {
      return sendError(res, `Cannot upload files. Maximum 5 files allowed per medical record (currently has ${existingFiles.length}).`, 400);
    }

    const savedFiles = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname) || '.dat';
      const storedName = `${uuidv4()}${ext}`;
      const targetPath = path.join(RECORDS_DIR, storedName);

      fs.writeFileSync(targetPath, file.buffer);

      const fileRow = await MedicalRecord.addFile({
        recordId: id,
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: req.user.userId
      });

      savedFiles.push(fileRow);
    }

    await MedicalRecord.logAccess(req.user.userId, id, 'update');
    await auditService.log(req, 'upload', 'medical_record_files', id, `Uploaded ${savedFiles.length} file(s)`);

    const allFiles = await MedicalRecord.getFilesByRecordId(id);
    return sendSuccess(res, allFiles, 'Files uploaded successfully');
  },

  // GET /api/medical-records/files/:fileId/download
  async downloadFile(req, res) {
    const { fileId } = req.params;
    const file = await MedicalRecord.getFileById(fileId);
    if (!file) return sendError(res, 'File not found', 404);

    const record = await MedicalRecord.findById(file.record_id);
    if (!record) return sendError(res, 'Medical record not found', 404);

    if (req.user.role === 'patient') {
      const ownPatient = await Patient.findByUserId(req.user.userId);
      if (!ownPatient || ownPatient.id !== record.patient_id) {
        return sendError(res, 'File not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      const hasRelation = await MedicalRecord.hasDoctorPatientRelationship(req.user.doctorId, record.patient_id);
      if (!hasRelation) {
        return sendError(res, 'File not found', 404);
      }
    }

    const filePath = path.join(RECORDS_DIR, file.stored_name);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'File asset not found on server', 404);
    }

    await MedicalRecord.logAccess(req.user.userId, file.record_id, 'download');

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  },

  // DELETE /api/medical-records/files/:fileId (Uploader doctor or Admin)
  async deleteFile(req, res) {
    const { fileId } = req.params;
    const file = await MedicalRecord.getFileById(fileId);
    if (!file) return sendError(res, 'File not found', 404);

    if (req.user.role === 'doctor') {
      if (file.doctor_id !== req.user.doctorId && file.uploaded_by !== req.user.userId) {
        return sendError(res, 'Access denied. You can only delete files you uploaded.', 403);
      }
    } else if (req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }

    try {
      const filePath = path.join(RECORDS_DIR, file.stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete disk asset ${file.stored_name}:`, err.message);
    }

    await MedicalRecord.deleteFile(fileId);
    await MedicalRecord.logAccess(req.user.userId, file.record_id, 'update');
    await auditService.log(req, 'delete', 'medical_record_files', fileId, 'Deleted attached file');

    return sendSuccess(res, null, 'File deleted successfully');
  }
};

module.exports = medicalRecordController;
