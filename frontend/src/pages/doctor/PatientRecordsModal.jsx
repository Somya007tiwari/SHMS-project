import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthProfileService, medicalRecordService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  X,
  Plus,
  Edit,
  Trash2,
  FileText,
  AlertTriangle,
  Upload,
  File,
  Download,
  Calendar,
  Stethoscope,
  ChevronRight,
  Heart
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const PatientRecordsModal = ({ patientId, patientName, onClose }) => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add' | 'edit'
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Add/Edit Form State
  const [recordForm, setRecordForm] = useState({
    visitDate: dayjs().format('YYYY-MM-DD'),
    symptoms: '',
    diagnosis: '',
    doctorNotes: '',
    followUpDate: ''
  });

  // Selected files for upload
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Queries
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['patient-health-profile', patientId],
    queryFn: () => healthProfileService.getByPatient(patientId).then((r) => r.data),
    enabled: !!patientId,
  });

  const { data: recordsData, isLoading: isRecordsLoading } = useQuery({
    queryKey: ['patient-medical-records', patientId],
    queryFn: () => medicalRecordService.getByPatient(patientId, { limit: 50 }).then((r) => r.data),
    enabled: !!patientId,
  });

  const { data: detailData, refetch: refetchDetail } = useQuery({
    queryKey: ['medical-record-detail', selectedRecord?.id],
    queryFn: () => medicalRecordService.getById(selectedRecord.id).then((r) => r.data),
    enabled: !!selectedRecord?.id,
  });

  // Mutations
  const createRecordMutation = useMutation({
    mutationFn: (data) => medicalRecordService.create(data),
    onSuccess: async (res) => {
      const createdRecord = res.data.data;
      toast.success('Medical record created successfully');

      // Upload pending files if any
      if (selectedFiles.length > 0 && createdRecord?.id) {
        await uploadFiles(createdRecord.id);
      }

      qc.invalidateQueries({ queryKey: ['patient-medical-records', patientId] });
      resetForm();
      setActiveTab('list');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create record');
    }
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }) => medicalRecordService.update(id, data),
    onSuccess: async () => {
      toast.success('Medical record updated successfully');
      if (selectedFiles.length > 0 && selectedRecord?.id) {
        await uploadFiles(selectedRecord.id);
      }
      qc.invalidateQueries({ queryKey: ['patient-medical-records', patientId] });
      qc.invalidateQueries({ queryKey: ['medical-record-detail', selectedRecord?.id] });
      resetForm();
      setActiveTab('list');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update record');
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId) => medicalRecordService.deleteFile(fileId),
    onSuccess: () => {
      toast.success('Attached file deleted');
      refetchDetail();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete file');
    }
  });

  const uploadFiles = async (recordId) => {
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      await medicalRecordService.uploadFiles(recordId, formData);
      toast.success('Files attached successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to attach files');
    }
  };

  const resetForm = () => {
    setRecordForm({
      visitDate: dayjs().format('YYYY-MM-DD'),
      symptoms: '',
      diagnosis: '',
      doctorNotes: '',
      followUpDate: ''
    });
    setSelectedFiles([]);
    setSelectedRecord(null);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`"${f.name}" is invalid. Allowed: PDF, JPG, PNG, WebP.`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        toast.error(`"${f.name}" exceeds 5MB size limit.`);
        continue;
      }
      validFiles.push(f);
    }

    if (selectedFiles.length + validFiles.length > 5) {
      toast.error('Maximum 5 files per record allowed.');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartAdd = () => {
    resetForm();
    setActiveTab('add');
  };

  const handleStartEdit = (record) => {
    setSelectedRecord(record);
    setRecordForm({
      visitDate: dayjs(record.visit_date).format('YYYY-MM-DD'),
      symptoms: record.symptoms || '',
      diagnosis: record.diagnosis || '',
      doctorNotes: record.doctor_notes || '',
      followUpDate: record.follow_up_date ? dayjs(record.follow_up_date).format('YYYY-MM-DD') : ''
    });
    setSelectedFiles([]);
    setActiveTab('edit');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!recordForm.diagnosis.trim()) {
      return toast.error('Diagnosis is required');
    }
    if (!recordForm.symptoms.trim()) {
      return toast.error('Symptoms description is required');
    }

    if (activeTab === 'add') {
      createRecordMutation.mutate({
        patientId,
        ...recordForm
      });
    } else if (activeTab === 'edit' && selectedRecord) {
      updateRecordMutation.mutate({
        id: selectedRecord.id,
        data: recordForm
      });
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const res = await medicalRecordService.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: file.mime_type }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  const healthProfile = profileData || {};
  const records = recordsData?.data || [];
  const fullDetail = detailData || selectedRecord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-lg">Medical Records — {patientName}</h2>
            <p className="text-xs text-slate-400">View history, allergy alerts, and create clinical notes</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Health Profile Alert Box */}
          {!isProfileLoading && (
            <div className={`p-4 rounded-xl border ${healthProfile.allergies ? 'bg-amber-500/10 border-amber-500/30' : isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              {healthProfile.allergies && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <AlertTriangle size={16} /> Allergy Warning Alert
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Blood Group:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{healthProfile.blood_group || 'Not recorded'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Known Allergies:</span>
                  <span className={`font-semibold ${healthProfile.allergies ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {healthProfile.allergies || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Chronic Conditions:</span>
                  <span className="font-semibold">{healthProfile.chronic_conditions || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Emergency Contact:</span>
                  <span className="font-semibold">{healthProfile.emergency_contact_name || 'N/A'} {healthProfile.emergency_contact_phone && `(${healthProfile.emergency_contact_phone})`}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">
              {activeTab === 'list' ? 'Patient History' : activeTab === 'add' ? 'Add New Medical Record' : 'Edit Medical Record'}
            </h3>

            {activeTab === 'list' ? (
              <button
                onClick={handleStartAdd}
                className="btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus size={16} /> Add Medical Record
              </button>
            ) : (
              <button
                onClick={() => { resetForm(); setActiveTab('list'); }}
                className="px-3.5 py-1.5 text-xs font-semibold border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ← Back to Records List
              </button>
            )}
          </div>

          {/* TAB: LIST */}
          {activeTab === 'list' && (
            <div>
              {isRecordsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 skeleton rounded-xl" />
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-2xl text-slate-400 text-sm">
                  No medical records found for this patient. Click "Add Medical Record" to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                              {dayjs(rec.visit_date).format('MMM D, YYYY')}
                            </span>
                            <h4 className="font-bold text-sm truncate">{rec.diagnosis}</h4>
                          </div>

                          {rec.symptoms && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">Symptoms:</span> {rec.symptoms}
                            </p>
                          )}

                          {rec.doctor_notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">Doctor Notes:</span> {rec.doctor_notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(rec)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            title="Edit Record"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADD OR EDIT FORM */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={recordForm.visitDate}
                    onChange={(e) => setRecordForm({ ...recordForm, visitDate: e.target.value })}
                    className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    value={recordForm.followUpDate}
                    onChange={(e) => setRecordForm({ ...recordForm, followUpDate: e.target.value })}
                    className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="Primary diagnosis (e.g., Acute Bronchitis)"
                  value={recordForm.diagnosis}
                  onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Symptoms Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Patient presented symptoms..."
                  value={recordForm.symptoms}
                  onChange={(e) => setRecordForm({ ...recordForm, symptoms: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Doctor Notes & Treatment Plan</label>
                <textarea
                  rows={3}
                  placeholder="Clinical observations, recommended care, tests..."
                  value={recordForm.doctorNotes}
                  onChange={(e) => setRecordForm({ ...recordForm, doctorNotes: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              {/* Existing Attached Files (Edit mode) */}
              {activeTab === 'edit' && fullDetail?.files && fullDetail.files.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-2 text-slate-500 dark:text-slate-400">Attached Files</label>
                  <div className="space-y-2">
                    {fullDetail.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2.5 rounded-xl border dark:border-slate-700 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <File size={16} className="text-blue-500 flex-shrink-0" />
                          <span className="font-semibold truncate">{file.original_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFileMutation.mutate(file.id)}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Delete file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Attachment Input */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Attach Lab Reports / PDFs (Max 5 files, 5MB each)</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {/* Newly selected files list */}
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-xs">
                        <span className="truncate text-blue-800 dark:text-blue-300 font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <button type="button" onClick={() => removeSelectedFile(idx)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab('list'); }}
                  className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRecordMutation.isPending || updateRecordMutation.isPending}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {createRecordMutation.isPending || updateRecordMutation.isPending ? 'Saving...' : activeTab === 'add' ? 'Create Medical Record' : 'Update Medical Record'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientRecordsModal;
