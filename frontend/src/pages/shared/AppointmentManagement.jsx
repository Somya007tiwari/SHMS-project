import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService, reviewService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import { Check, X, Eye, CheckCircle, Calendar, Star, Trash2, RefreshCw, Clock, FileText } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import PatientRecordsModal from '../doctor/PatientRecordsModal';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_COLORS = {
  pending: 'badge-pending', approved: 'badge-approved',
  rejected: 'badge-rejected', completed: 'badge-completed', cancelled: 'badge-cancelled',
  needs_reschedule: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold border border-amber-300'
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

  // Medical Records modal state
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [recordsPatient, setRecordsPatient] = useState(null);

  const openRecordsModal = (appt) => {
    setRecordsPatient({
      id: appt.patient_id,
      name: appt.patient_name
    });
    setShowRecordsModal(true);
  };

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAppt, setReviewAppt] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

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

  // Query slots for Reschedule Modal
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', rescheduleAppt?.doctor_id, rescheduleDate],
    queryFn: () => appointmentService.getAvailableSlots(rescheduleAppt?.doctor_id, rescheduleDate).then(r => r.data.data),
    enabled: !!showRescheduleModal && !!rescheduleAppt?.doctor_id && !!rescheduleDate,
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

  const openReviewModal = (appt) => {
    setReviewAppt(appt);
    setRating(appt.review_rating || 5);
    setHoverRating(0);
    setReviewComment(appt.review_comment || '');
    setShowReviewModal(true);
  };

  const handleSaveReview = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a rating between 1 and 5 stars');
      return;
    }
    setSubmittingReview(true);
    try {
      if (reviewAppt.has_review && reviewAppt.review_id) {
        await reviewService.update(reviewAppt.review_id, {
          rating,
          comment: reviewComment
        });
        toast.success('Review updated successfully!');
      } else {
        await reviewService.create(reviewAppt.doctor_id, {
          appointmentId: reviewAppt.id,
          rating,
          comment: reviewComment
        });
        toast.success('Thank you for rating your visit!');
      }
      qc.invalidateQueries(['appointments']);
      qc.invalidateQueries(['doctors']);
      if (reviewAppt.doctor_id) {
        qc.invalidateQueries(['doctor', reviewAppt.doctor_id]);
        qc.invalidateQueries(['reviews', reviewAppt.doctor_id]);
        qc.invalidateQueries(['ratingSummary', reviewAppt.doctor_id]);
      }
      setShowReviewModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit review';
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewAppt?.review_id) return;
    setDeletingReview(true);
    try {
      await reviewService.delete(reviewAppt.review_id);
      toast.success('Review deleted');
      qc.invalidateQueries(['appointments']);
      qc.invalidateQueries(['doctors']);
      if (reviewAppt.doctor_id) {
        qc.invalidateQueries(['doctor', reviewAppt.doctor_id]);
        qc.invalidateQueries(['reviews', reviewAppt.doctor_id]);
        qc.invalidateQueries(['ratingSummary', reviewAppt.doctor_id]);
      }
      setShowReviewModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeletingReview(false);
    }
  };

  const openRescheduleModal = (appt) => {
    setRescheduleAppt(appt);
    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
    setRescheduleDate(tomorrowStr);
    setRescheduleSlot('');
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleSlot) {
      toast.error('Please select a date and time slot');
      return;
    }
    setSubmittingReschedule(true);
    try {
      await appointmentService.reschedule(rescheduleAppt.id, {
        appointmentDate: rescheduleDate,
        appointmentTime: rescheduleSlot,
      });
      toast.success('Appointment rescheduled successfully!');
      qc.invalidateQueries(['appointments']);
      qc.invalidateQueries(['slots']);
      setShowRescheduleModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reschedule appointment';
      toast.error(msg);
      if (err.response?.status === 409) {
        qc.invalidateQueries(['slots']);
        setRescheduleSlot('');
      }
    } finally {
      setSubmittingReschedule(false);
    }
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
      render: (val, row) => (
        <div className="flex flex-col gap-1 items-start">
          <span className={`badge ${STATUS_COLORS[val] || 'badge-pending'}`}>{val === 'needs_reschedule' ? 'Needs Reschedule' : val}</span>
          {Number(row.reschedule_count) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-semibold" title={`Rescheduled ${row.reschedule_count} time(s)`}>
              Rescheduled ({row.reschedule_count}/2)
            </span>
          )}
        </div>
      )
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
        <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* Patient Medical Records button for Doctor / Admin */}
          {(user?.role === 'doctor' || user?.role === 'admin') && (
            <button
              onClick={() => openRecordsModal(row)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 transition-all flex items-center gap-1"
              title="Medical Records"
            >
              <FileText size={13} />
              Records
            </button>
          )}
          {['pending', 'approved', 'needs_reschedule'].includes(row.status) && (
            <button onClick={() => handleAction(row, 'cancel')}
              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-gray-700 dark:text-gray-400 transition-all" title="Cancel">
              <X size={14} />
            </button>
          )}

          {/* Reschedule Button for Patient / Doctor / Admin */}
          {(user?.role === 'patient' || user?.role === 'admin') &&
            ['pending', 'approved', 'needs_reschedule'].includes(row.status) &&
            Number(row.reschedule_count || 0) < 2 && (
              <button
                onClick={() => openRescheduleModal(row)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 transition-all flex items-center gap-1"
                title="Reschedule Appointment"
              >
                <RefreshCw size={13} />
                Reschedule
              </button>
          )}

          {user?.role === 'patient' && row.status === 'completed' && (
            row.can_review ? (
              <button
                onClick={() => openReviewModal(row)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 transition-all flex items-center gap-1"
              >
                <Star size={13} className="fill-yellow-500 text-yellow-500" />
                Rate Visit
              </button>
            ) : row.has_review ? (
              <button
                onClick={() => openReviewModal(row)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-all flex items-center gap-1"
              >
                <Star size={13} className="fill-blue-500 text-blue-500" />
                Edit Review
              </button>
            ) : null
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
        {['', 'pending', 'approved', 'completed', 'needs_reschedule', 'rejected', 'cancelled'].map(s => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize
              ${statusFilter === s
                ? 'bg-blue-600 text-white shadow-md'
                : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}>
            {s === 'needs_reschedule' ? 'Needs Reschedule' : s || 'All'}
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

      {/* Action Modal (Approve/Reject/Cancel/Complete) */}
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

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Appointment"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setShowRescheduleModal(false)}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReschedule}
              disabled={submittingReschedule || !rescheduleDate || !rescheduleSlot}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
            >
              {submittingReschedule ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <p className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
            Select a new date and time slot with <strong>Dr. {rescheduleAppt?.doctor_name}</strong>.
          </p>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              Select New Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
              value={rescheduleDate}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                setRescheduleSlot('');
              }}
              className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {rescheduleDate && (
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                Select Available Slot <span className="text-red-400">*</span>
              </label>

              {slotsLoading ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading available slots...</p>
              ) : slotsData?.isLeave ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl text-center text-xs font-medium">
                  🗓️ {slotsData.leaveReason || "Doctor is on leave on this day. Please select another date."}
                </div>
              ) : slotsData?.isDayOff ? (
                <div className="bg-slate-100 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400 p-4 rounded-xl text-center text-xs font-medium">
                  🗓️ Doctor is off on this day. Please select another date.
                </div>
              ) : (slotsData?.slots || []).length === 0 ? (
                <div className="bg-slate-50 dark:bg-gray-700/30 text-slate-500 dark:text-gray-400 p-4 rounded-xl text-center text-xs font-medium">
                  ⏰ No available slots left on this day.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(slotsData?.slots || []).map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => slot.available && setRescheduleSlot(slot.time)}
                      disabled={!slot.available}
                      className={`py-2 px-1 text-xs font-medium border text-center rounded-lg transition-all
                        ${!slot.available ? "bg-slate-100 dark:bg-gray-800 text-slate-400 border-slate-200 dark:border-gray-700 opacity-50 cursor-not-allowed" : ""}
                        ${rescheduleSlot === slot.time ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500" : ""}
                        ${slot.available && rescheduleSlot !== slot.time ? `border-slate-200 dark:border-gray-700 ${isDark ? "text-gray-300 hover:bg-gray-700" : "text-slate-700 hover:bg-blue-50"}` : ""}`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Patient Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={reviewAppt?.has_review ? "Edit Your Review" : "Rate Your Consultation"}
        footer={
          <div className="flex justify-between items-center w-full">
            {reviewAppt?.has_review ? (
              <button
                onClick={handleDeleteReview}
                disabled={deletingReview || submittingReview}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 size={16} /> Delete
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="btn-secondary px-5 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReview}
                disabled={submittingReview || deletingReview || !rating}
                className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
              >
                {submittingReview ? "Saving..." : "Submit Review"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <p className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
            How was your appointment with <strong>Dr. {reviewAppt?.doctor_name}</strong> on{" "}
            {dayjs(reviewAppt?.appointment_date).format("MMM D, YYYY")}?
          </p>

          {/* Interactive Star Picker */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Select Rating <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-transform transform hover:scale-110"
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    size={32}
                    className={`${
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-200 dark:text-gray-600"
                    } transition-colors`}
                  />
                </button>
              ))}
              <span className="ml-2 font-bold text-lg text-slate-700 dark:text-gray-200">
                {hoverRating || rating}/5
              </span>
            </div>
          </div>

          {/* Comment with 1000 char limit */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Your Comment (Optional)
              </label>
              <span className="text-xs text-slate-400">
                {reviewComment.length}/1000
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={1000}
              className="input-field resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Share details of your experience with the doctor..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Patient Medical Records Modal */}
      {showRecordsModal && recordsPatient && (
        <PatientRecordsModal
          patientId={recordsPatient.id}
          patientName={recordsPatient.name}
          onClose={() => {
            setShowRecordsModal(false);
            setRecordsPatient(null);
          }}
        />
      )}
    </div>
  );
};

export default AppointmentManagement;
