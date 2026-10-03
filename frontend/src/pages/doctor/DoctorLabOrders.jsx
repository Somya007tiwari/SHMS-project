import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService, doctorService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { useTheme } from '../../context/ThemeContext';
import {
  FileCheck,
  Search,
  Plus,
  AlertTriangle,
  Download,
  Info,
  CheckCircle2,
  Clock,
  User,
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
  low: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold border-amber-300 ring-2 ring-amber-400/50',
  high: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold border-rose-300 ring-2 ring-rose-500/50',
  abnormal: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold border-rose-300 ring-2 ring-rose-500/50',
  unknown: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

export default function DoctorLabOrders() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Order Detail Modal State
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // New Doctor Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Fetch Doctor Orders
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['doctor-lab-orders', page, search, statusFilter],
    queryFn: async () => {
      const res = await labService.getDoctorOrders({ page, limit: 10, search, status: statusFilter });
      return res.data;
    }
  });

  // Fetch Patients List for Doctor Order Modal
  const { data: patientsData } = useQuery({
    queryKey: ['doctor-my-patients-list'],
    queryFn: async () => {
      const res = await doctorService.getMyPatients({ limit: 100 });
      return res.data?.patients || [];
    },
    enabled: isOrderModalOpen
  });

  // Fetch Active Catalog Tests for Doctor Order Modal
  const { data: catalogData } = useQuery({
    queryKey: ['doctor-lab-catalog', catalogSearch],
    queryFn: async () => {
      const res = await labService.getTests({ limit: 100, search: catalogSearch, activeOnly: true });
      return res.data?.data || [];
    },
    enabled: isOrderModalOpen
  });

  // Fetch Order Detail for Modal
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['lab-order-detail-doctor', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await labService.getOrderById(selectedOrderId);
      return res.data?.data;
    },
    enabled: !!selectedOrderId
  });

  const order = detailData || null;

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      return labService.createDoctorOrders({
        patientId: selectedPatientId,
        testIds: selectedTestIds,
        notes: orderNotes
      });
    },
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Lab test order placed successfully');
      queryClient.invalidateQueries({ queryKey: ['doctor-lab-orders'] });
      setIsOrderModalOpen(false);
      setSelectedPatientId('');
      setSelectedTestIds([]);
      setOrderNotes('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to place lab order');
    }
  });

  const toggleTestSelection = (testId) => {
    if (selectedTestIds.includes(testId)) {
      setSelectedTestIds(selectedTestIds.filter(id => id !== testId));
    } else {
      if (selectedTestIds.length >= 10) {
        return toast.error('Maximum 10 lab tests per order');
      }
      setSelectedTestIds([...selectedTestIds, testId]);
    }
  };

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
          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
            {val}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            {dayjs(row.created_at).format('MMM D, YYYY')}
          </p>
        </div>
      )
    },
    {
      key: 'patient_name',
      label: 'Patient',
      render: (val, row) => (
        <div>
          <p className="font-bold text-sm text-slate-800 dark:text-white">{val}</p>
          <p className="text-xs text-slate-400">{row.patient_phone || ''}</p>
        </div>
      )
    },
    {
      key: 'test_name',
      label: 'Test Name & Category',
      render: (_, row) => (
        <div>
          <p className="font-bold text-xs text-slate-800 dark:text-white">{row.test_name}</p>
          <span className="text-[10px] text-slate-500">{row.test_category}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGES[val] || STATUS_BADGES.requested}`}>
          {val.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'result_flag',
      label: 'Result Findings',
      render: (_, row) => (
        row.status === 'completed' && row.result_value ? (
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded text-xs border ${FLAG_BADGES[row.result_flag] || FLAG_BADGES.normal}`}>
              {['high', 'low', 'abnormal'].includes(row.result_flag) && '⚠️ '}
              {(row.result_flag || 'NORMAL').toUpperCase()}
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-gray-200 font-bold">
              ({row.result_value} {row.unit || ''})
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Pending Results</span>
        )
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => setSelectedOrderId(row.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 text-xs font-semibold"
          title="View Results"
        >
          <Info size={15} /> Details
        </button>
      )
    }
  ];

  const patientsList = patientsData || [];
  const catalogList = catalogData || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileCheck className="text-blue-600 dark:text-blue-400" />
            My Patient Lab Orders & Results
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Order lab tests for your patients, track status, and review completed findings.
          </p>
        </div>

        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Order Lab Tests
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, order #..."
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
            emptyMessage="No lab orders found"
            emptyIcon={FileCheck}
          />
        )}
      </div>

      {/* New Doctor Order Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Order Lab Tests for Patient"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setIsOrderModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending || !selectedPatientId || selectedTestIds.length === 0}
              className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {createOrderMutation.isPending ? 'Placing Order...' : `Place Order (${selectedTestIds.length} Tests)`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Select Patient <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">-- Select Patient --</option>
              {patientsList.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.first_name} {pt.last_name} ({pt.phone || pt.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                Select Lab Tests <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Selected: {selectedTestIds.length} test(s)
              </span>
            </div>

            <input
              type="text"
              placeholder="Search catalog tests..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="input-field py-1 px-3 text-xs mb-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />

            <div className="border border-slate-200 dark:border-gray-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800 p-2">
              {catalogList.map((test) => {
                const isSelected = selectedTestIds.includes(test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTestSelection(test.id)}
                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 font-bold text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-50 dark:hover:bg-gray-800/50 text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    <div>
                      <span>{test.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({test.category})</span>
                    </div>
                    <span className="font-bold text-emerald-600">₹{parseFloat(test.price).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Clinical Notes / Doctor Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Reason for ordering tests or special patient instructions..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrderId(null)}
          title={order ? `Lab Order Details #${order.order_number}` : 'Loading...'}
          size="lg"
        >
          {isDetailLoading || !order ? (
            <div className="p-8 text-center text-slate-400">Loading order details...</div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{order.patient_name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_BADGES[order.status]}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-gray-400">Test: <strong>{order.test_name}</strong> ({order.test_category})</p>
                <p className="text-slate-500 dark:text-gray-400">Ordered: {dayjs(order.created_at).format('MMM D, YYYY · HH:mm')}</p>
              </div>

              {/* Result Summary */}
              {order.status === 'completed' && order.result_value ? (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  ['high', 'low', 'abnormal'].includes(order.result_flag)
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-gray-800/40 border-slate-200 dark:border-gray-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Findings:</span>
                    <span className="font-mono font-bold text-base">{order.result_value} {order.unit || ''}</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs border ${FLAG_BADGES[order.result_flag] || FLAG_BADGES.normal}`}>
                      {(order.result_flag || 'NORMAL').toUpperCase()}
                    </span>
                  </div>

                  {(order.normal_min !== null || order.normal_text) && (
                    <p className="text-slate-600 dark:text-gray-300">
                      Normal Range: {order.normal_min !== null ? `${order.normal_min} - ${order.normal_max} ${order.unit || ''}` : order.normal_text}
                    </p>
                  )}

                  {order.result_notes && (
                    <p className="text-slate-700 dark:text-gray-200 italic">
                      Pathologist Remarks: {order.result_notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/40 text-center text-xs text-slate-400">
                  ⏳ Test results are currently pending.
                </div>
              )}

              {/* Report Files */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                  Report Files ({(order.files || []).length}):
                </h4>
                {(order.files || []).map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/40 text-xs">
                    <span className="font-medium text-slate-800 dark:text-white truncate">{file.original_name}</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(file.id, file.original_name)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                ))}
                {(order.files || []).length === 0 && (
                  <p className="text-xs text-slate-400 italic">No report files attached yet.</p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
