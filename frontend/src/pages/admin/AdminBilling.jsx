import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService, patientService, doctorService } from '../../services/services';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  failed: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export default function AdminBilling() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    status: 'success',
    transactionRef: '',
  });

  // Create invoice form state
  const [createForm, setCreateForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentId: '',
    discountAmount: 0,
    taxAmount: 0,
    dueDate: '',
    notes: '',
    items: [
      { itemType: 'consultation', description: 'Doctor Consultation Fee', quantity: 1, unitPrice: 500 },
    ],
  });

  // Fetch Patients & Doctors for dropdowns
  const { data: patientsData } = useQuery({
    queryKey: ['admin-patients-list'],
    queryFn: async () => {
      const res = await patientService.getAll({ limit: 100 });
      return res.data?.data || res.data?.patients || [];
    },
    enabled: isCreateOpen,
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['admin-doctors-list'],
    queryFn: async () => {
      const res = await doctorService.getAll({ limit: 100 });
      return res.data?.data || res.data?.doctors || [];
    },
    enabled: isCreateOpen,
  });

  // Fetch Stats & Invoices
  const { data: statsData } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const res = await invoiceService.getStats();
      return res.data?.data;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-invoices', statusFilter, search, fromDate, toDate, page],
    queryFn: async () => {
      const res = await invoiceService.getAll({
        status: statusFilter || undefined,
        search: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit: 10,
      });
      return res.data;
    },
  });

  // Fetch detail for modal
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['invoice-detail-admin', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const res = await invoiceService.getById(selectedInvoiceId);
      return res.data?.data;
    },
    enabled: !!selectedInvoiceId,
  });

  const isMissingTables = error?.response?.data?.message?.includes('missing');

  // Handle PDF Download
  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const res = await invoiceService.downloadPDF(invoiceId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded PDF successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to download PDF', { id: toastId });
    }
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    const toastId = toast.loading('Exporting CSV...');
    try {
      const res = await invoiceService.exportCSV({
        status: statusFilter || undefined,
        search: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoices-Export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to export CSV', { id: toastId });
    }
  };

  // Create Invoice Item manipulation
  const handleAddItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemType: 'other', description: '', quantity: 1, unitPrice: 0 },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setCreateForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Calculate live preview subtotal and total
  const itemsSubtotal = createForm.items.reduce(
    (acc, it) => acc + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0),
    0
  );
  const previewTotal = Math.max(
    0,
    itemsSubtotal - (parseFloat(createForm.discountAmount) || 0) + (parseFloat(createForm.taxAmount) || 0)
  );

  // Submit Create Invoice
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.patientId) return toast.error('Please select a patient');
    if (createForm.items.length === 0) return toast.error('At least one item is required');

    const toastId = toast.loading('Creating invoice...');
    try {
      await invoiceService.create({
        patientId: createForm.patientId,
        doctorId: createForm.doctorId || undefined,
        appointmentId: createForm.appointmentId || undefined,
        items: createForm.items,
        discountAmount: parseFloat(createForm.discountAmount) || 0,
        taxAmount: parseFloat(createForm.taxAmount) || 0,
        dueDate: createForm.dueDate || undefined,
        notes: createForm.notes,
      });

      toast.success('Invoice created successfully', { id: toastId });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice', { id: toastId });
    }
  };

  // Record Payment Submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    const toastId = toast.loading('Recording payment...');
    try {
      await invoiceService.addPayment(selectedInvoiceId, {
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        status: paymentForm.status,
        transactionRef: paymentForm.transactionRef,
      });

      toast.success('Payment recorded successfully', { id: toastId });
      setIsPaymentOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-detail-admin', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment', { id: toastId });
    }
  };

  // Cancel Invoice Submit
  const handleCancelInvoice = async () => {
    if (!selectedInvoiceId) return;
    const toastId = toast.loading('Cancelling invoice...');
    try {
      await invoiceService.cancel(selectedInvoiceId);
      toast.success('Invoice cancelled', { id: toastId });
      setIsCancelConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-detail-admin', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice', { id: toastId });
    }
  };

  const invoices = data?.data || [];
  const meta = data?.meta || { totalPages: 1, total: 0 };
  const summary = statsData?.summary || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="text-blue-600 dark:text-blue-400" />
            Billing & Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Manage patient invoices, payments, consultation billing, and financial reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet size={16} /> Export CSV
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
          >
            <Plus size={16} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Migration Warning Banner */}
      {isMissingTables && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Phase 8 Migration Required</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              The billing database tables have not been created yet. Please execute{' '}
              <code className="bg-amber-100 dark:bg-amber-800/50 px-1.5 py-0.5 rounded font-mono text-xs">
                node src/scripts/runMigrationPhase8.js
              </code>{' '}
              or run <code className="bg-amber-100 dark:bg-amber-800/50 px-1.5 py-0.5 rounded font-mono text-xs">database/migration_phase8_invoices_and_payments.sql</code> in pgAdmin.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
            ₹
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Total Billed</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              ₹{parseFloat(summary.total_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Paid / Collected</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              ₹{parseFloat(summary.paid_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Pending Balance</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              ₹{parseFloat(summary.pending_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Total Invoices</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              {summary.total_invoices || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search invoice, patient, doctor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-9 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            title="From Date"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            title="To Date"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto text-slate-300 dark:text-gray-700 mb-3" size={48} />
            <h3 className="font-semibold text-slate-700 dark:text-gray-300">No Invoices Found</h3>
            <p className="text-sm text-slate-400 mt-1">There are no invoices matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/50 text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice No.</th>
                  <th className="py-3.5 px-4 font-semibold">Patient</th>
                  <th className="py-3.5 px-4 font-semibold">Doctor</th>
                  <th className="py-3.5 px-4 font-semibold">Created Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Paid</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 dark:text-white font-medium">
                      {inv.patient_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                      {inv.doctor_name ? `Dr. ${inv.doctor_name}` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-gray-400">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-white">
                      ₹{parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      ₹{parseFloat(inv.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGES[inv.status] || STATUS_BADGES.pending}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          title="View / Manage Invoice"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-gray-400">
              Page {page} of {meta.totalPages} ({meta.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Plus className="text-blue-600" /> Create New Invoice
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Select Patient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.patientId}
                    onChange={(e) => setCreateForm({ ...createForm, patientId: e.target.value })}
                    className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">-- Choose Patient --</option>
                    {(patientsData || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.email || p.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Attending Doctor (Optional)
                  </label>
                  <select
                    value={createForm.doctorId}
                    onChange={(e) => setCreateForm({ ...createForm, doctorId: e.target.value })}
                    className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">-- None / Hospital Bill --</option>
                    {(doctorsData || []).map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.first_name} {d.last_name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table Form */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                    Invoice Line Items <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="space-y-3">
                  {createForm.items.map((item, index) => (
                    <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-200 dark:border-gray-800">
                      <select
                        value={item.itemType}
                        onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                        className="input-field text-xs py-1.5 w-32 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="medicine">Medicine</option>
                        <option value="lab">Lab Test</option>
                        <option value="other">Other</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Description..."
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="input-field text-xs py-1.5 flex-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        required
                      />

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="input-field text-xs py-1.5 w-16 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        required
                      />

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price ₹"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="input-field text-xs py-1.5 w-24 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        required
                      />

                      <span className="text-xs font-semibold text-slate-700 dark:text-gray-200 w-20 text-right">
                        ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                      </span>

                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtotal & Discount / Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.discountAmount}
                    onChange={(e) => setCreateForm({ ...createForm, discountAmount: e.target.value })}
                    className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Tax Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.taxAmount}
                    onChange={(e) => setCreateForm({ ...createForm, taxAmount: e.target.value })}
                    className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Total calculation preview */}
              <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-xl text-blue-600 dark:text-blue-400">
                  ₹{previewTotal.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Invoice Notes / Payment Instructions
                </label>
                <textarea
                  rows="2"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Optional notes for the patient..."
                  className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-5 text-xs">
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail / Admin Management Modal */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedInvoiceId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            {isDetailLoading || !detailData ? (
              <div className="py-12 text-center text-slate-400">Loading invoice detail...</div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      Invoice #{detailData.invoice_number}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Created on {new Date(detailData.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGES[detailData.status]}`}>
                    {detailData.status.toUpperCase()}
                  </span>
                </div>

                {/* Patient & Doctor details */}
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-gray-800/40 p-4 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Patient</p>
                    <p className="font-semibold text-slate-800 dark:text-white mt-1">{detailData.patient_name}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{detailData.patient_email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Attending Doctor</p>
                    <p className="font-semibold text-slate-800 dark:text-white mt-1">
                      {detailData.doctor_name ? `Dr. ${detailData.doctor_name}` : 'Hospital / General'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{detailData.doctor_specialization || 'N/A'}</p>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Line Items</h4>
                  <div className="border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-gray-800/60 text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                        {(detailData.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-gray-200">{item.description}</td>
                            <td className="py-2.5 px-3 capitalize text-slate-500">{item.item_type}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-gray-300">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-gray-300">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-white">₹{parseFloat(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary & Totals */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-gray-300 pt-2 border-t border-slate-200 dark:border-gray-800">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(detailData.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(detailData.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>- ₹{parseFloat(detailData.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(detailData.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>+ ₹{parseFloat(detailData.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-gray-800">
                    <span>Total Amount:</span>
                    <span>₹{parseFloat(detailData.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Paid Amount:</span>
                    <span>₹{parseFloat(detailData.paid_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold text-sm">
                    <span>Remaining Balance:</span>
                    <span>₹{parseFloat(detailData.balance || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payments History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Payments Received</h4>
                  {(detailData.payments || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
                  ) : (
                    <div className="border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-gray-800/60 text-slate-500">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">Ref</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {detailData.payments.map((p, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-300">
                                {new Date(p.paid_at || p.created_at).toLocaleDateString('en-IN')}
                              </td>
                              <td className="py-2 px-3 capitalize font-medium">{p.method}</td>
                              <td className="py-2 px-3 font-mono text-slate-400">{p.transaction_ref || '-'}</td>
                              <td className="py-2 px-3 capitalize">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-semibold">₹{parseFloat(p.amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {detailData.status !== 'paid' && detailData.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setPaymentForm({
                            amount: detailData.balance,
                            method: 'cash',
                            status: 'success',
                            transactionRef: '',
                          });
                          setIsPaymentOpen(true);
                        }}
                        className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                      >
                        <CreditCard size={14} /> Record Payment
                      </button>
                    )}

                    {detailData.status === 'pending' && (detailData.payments || []).length === 0 && (
                      <button
                        onClick={() => setIsCancelConfirmOpen(true)}
                        className="btn-secondary py-2 px-3 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                      >
                        Cancel Invoice
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDownloadPDF(detailData.id, detailData.invoice_number)}
                    className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Sub-Modal */}
      {isPaymentOpen && detailData && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsPaymentOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <CreditCard className="text-emerald-600" /> Record Payment
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="input-field text-xs py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentForm.status}
                  onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                  className="input-field text-xs py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="success">Success</option>
                  <option value="failed">Failed Attempt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={detailData.balance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="input-field text-xs py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Remaining balance: ₹{parseFloat(detailData.balance || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Transaction Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #987213 / Receipt No."
                  value={paymentForm.transactionRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                  className="input-field text-xs py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 px-4 text-xs">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Sub-Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-center">
            <AlertTriangle className="mx-auto text-amber-500" size={36} />
            <h3 className="font-bold text-slate-800 dark:text-white">Cancel Invoice?</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Are you sure you want to cancel Invoice #{detailData.invoice_number}? Cancelled invoices cannot receive payments.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className="btn-secondary py-1.5 px-4 text-xs"
              >
                No, Keep Invoice
              </button>
              <button
                onClick={handleCancelInvoice}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-4 rounded-xl text-xs transition-colors"
              >
                Yes, Cancel Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
