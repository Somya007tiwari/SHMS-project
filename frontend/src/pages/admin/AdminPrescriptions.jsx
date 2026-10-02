import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { prescriptionService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import DataTable from '../../components/ui/DataTable';
import {
  FileText,
  Search,
  Calendar,
  Eye,
  Download,
  Printer,
  X,
  Stethoscope,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const AdminPrescriptions = () => {
  const { isDark } = useTheme();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-prescriptions', { page, search }],
    queryFn: () => prescriptionService.getAll({ page, limit: 10, search }).then((r) => r.data),
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

  const prescriptions = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const fullDetail = detailData || selectedPrescription;

  const columns = [
    {
      key: 'prescription_number',
      title: 'Rx Number',
      render: (val) => (
        <span className="font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
          {val || 'RX-2026'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Issued Date',
      render: (val) => <span className="text-xs">{dayjs(val).format('MMM D, YYYY')}</span>
    },
    {
      key: 'patient_name',
      title: 'Patient',
      render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val || 'Patient'}</span>
    },
    {
      key: 'doctor_name',
      title: 'Prescribing Doctor',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">Dr. {val}</p>
          <p className="text-[10px] text-slate-400">{row.specialization}</p>
        </div>
      )
    },
    {
      key: 'diagnosis',
      title: 'Diagnosis',
      render: (val) => <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
    },
    {
      key: 'item_count',
      title: 'Items',
      render: (val) => <span className="text-xs font-semibold">{val || 0} medicines</span>
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedPrescription(row)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleDownloadPDF(row.id, row.prescription_number)}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            title="Download PDF"
          >
            <Download size={15} />
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
            System Prescriptions Registry
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Audit and view all digital prescriptions generated across hospital departments.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, doctor, diagnosis, Rx #..."
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
          data={prescriptions}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          emptyMessage="No prescriptions found"
          emptyIcon={FileText}
        />
      </div>

      {/* Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-md">
                {selectedPrescription.prescription_number}
              </span>

              <div className="flex items-center gap-2">
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

            {isDetailLoading ? (
              <div className="py-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="pt-4 space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Dr. {fullDetail.doctor_name}</p>
                    <p className="text-slate-500">{fullDetail.specialization || 'General Practice'} • {fullDetail.qualification || 'MBBS'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Patient: {fullDetail.patient_name}</p>
                    <p className="text-slate-500">Gender: {(fullDetail.gender || 'N/A').toUpperCase()} | Blood Group: {fullDetail.blood_group || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Diagnosis:</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fullDetail.diagnosis}</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">Rx Prescribed Medicines</h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
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
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{item.medicine_name}</td>
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

                {fullDetail.advice && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Doctor Advice:</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{fullDetail.advice}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptions;
