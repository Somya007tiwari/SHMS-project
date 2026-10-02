import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalRecordService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import {
  FileText,
  Search,
  Calendar,
  User,
  Stethoscope,
  Eye,
  Edit,
  Trash2,
  Download,
  File,
  X,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const AdminMedicalRecords = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    visitDate: '',
    symptoms: '',
    diagnosis: '',
    doctorNotes: '',
    followUpDate: ''
  });

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['admin-medical-records', { page, search }],
    queryFn: () => medicalRecordService.getAll({ page, limit: 10, search }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: viewDetail } = useQuery({
    queryKey: ['medical-record-detail', viewRecord?.id],
    queryFn: () => medicalRecordService.getById(viewRecord.id).then((r) => r.data),
    enabled: !!viewRecord?.id,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => medicalRecordService.update(id, data),
    onSuccess: () => {
      toast.success('Medical record updated successfully');
      qc.invalidateQueries({ queryKey: ['admin-medical-records'] });
      setEditRecord(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update medical record');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => medicalRecordService.delete(id),
    onSuccess: () => {
      toast.success('Medical record deleted permanently');
      qc.invalidateQueries({ queryKey: ['admin-medical-records'] });
      setDeleteRecord(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete medical record');
    }
  });

  const handleOpenEdit = (rec) => {
    setEditRecord(rec);
    setEditForm({
      visitDate: dayjs(rec.visit_date).format('YYYY-MM-DD'),
      symptoms: rec.symptoms || '',
      diagnosis: rec.diagnosis || '',
      doctorNotes: rec.doctor_notes || '',
      followUpDate: rec.follow_up_date ? dayjs(rec.follow_up_date).format('YYYY-MM-DD') : ''
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.diagnosis.trim()) return toast.error('Diagnosis is required');
    if (!editForm.symptoms.trim()) return toast.error('Symptoms description is required');

    updateMutation.mutate({
      id: editRecord.id,
      data: editForm
    });
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

  const records = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const fullViewDetail = viewDetail || viewRecord;

  const columns = [
    {
      key: 'visit_date',
      title: 'Visit Date',
      render: (val) => (
        <span className="font-semibold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
          {dayjs(val).format('MMM D, YYYY')}
        </span>
      )
    },
    {
      key: 'patient_name',
      title: 'Patient',
      render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val || 'Patient'}</span>
    },
    {
      key: 'doctor_name',
      title: 'Attending Doctor',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">Dr. {val}</p>
          <p className="text-[10px] text-slate-400">{row.department_name || row.specialization}</p>
        </div>
      )
    },
    {
      key: 'diagnosis',
      title: 'Diagnosis',
      render: (val) => <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewRecord(row)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
            title="View Details"
          >
            <Eye size={15} />
          </button>

          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
            title="Edit Record"
          >
            <Edit size={15} />
          </button>

          <button
            onClick={() => setDeleteRecord(row)}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
            title="Delete Record"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Medical Records Management
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            System-wide repository of consultation records, clinical notes, and attached diagnostics.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, doctor, diagnosis..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      <div className={`card p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
        <DataTable
          columns={columns}
          data={records}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          emptyMessage="No medical records found"
          emptyIcon={FileText}
        />
      </div>

      {/* View Record Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                  Visit Date: {dayjs(fullViewDetail.visit_date).format('MMMM D, YYYY')}
                </span>
                <h2 className="text-xl font-bold mt-2">{fullViewDetail.diagnosis}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: <span className="font-semibold text-slate-200">{fullViewDetail.patient_name}</span> | Doctor: <span className="font-semibold text-slate-200">Dr. {fullViewDetail.doctor_name}</span>
                </p>
              </div>
              <button onClick={() => setViewRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 pt-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Symptoms Description</h4>
                <p className={`text-sm leading-relaxed p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  {fullViewDetail.symptoms || 'No symptoms specified.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Doctor Notes & Clinical Details</h4>
                <p className={`text-sm leading-relaxed p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  {fullViewDetail.doctor_notes || 'No doctor notes listed.'}
                </p>
              </div>

              {fullViewDetail.follow_up_date && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl">
                  <Calendar size={16} />
                  <span>Follow-up Date: {dayjs(fullViewDetail.follow_up_date).format('MMMM D, YYYY')}</span>
                </div>
              )}

              {/* Attached Files */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Attached Documents ({fullViewDetail.files?.length || 0})</h4>
                {fullViewDetail.files && fullViewDetail.files.length > 0 ? (
                  <div className="space-y-2">
                    {fullViewDetail.files.map((file) => (
                      <div key={file.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <File size={18} className="text-blue-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{file.original_name}</p>
                            <p className="text-[10px] text-slate-400">{(file.size_bytes / 1024).toFixed(1)} KB • {file.mime_type}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 hover:bg-blue-200 transition-colors"
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No files attached to this medical record.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Edit Medical Record</h3>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.visitDate}
                    onChange={(e) => setEditForm({ ...editForm, visitDate: e.target.value })}
                    className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Follow-up Date</label>
                  <input
                    type="date"
                    value={editForm.followUpDate}
                    onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                    className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={editForm.diagnosis}
                  onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Symptoms *</label>
                <textarea
                  rows={3}
                  required
                  value={editForm.symptoms}
                  onChange={(e) => setEditForm({ ...editForm, symptoms: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Doctor Notes</label>
                <textarea
                  rows={3}
                  value={editForm.doctorNotes}
                  onChange={(e) => setEditForm({ ...editForm, doctorNotes: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRecord && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteRecord(null)}
          title="Delete Medical Record"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button onClick={() => setDeleteRecord(null)} className="btn-secondary px-5 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteRecord.id)}
                disabled={deleteMutation.isPending}
                className="btn-primary bg-red-600 hover:bg-red-700 px-5 py-2 text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-red-600 bg-red-50 dark:bg-red-950/40 p-3.5 rounded-xl text-xs font-medium">
              <ShieldAlert size={20} className="flex-shrink-0" />
              <span>Warning: Deleting a medical record is permanent and removes all associated files.</span>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              Are you sure you want to delete the record for <strong>{deleteRecord.patient_name}</strong> (Diagnosis: {deleteRecord.diagnosis})?
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminMedicalRecords;
