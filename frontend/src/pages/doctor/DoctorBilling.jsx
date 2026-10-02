import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '../../services/services';
import { CreditCard, Eye, Download, ChevronLeft, ChevronRight, FileText, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  failed: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function DoctorBilling() {
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['doctor-invoices', page],
    queryFn: async () => {
      const res = await invoiceService.getDoctorInvoices({ page, limit: 10 });
      return res.data;
    },
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['invoice-detail-doc', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const res = await invoiceService.getById(selectedInvoiceId);
      return res.data?.data;
    },
    enabled: !!selectedInvoiceId,
  });

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
      toast.success('Downloaded PDF', { id: toastId });
    } catch {
      toast.error('Failed to download PDF', { id: toastId });
    }
  };

  const invoices = data?.data || [];
  const meta = data?.meta || { totalPages: 1, total: 0 };
  const isMissingTables = error?.response?.data?.message?.includes('missing');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <CreditCard className="text-blue-600 dark:text-blue-400" />
          Appointment Invoices (Read-Only)
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
          View consultation invoices and payment statuses generated for your appointments.
        </p>
      </div>

      {isMissingTables && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Phase 8 Migration Required</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Billing tables are missing. Please run <code className="font-mono text-xs">node src/scripts/runMigrationPhase8.js</code>.
            </p>
          </div>
        </div>
      )}

      <div className="card dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading appointment invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 dark:text-gray-700 mb-3" size={48} />
            <h3 className="font-semibold text-slate-700 dark:text-gray-300">No Invoices Found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/50 text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice No.</th>
                  <th className="py-3.5 px-4 font-semibold">Patient</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total</th>
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
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-white">
                      {inv.patient_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-gray-400">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-white">
                      ₹{parseFloat(inv.total_amount).toFixed(2)}
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
                          title="View Invoice"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
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

        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Page {page} of {meta.totalPages}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary py-1 px-3 text-xs disabled:opacity-50">
                <ChevronLeft size={14} /> Prev
              </button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-50">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setSelectedInvoiceId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            {isDetailLoading || !detailData ? (
              <div className="py-12 text-center text-slate-400">Loading invoice detail...</div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-3">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Invoice #{detailData.invoice_number}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGES[detailData.status]}`}>
                    {detailData.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-gray-300">
                  <p><span className="font-semibold">Patient:</span> {detailData.patient_name}</p>
                  <p><span className="font-semibold">Total Amount:</span> ₹{parseFloat(detailData.total_amount).toFixed(2)}</p>
                  <p><span className="font-semibold">Paid Amount:</span> ₹{parseFloat(detailData.paid_amount || 0).toFixed(2)}</p>
                </div>

                <div className="border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-gray-800 text-slate-500">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                      {(detailData.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{it.description}</td>
                          <td className="p-2 text-right">{it.quantity}</td>
                          <td className="p-2 text-right font-semibold">₹{parseFloat(it.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-3">
                  <button onClick={() => handleDownloadPDF(detailData.id, detailData.invoice_number)} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5">
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
