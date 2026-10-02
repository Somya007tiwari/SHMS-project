import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '../../services/services';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  failed: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export default function PatientBilling() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoices', statusFilter, page],
    queryFn: async () => {
      const res = await invoiceService.getMyInvoices({ status: statusFilter || undefined, page, limit: 10 });
      return res.data;
    },
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['invoice-detail', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const res = await invoiceService.getById(selectedInvoiceId);
      return res.data.data;
    },
    enabled: !!selectedInvoiceId,
  });

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    const toastId = toast.loading('Generating invoice PDF...');
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

  const invoices = data?.data || [];
  const meta = data?.meta || { totalPages: 1, total: 0 };
  const isMissingTables = error?.response?.data?.message?.includes('missing');

  // Summary calculations
  const totalPaid = invoices.reduce((acc, inv) => acc + (parseFloat(inv.paid_amount) || 0), 0);
  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="text-blue-600 dark:text-blue-400" />
            My Invoices & Payments
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            View your consultation bills, medical charges, and payment history.
          </p>
        </div>
      </div>

      {/* Missing Migration Banner */}
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

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
            ₹
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Total Amount Paid</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              ₹{totalPaid.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Pending Invoices</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              {pendingCount}
            </p>
          </div>
        </div>

        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Total Invoices</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
              {meta.total || invoices.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field py-1.5 px-3 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 dark:text-gray-700 mb-3" size={48} />
            <h3 className="font-semibold text-slate-700 dark:text-gray-300">No Invoices Found</h3>
            <p className="text-sm text-slate-400 mt-1">You do not have any invoices matching the criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/50 text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice No.</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Doctor</th>
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
                    <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-gray-200">
                      {inv.doctor_name ? `Dr. ${inv.doctor_name}` : 'General / Hospital'}
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
                          title="View Invoice Detail"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                          title="Download PDF Invoice"
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
              Page {page} of {meta.totalPages}
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

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedInvoiceId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            {isDetailLoading || !detailData ? (
              <div className="py-12 text-center text-slate-400">Loading invoice details...</div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      Invoice #{detailData.invoice_number}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Issued on {new Date(detailData.created_at).toLocaleDateString('en-IN')}
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Itemized Breakdown</h4>
                  <div className="border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-gray-800/60 text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
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

                {/* Calculation summary */}
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
                    <span>Balance Due:</span>
                    <span>₹{parseFloat(detailData.balance || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-gray-800">
                  <button
                    onClick={() => handleDownloadPDF(detailData.id, detailData.invoice_number)}
                    className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
