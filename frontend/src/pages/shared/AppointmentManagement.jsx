import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import { Check, X, Eye, CheckCircle, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_COLORS = {
  pending: 'badge-pending', approved: 'badge-approved',
  rejected: 'badge-rejected', completed: 'badge-completed', cancelled: 'badge-cancelled'
};

const AppointmentManagement = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page, statusFilter, user?.role],
    queryFn: () => {
      const params = { page, limit: 10, status: statusFilter || undefined };
      return (user?.role === 'admin'
        ? appointmentService.getAll(params)
        : appointmentService.getMyAppointments(params)
      ).then(r => r.data);
    }
  });

  const mutation = useMutation({
    mutationFn: async ({ type, id, data }) => {
      if (type === 'approve') return appointmentService.approve(id);
      if (type === 'reject') return appointmentService.reject(id, data);
      if (type === 'complete') return appointmentService.complete(id);
      if (type === 'cancel') return appointmentService.cancel(id);
    },
    onSuccess: () => {
      toast.success('Appointment updated');
      qc.invalidateQueries(['appointments']);
      setShowModal(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed')
  });

  const handleAction = (appt, actionType) => {
    setSelectedAppt(appt);
    setAction(actionType);
    setRejectReason('');
    setShowModal(true);
  };

  const confirmAction = () => {
    mutation.mutate({
      type: action,
      id: selectedAppt.id,
      data: action === 'reject' ? { rejectionReason: rejectReason } : undefined
    });
  };

  const columns = [
    {
      key: 'patient_name',
      label: 'Patient',
      render: (val, row) => (
        <div>
          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.role === 'doctor' ? row.patient_name : row.patient_name}</p>
        </div>
      )
    },
    {
      key: 'doctor_name',
      label: 'Doctor',
      render: (val) => val ? `Dr. ${val}` : '-'
    },
    {
      key: 'appointment_date',
      label: 'Date & Time',
      render: (val, row) => (
        <div>
          <p className="text-sm">{dayjs(val).format('MMM D, YYYY')}</p>
          <p className="text-xs text-slate-400">{String(row.appointment_time).substring(0, 5)}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <span className={`badge ${STATUS_COLORS[val]}`}>{val}</span>
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (val) => <span className="text-sm text-slate-400 truncate max-w-xs">{val || '-'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {(user?.role === 'doctor' || user?.role === 'admin') && row.status === 'pending' && (
            <>
              <button onClick={() => handleAction(row, 'approve')}
                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all" title="Approve">
                <Check size={14} />
              </button>
              <button onClick={() => handleAction(row, 'reject')}
                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all" title="Reject">
                <X size={14} />
              </button>
            </>
          )}
          {(user?.role === 'doctor' || user?.role === 'admin') && row.status === 'approved' && (
            <button onClick={() => handleAction(row, 'complete')}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all" title="Mark Complete">
              <CheckCircle size={14} />
            </button>
          )}
          {['pending', 'approved'].includes(row.status) && (
            <button onClick={() => handleAction(row, 'cancel')}
              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-gray-700 dark:text-gray-400 transition-all" title="Cancel">
              <X size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  // Hide doctor column for doctor role
  const visibleColumns = user?.role === 'doctor'
    ? columns.filter(c => c.key !== 'doctor_name')
    : columns;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['', 'pending', 'approved', 'completed', 'rejected', 'cancelled'].map(s => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize
              ${statusFilter === s
                ? 'bg-blue-600 text-white shadow-md'
                : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <DataTable
          columns={visibleColumns}
          data={data?.data || []}
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          emptyMessage="No appointments found"
          emptyIcon={Calendar}
        />
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${action?.charAt(0).toUpperCase() + action?.slice(1)} Appointment`}
        footer={
          <>
            <button onClick={() => setShowModal(false)}
              className="btn-secondary px-5 py-2 text-sm">Cancel</button>
            <button onClick={confirmAction} disabled={mutation.isPending || (action === 'reject' && !rejectReason)}
              className={`btn-primary px-5 py-2 text-sm ${action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''} disabled:opacity-50`}>
              {mutation.isPending ? 'Processing...' : 'Confirm'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            Are you sure you want to <strong>{action}</strong> the appointment with{' '}
            <strong>{selectedAppt?.patient_name || selectedAppt?.doctor_name}</strong>?
          </p>
          {action === 'reject' && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                Rejection Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                className="input-field resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Please provide a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentManagement;
