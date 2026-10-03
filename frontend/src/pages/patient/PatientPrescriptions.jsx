import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { prescriptionService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  FileText,
  Search,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  Stethoscope,
  X,
  Clock,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import SharePrescriptionModal from '../../components/prescriptions/SharePrescriptionModal';

const PatientPrescriptions = () => {
  const { isDark } = useTheme();

  const [page, setPage] = useState(1);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [shareModalPrescription, setShareModalPrescription] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patient-prescriptions', page],
    queryFn: () => prescriptionService.getMyPrescriptions({ page, limit: 10 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['prescription-detail', selectedPrescription?.id],
    queryFn: () => prescriptionService.getById(selectedPrescription.id).then((r) => r.data),
    enabled: !!selectedPrescription?.id,
  });

  const handleDownloadPDF = async (prescId, prescNo) => {
    try {
      const res = await prescriptionService.downloadPDF(prescId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescNo || prescId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloading Prescription PDF');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const prescriptions = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const fullDetail = detailData || selectedPrescription;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Header */}
      <div className="print:hidden">
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          My Prescriptions
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          View medication instructions, doctor advice, and download official PDF prescriptions.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3 print:hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <div className={`card p-12 text-center rounded-2xl print:hidden ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            No prescriptions found
          </h3>
          <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            When your doctor issues a prescription after your consultation, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 print:hidden">
          {prescriptions.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPrescription(p)}
              className={`card p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                isDark ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-md">
                        {p.prescription_number}
                      </span>
                      <span className="text-xs text-slate-400">
                        {dayjs(p.created_at).format('MMM D, YYYY')}
                      </span>
                    </div>

                    <h3 className={`font-bold text-base mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {p.diagnosis}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Prescribed by Dr. {p.doctor_name} {p.specialization && `(${p.specialization})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShareModalPrescription(p); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                  >
                    <Share2 size={14} /> Share
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadPDF(p.id, p.prescription_number); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition-colors"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    View <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 print:hidden">
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Page {page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm print:static print:p-0 print:bg-white">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'} print:shadow-none print:border-none print:max-h-none print:overflow-visible`}>
            {/* Action Buttons */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-md">
                {selectedPrescription.prescription_number}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedPrescription.id, selectedPrescription.prescription_number)}
                  className="btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => setSelectedPrescription(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Prescription Content */}
            {isDetailLoading ? (
              <div className="py-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="pt-4 space-y-6">
                {/* Header */}
                <div className="border-b-2 border-blue-600 pb-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-black text-blue-900 dark:text-blue-400 print:text-black">
                      SMART HOSPITAL MANAGEMENT SYSTEM
                    </h1>
                    <p className="text-xs text-slate-500 print:text-gray-600">Healthcare Excellence & Digital Care</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600 print:text-black">{fullDetail.prescription_number}</p>
                    <p className="text-xs text-slate-400 print:text-gray-600">Date: {dayjs(fullDetail.created_at).format('MMM D, YYYY')}</p>
                  </div>
                </div>

                {/* Doctor & Patient Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 print:bg-gray-50 text-xs">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black">Dr. {fullDetail.doctor_name}</p>
                    <p className="text-slate-600 dark:text-slate-300 print:text-gray-700">{fullDetail.specialization || 'General Practice'} • {fullDetail.qualification || 'MBBS'}</p>
                    <p className="text-slate-500 dark:text-slate-400 print:text-gray-600">Room: {fullDetail.room_number || 'Room 101'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black">Patient: {fullDetail.patient_name}</p>
                    <p className="text-slate-600 dark:text-slate-300 print:text-gray-700">Gender: {(fullDetail.gender || 'N/A').toUpperCase()} | Blood Group: {fullDetail.blood_group || 'N/A'}</p>
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Diagnosis:</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 print:text-black">{fullDetail.diagnosis}</p>
                </div>

                {/* Medicines Table */}
                <div>
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 print:text-black">Rx Prescribed Medicines</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 print:bg-gray-100">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Medicine Name</th>
                          <th className="py-2.5 px-3">Dosage</th>
                          <th className="py-2.5 px-3">Frequency</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Timing</th>
                          <th className="py-2.5 px-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(fullDetail.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-medium text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">{item.medicine_name}</td>
                            <td className="py-2.5 px-3">{item.dosage}</td>
                            <td className="py-2.5 px-3">{item.frequency}</td>
                            <td className="py-2.5 px-3">{item.duration_days} days</td>
                            <td className="py-2.5 px-3">{item.timing || 'After food'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{item.instructions || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Advice & Follow Up */}
                {fullDetail.advice && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Doctor Advice:</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 print:text-black leading-relaxed">{fullDetail.advice}</p>
                  </div>
                )}

                {fullDetail.follow_up_date && (
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 print:text-black">
                    Follow-up Visit Date: {dayjs(fullDetail.follow_up_date).format('MMMM D, YYYY')}
                  </p>
                )}

                {/* Footer Notice */}
                <div className="pt-4 border-t text-center text-[10px] text-slate-400 print:text-gray-500">
                  This prescription is computer generated. Take medicines only as advised by your doctor.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <SharePrescriptionModal
        isOpen={!!shareModalPrescription}
        onClose={() => setShareModalPrescription(null)}
        prescription={shareModalPrescription}
      />
    </div>
  );
};

export default PatientPrescriptions;
