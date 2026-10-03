import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { useTheme } from '../../context/ThemeContext';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  AlertTriangle,
  Receipt,
  FileCheck,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_BADGES = {
  requested: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  sample_collected: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  processing: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

const FLAG_BADGES = {
  normal: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-300',
  low: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold border-amber-300',
  high: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold border-rose-300',
  abnormal: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold border-rose-300',
  unknown: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

const STATUS_STEP_ORDER = ['requested', 'scheduled', 'sample_collected', 'processing', 'completed'];

export default function AdminLabOrders() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Order for Detail Drawer / Modal
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);

  // Result Form State inside Modal
  const [resultValue, setResultValue] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [manualFlag, setManualFlag] = useState('normal');

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Fetch Orders List
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-lab-orders', page, search, statusFilter, fromDate, toDate],
    queryFn: async () => {
      const res = await labService.getAllOrders({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      return res.data;
    },
  });

  // Fetch Detail for Modal
  const { data: detailData, isLoading: isDetailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['lab-order-detail-admin', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await labService.getOrderById(selectedOrderId);
      return res.data?.data;
    },
    enabled: !!selectedOrderId,
  });

  const order = detailData || null;

  // Status Advance Mutation
  const advanceStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }) => {
      return labService.updateOrderStatus(orderId, nextStatus);
    },
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      refetchDetail();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  });

  // Save Result Mutation
  const saveResultMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId) return;
      return labService.submitResult(selectedOrderId, {
        resultValue,
        resultNotes,
        manualFlag
      });
    },
    onSuccess: () => {
      toast.success('Lab result saved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      refetchDetail();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save lab result');
    }
  });

  // Add to Invoice Mutation
  const invoiceMutation = useMutation({
    mutationFn: async (orderId) => labService.addToInvoice(orderId),
    onSuccess: (res) => {
      toast.success('Lab order successfully added to invoice');
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      refetchDetail();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add to invoice');
    }
  });

  // Delete File Mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => labService.deleteFile(fileId),
    onSuccess: () => {
      toast.success('Report file deleted');
      setFileToDelete(null);
      refetchDetail();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete file');
      setFileToDelete(null);
    }
  });

  const handleOpenDetail = (orderId) => {
    setSelectedOrderId(orderId);
  };

  // Populate Result Form when detail loads
  React.useEffect(() => {
    if (order) {
      setResultValue(order.result_value || '');
      setResultNotes(order.result_notes || '');
      setManualFlag(order.result_flag || 'normal');
      setSelectedFiles([]);
    }
  }, [order]);

  // Handle File Upload Submit
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      return toast.error('Please select at least one PDF or image report file');
    }

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append('files', file);
    }

    setUploadingFiles(true);
    try {
      await labService.uploadFiles(selectedOrderId, formData);
      toast.success('Report file(s) uploaded successfully');
      setSelectedFiles([]);
      refetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload report files');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Download PDF / Image Report File through authenticated Blob Stream
  const handleDownloadFile = async (fileId, fileName) => {
    const toastId = toast.loading('Downloading file...');
    try {
      const res = await labService.downloadFile(fileId);
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded', { id: toastId });
    } catch (err) {
      toast.error('Failed to download file', { id: toastId });
    }
  };

  const columns = [
    {
      key: 'order_number',
      label: 'Order No.',
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
            {val}
          </span>
          <p className="text-[11px] text-slate-400">
            {dayjs(row.created_at).format('MMM D, YYYY · HH:mm')}
          </p>
        </div>
      )
    },
    {
      key: 'patient_name',
      label: 'Patient',
      render: (val) => (
        <span className="font-semibold text-sm text-slate-800 dark:text-white">
          {val}
        </span>
      )
    },
    {
      key: 'test_name',
      label: 'Test Name & Category',
      render: (_, row) => (
        <div>
          <p className="font-bold text-xs text-slate-800 dark:text-white">{row.test_name}</p>
          <span className="text-[10px] text-slate-500 dark:text-gray-400">{row.test_category}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGES[val] || STATUS_BADGES.requested}`}>
          {val.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'result_flag',
      label: 'Result',
      render: (_, row) => (
        row.status === 'completed' && row.result_value ? (
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded text-xs border ${FLAG_BADGES[row.result_flag] || FLAG_BADGES.normal}`}>
              {row.result_flag ? row.result_flag.toUpperCase() : 'NORMAL'}
            </span>
            <span className="text-xs text-slate-600 dark:text-gray-300 font-mono">
              ({row.result_value} {row.unit || ''})
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Pending</span>
        )
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => handleOpenDetail(row.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 text-xs font-semibold"
          title="View & Manage Lab Order"
        >
          <Eye size={15} /> View
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileCheck className="text-blue-600 dark:text-blue-400" />
            Lab Orders & Results Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Track patient lab requests, update workflow status, submit results, and upload report PDFs.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order #, patient name, test..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-9 py-1.5 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            title="From Date"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            title="To Date"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="card dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 skeleton rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message="Failed to load lab orders" onRetry={refetch} />
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={false}
            pagination={data?.pagination}
            onPageChange={setPage}
            emptyMessage="No lab orders match your filters"
            emptyIcon={FileCheck}
          />
        )}
      </div>

      {/* Order Detail & Management Modal */}
      {selectedOrderId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrderId(null)}
          title={order ? `Manage Lab Order #${order.order_number}` : 'Loading Order Details...'}
          size="xl"
        >
          {isDetailLoading || !order ? (
            <div className="p-8 text-center text-slate-400">Loading lab order details...</div>
          ) : (
            <div className="space-y-6">
              {/* Order Info & Patient Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-800 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Patient Info</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-white mt-1">{order.patient_name}</p>
                  <p className="text-slate-500 dark:text-gray-400">Phone: {order.patient_phone || 'N/A'} | Email: {order.patient_email || 'N/A'}</p>
                  <p className="text-slate-500 dark:text-gray-400">Gender: {(order.gender || 'N/A').toUpperCase()}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Test Details</p>
                  <p className="font-bold text-sm text-blue-600 dark:text-blue-400 mt-1">{order.test_name}</p>
                  <p className="text-slate-500 dark:text-gray-400">Category: {order.test_category} | Price: ₹{parseFloat(order.test_price || 0).toFixed(2)}</p>
                  <p className="text-slate-500 dark:text-gray-400">
                    Ordering Doctor: {order.doctor_name ? `Dr. ${order.doctor_name}` : 'Self-Booked by Patient'}
                  </p>
                </div>
              </div>

              {/* Workflow Status Stepper */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Workflow Status
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGES[order.status]}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Progress Pipeline */}
                {order.status !== 'cancelled' ? (
                  <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                    {STATUS_STEP_ORDER.map((step, idx) => {
                      const currentIdx = STATUS_STEP_ORDER.indexOf(order.status);
                      const isDone = idx <= currentIdx;
                      const isNext = idx === currentIdx + 1;

                      return (
                        <div key={step} className="flex items-center gap-2">
                          <div
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              isDone
                                ? 'bg-blue-600 text-white shadow-sm'
                                : isNext
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-300'
                                : 'bg-slate-100 dark:bg-gray-800 text-slate-400'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="capitalize">{step.replace('_', ' ')}</span>
                          </div>

                          {isNext && (
                            <button
                              type="button"
                              onClick={() => advanceStatusMutation.mutate({ orderId: order.id, nextStatus: step })}
                              disabled={advanceStatusMutation.isPending}
                              className="btn-primary py-1 px-2 text-[11px] flex items-center gap-1"
                              title={`Advance status to ${step}`}
                            >
                              Move to {step.replace('_', ' ')} <ArrowRight size={12} />
                            </button>
                          )}

                          {idx < STATUS_STEP_ORDER.length - 1 && (
                            <span className="text-slate-300 dark:text-gray-700">→</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold text-center">
                    ❌ This order was cancelled and cannot advance in status.
                  </div>
                )}
              </div>

              {/* Result Submission Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Enter / Edit Test Result
                  </h4>
                  {order.unit && (
                    <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                      Unit: {order.unit}
                    </span>
                  )}
                </div>

                {/* Reference Range Display */}
                <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-gray-300">Test Reference Parameters:</p>
                  {order.normal_min !== null && order.normal_max !== null ? (
                    <p className="text-slate-600 dark:text-gray-400">
                      Normal Range: <strong>{order.normal_min} – {order.normal_max} {order.unit || ''}</strong> (Server will automatically calculate Flag: Low / Normal / High)
                    </p>
                  ) : order.normal_text ? (
                    <p className="text-slate-600 dark:text-gray-400">
                      Reference Notes: <strong>{order.normal_text}</strong>
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">No reference ranges defined for this test.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                      Result Value <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={order.normal_min !== null ? "e.g. 95.5" : "e.g. Clear / Negative / Normal"}
                      value={resultValue}
                      onChange={(e) => setResultValue(e.target.value)}
                      className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Show Manual Flag selector only for non-numeric tests */}
                  {(order.normal_min === null || order.normal_max === null) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Manual Result Flag
                      </label>
                      <select
                        value={manualFlag}
                        onChange={(e) => setManualFlag(e.target.value)}
                        className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="normal">NORMAL</option>
                        <option value="abnormal">ABNORMAL</option>
                        <option value="low">LOW</option>
                        <option value="high">HIGH</option>
                        <option value="unknown">UNKNOWN</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Pathologist / Lab Result Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional findings or clinical remarks..."
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveResultMutation.mutate()}
                    disabled={saveResultMutation.isPending || !resultValue.trim()}
                    className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {saveResultMutation.isPending ? 'Saving...' : 'Save Result & Complete Order'}
                  </button>
                </div>
              </div>

              {/* Report Files Upload & Download */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Attached Report Files ({(order.files || []).length}/3)
                  </h4>
                  <span className="text-[11px] text-slate-400">PDF, JPG, PNG, WebP up to 5MB</span>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleFileUpload} className="flex items-center gap-3">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-gray-800 dark:file:text-gray-300 hover:file:bg-blue-100"
                  />
                  <button
                    type="submit"
                    disabled={uploadingFiles || selectedFiles.length === 0}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {uploadingFiles ? 'Uploading...' : 'Upload'}
                  </button>
                </form>

                {/* File List */}
                <div className="space-y-2">
                  {(order.files || []).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/40 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-white truncate">{file.original_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({(file.size_bytes / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file.id, file.original_name)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          <Download size={13} /> Download
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete File"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(order.files || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">
                      No report PDF or image files uploaded yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Billing Action Hook */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Receipt size={16} className="text-emerald-600" />
                    Billing Integration
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                    {order.invoice_item_id
                      ? '✅ Added to patient invoice'
                      : 'Add this lab test item to the patient pending invoice.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => invoiceMutation.mutate(order.id)}
                  disabled={invoiceMutation.isPending || !!order.invoice_item_id}
                  className={`py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                    order.invoice_item_id
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 opacity-80 cursor-default'
                      : 'btn-primary'
                  }`}
                >
                  <Receipt size={14} />
                  {order.invoice_item_id ? 'Added to Invoice' : invoiceMutation.isPending ? 'Adding...' : 'Add to Invoice'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Delete File Confirmation */}
      {fileToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setFileToDelete(null)}
          onConfirm={() => deleteFileMutation.mutate(fileToDelete.id)}
          isLoading={deleteFileMutation.isPending}
          title="Delete Report File?"
          message={`Are you sure you want to delete "${fileToDelete.original_name}"?`}
          intent="danger"
          confirmText="Delete File"
        />
      )}
    </div>
  );
}
