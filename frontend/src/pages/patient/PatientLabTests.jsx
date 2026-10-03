import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService } from '../../services/services';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';
import {
  TestTube,
  Search,
  Calendar,
  Clock,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
  FileCheck,
  Info,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const CATEGORIES = ['All', 'Hematology', 'Biochemistry', 'Endocrinology', 'Pathology', 'Radiology', 'Microbiology'];

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

export default function PatientLabTests() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders' | 'reports'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ordersPage, setOrdersPage] = useState(1);

  // Cart / Multi-select for booking
  const [selectedTests, setSelectedTests] = useState([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [bookingNotes, setBookingNotes] = useState('');

  // Cancel Order State
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Selected Order Detail View
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch Catalog Tests
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['patient-lab-catalog', search, selectedCategory],
    queryFn: async () => {
      const res = await labService.getTests({
        limit: 100,
        search,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        activeOnly: true
      });
      return res.data?.data || [];
    }
  });

  // Fetch My Orders
  const { data: ordersData, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['patient-lab-orders', ordersPage],
    queryFn: async () => {
      const res = await labService.getMyOrders({ page: ordersPage, limit: 10 });
      return res.data;
    }
  });

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      return labService.bookPatientOrders({
        testIds: selectedTests.map(t => t.id),
        scheduledDate,
        scheduledTime,
        notes: bookingNotes
      });
    },
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Lab tests booked successfully!');
      setSelectedTests([]);
      setIsBookingModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['patient-lab-orders'] });
      setActiveTab('orders');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to book lab tests');
    }
  });

  // Cancel Order Mutation
  const cancelMutation = useMutation({
    mutationFn: async (orderId) => labService.cancelOrder(orderId),
    onSuccess: () => {
      toast.success('Lab order cancelled');
      setOrderToCancel(null);
      refetchOrders();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel lab order');
      setOrderToCancel(null);
    }
  });

  const toggleSelectTest = (test) => {
    if (selectedTests.some(t => t.id === test.id)) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      if (selectedTests.length >= 10) {
        return toast.error('Maximum 10 lab tests can be booked per request');
      }
      setSelectedTests([...selectedTests, test]);
    }
  };

  const totalPrice = selectedTests.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);

  // Download PDF / Image file safely
  const handleDownloadFile = async (fileId, fileName) => {
    const toastId = toast.loading('Downloading report...');
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
      toast.success('Report downloaded', { id: toastId });
    } catch (err) {
      toast.error('Failed to download report', { id: toastId });
    }
  };

  const testsList = catalogData || [];
  const ordersList = ordersData?.data || [];
  const completedReports = ordersList.filter(o => o.status === 'completed');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TestTube className="text-blue-600 dark:text-blue-400" />
            Diagnostic Lab Tests & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Browse tests, book sample collection appointments, and access digital lab reports.
          </p>
        </div>

        {selectedTests.length > 0 && activeTab === 'catalog' && (
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center gap-2 shadow-lg animate-bounce self-start sm:self-auto"
          >
            <Calendar size={16} /> Book Selected ({selectedTests.length}) · ₹{totalPrice.toFixed(2)}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <TestTube size={16} />
          Browse Catalog & Book
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <FileCheck size={16} />
          My Lab Orders ({ordersData?.pagination?.total || 0})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Download size={16} />
          Lab Reports ({completedReports.length})
        </button>
      </div>

      {/* TAB 1: CATALOG & BOOKING */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Category Chips & Search */}
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search test name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          {isCatalogLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 skeleton rounded-2xl" />
              ))}
            </div>
          ) : testsList.length === 0 ? (
            <EmptyState
              icon={TestTube}
              title="No lab tests found"
              message="Try searching for a different test name or category."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testsList.map((test) => {
                const isSelected = selectedTests.some(t => t.id === test.id);

                return (
                  <div
                    key={test.id}
                    onClick={() => toggleSelectTest(test)}
                    className={`card p-5 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-2 border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
                        : isDark
                        ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          {test.category}
                        </span>
                        <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                          ₹{parseFloat(test.price || 0).toFixed(2)}
                        </span>
                      </div>

                      <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {test.name}
                      </h3>

                      {test.description && (
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {test.description}
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-800 space-y-1 text-xs text-slate-500 dark:text-gray-400">
                        {test.sample_type && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 dark:text-gray-300">Sample:</span> {test.sample_type}
                          </div>
                        )}
                        {test.turnaround_hours && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} /> Results in approx {test.turnaround_hours} hours
                          </div>
                        )}
                        {test.preparation_instructions && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl mt-2">
                            💡 <strong>Prep:</strong> {test.preparation_instructions}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {isSelected ? '✓ Selected for Booking' : 'Click to Select'}
                      </span>
                      <button
                        type="button"
                        className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'btn-secondary'
                        }`}
                      >
                        {isSelected ? 'Selected' : '+ Select Test'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY LAB ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {isOrdersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 skeleton rounded-2xl" />
              ))}
            </div>
          ) : ordersList.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="No lab orders yet"
              message="When your doctor places a test order or you book a lab test, your orders will appear here."
            />
          ) : (
            <div className="space-y-3">
              {ordersList.map((order) => (
                <div
                  key={order.id}
                  className={`card p-5 rounded-2xl border transition-all ${
                    isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-md">
                          {order.order_number}
                        </span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGES[order.status]}`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">
                          Ordered {dayjs(order.created_at).format('MMM D, YYYY')}
                        </span>
                      </div>

                      <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {order.test_name} — <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{parseFloat(order.test_price || 0).toFixed(2)}</span>
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {order.doctor_name ? `Ordered by Dr. ${order.doctor_name}` : 'Self-Booked Lab Appointment'}
                        {order.scheduled_date && ` · Scheduled for ${dayjs(order.scheduled_date).format('MMM D, YYYY')} at ${order.scheduled_time}`}
                      </p>

                      {/* Display Completed Results */}
                      {order.status === 'completed' && order.result_value && (
                        <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-800 space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-gray-200">Test Result:</span>
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {order.result_value} {order.unit || ''}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs border ${FLAG_BADGES[order.result_flag] || FLAG_BADGES.normal}`}>
                              {(order.result_flag || 'NORMAL').toUpperCase()}
                            </span>
                          </div>

                          {(order.normal_min !== null || order.normal_text) && (
                            <p className="text-slate-500 dark:text-gray-400">
                              Reference Range: {order.normal_min !== null ? `${order.normal_min} - ${order.normal_max} ${order.unit || ''}` : order.normal_text}
                            </p>
                          )}

                          {order.result_notes && (
                            <p className="text-slate-600 dark:text-gray-300 italic">
                              Notes: {order.result_notes}
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg mt-2">
                            <Info size={13} className="flex-shrink-0" />
                            <span>Reference ranges are indicative. Please consult your doctor to interpret results.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      {['requested', 'scheduled'].includes(order.status) && (
                        <button
                          type="button"
                          onClick={() => setOrderToCancel(order)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LAB REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {completedReports.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No completed lab reports"
              message="Your official PDF and image lab reports will appear here once your test results are processed."
            />
          ) : (
            <div className="space-y-3">
              {completedReports.map((order) => (
                <div
                  key={order.id}
                  className={`card p-5 rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-md">
                          {order.order_number}
                        </span>
                        <span className="text-xs text-slate-400">
                          {dayjs(order.created_at).format('MMM D, YYYY')}
                        </span>
                      </div>

                      <h3 className={`font-bold text-base mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {order.test_name} Report
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        Result: <strong>{order.result_value} {order.unit || ''}</strong> ({order.result_flag?.toUpperCase() || 'NORMAL'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5"
                      >
                        <Info size={14} /> View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Drawer / Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Schedule Lab Test Appointment"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setIsBookingModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending || selectedTests.length === 0}
              className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Calendar size={14} />
              {bookMutation.isPending ? 'Booking...' : `Confirm & Book (${selectedTests.length} Tests)`}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
              Selected Lab Tests ({selectedTests.length}):
            </h4>
            <div className="space-y-1">
              {selectedTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-white">{t.name} ({t.category})</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{parseFloat(t.price || 0).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectTest(t)}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-gray-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
              <span>Total Price:</span>
              <span className="text-emerald-600 dark:text-emerald-400">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Preferred Sample Collection Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={dayjs().format('YYYY-MM-DD')}
                max={dayjs().add(60, 'day').format('YYYY-MM-DD')}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Preferred Time (Working Hours 07:00 - 19:00) <span className="text-rose-500">*</span>
              </label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((t) => (
                  <option key={t} value={t}>{t} AM/PM</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Notes or Special Instructions (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Home collection request or fasting details..."
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Confirm Cancel Order Dialog */}
      {orderToCancel && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setOrderToCancel(null)}
          onConfirm={() => cancelMutation.mutate(orderToCancel.id)}
          isLoading={cancelMutation.isPending}
          title="Cancel Lab Order?"
          message={`Are you sure you want to cancel order #${orderToCancel.order_number} (${orderToCancel.test_name})?`}
          intent="danger"
          confirmText="Cancel Order"
        />
      )}
    </div>
  );
}
