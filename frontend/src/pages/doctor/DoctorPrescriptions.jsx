import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prescriptionService, doctorService, healthProfileService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Search,
  Calendar,
  User,
  Download,
  Printer,
  AlertTriangle,
  X,
  ChevronRight,
  Clock,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const COMMON_FREQUENCIES = [
  '1-0-1 (Twice a day)',
  '1-1-1 (Three times a day)',
  '1-0-0 (Once daily - Morning)',
  '0-0-1 (Once daily - Night)',
  '1-0-1-0 (Four times a day)',
  'As needed (PRN)'
];

const TIMING_OPTIONS = [
  'After food',
  'Before food',
  'With food',
  'Empty stomach',
  'Any time'
];

const DoctorPrescriptions = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [activeView, setActiveView] = useState('list'); // 'list' | 'add' | 'edit' | 'detail'
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [medicineItems, setMedicineItems] = useState([
    { medicineName: '', dosage: '500 mg', frequency: '1-0-1 (Twice a day)', durationDays: 5, timing: 'After food', instructions: '' }
  ]);

  // Autocomplete Suggestions
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Queries
  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['doctor-prescriptions', { page, search }],
    queryFn: () => prescriptionService.getDoctorPrescriptions({ page, limit: 10, search }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: myPatientsData } = useQuery({
    queryKey: ['doctor-my-patients'],
    queryFn: () => doctorService.getMyPatients({ limit: 100 }).then((r) => r.data),
  });

  const { data: patientHealthProfile } = useQuery({
    queryKey: ['patient-health-profile', selectedPatientId],
    queryFn: () => healthProfileService.getByPatient(selectedPatientId).then((r) => r.data),
    enabled: !!selectedPatientId,
  });

  const { data: detailData, refetch: refetchDetail } = useQuery({
    queryKey: ['prescription-detail', selectedPrescription?.id],
    queryFn: () => prescriptionService.getById(selectedPrescription.id).then((r) => r.data),
    enabled: !!selectedPrescription?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => prescriptionService.create(data),
    onSuccess: (res) => {
      const warnings = res.data?.warnings || [];
      if (warnings.length > 0) {
        warnings.forEach((w) => toast((t) => (
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
            <span className="text-xs">{w}</span>
          </div>
        ), { duration: 6000 }));
      }
      toast.success('Prescription created successfully');
      qc.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
      resetForm();
      setActiveView('list');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create prescription');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => prescriptionService.update(id, data),
    onSuccess: (res) => {
      const warnings = res.data?.warnings || [];
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warn(w));
      }
      toast.success('Prescription updated successfully');
      qc.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
      qc.invalidateQueries({ queryKey: ['prescription-detail', selectedPrescription?.id] });
      resetForm();
      setActiveView('list');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update prescription');
    }
  });

  const resetForm = () => {
    setSelectedPatientId('');
    setDiagnosis('');
    setAdvice('');
    setFollowUpDate('');
    setMedicineItems([
      { medicineName: '', dosage: '500 mg', frequency: '1-0-1 (Twice a day)', durationDays: 5, timing: 'After food', instructions: '' }
    ]);
    setSelectedPrescription(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setActiveView('add');
  };

  const handleStartEdit = (prescription) => {
    setSelectedPrescription(prescription);
    setSelectedPatientId(prescription.patient_id);
    setDiagnosis(prescription.diagnosis || '');
    setAdvice(prescription.advice || '');
    setFollowUpDate(prescription.follow_up_date ? dayjs(prescription.follow_up_date).format('YYYY-MM-DD') : '');

    const items = (prescription.items || []).map((i) => ({
      medicineName: i.medicine_name,
      dosage: i.dosage,
      frequency: i.frequency,
      durationDays: i.duration_days,
      timing: i.timing || 'After food',
      instructions: i.instructions || ''
    }));

    setMedicineItems(items.length > 0 ? items : [
      { medicineName: '', dosage: '500 mg', frequency: '1-0-1 (Twice a day)', durationDays: 5, timing: 'After food', instructions: '' }
    ]);
    setActiveView('edit');
  };

  // Medicine Item Row Management
  const handleItemChange = (idx, field, value) => {
    const updated = [...medicineItems];
    updated[idx][field] = value;
    setMedicineItems(updated);

    if (field === 'medicineName' && value.trim().length >= 2) {
      setActiveSuggestionIdx(idx);
      prescriptionService.getMedicineSuggestions(value).then((res) => {
        setSuggestions(res.data?.data || []);
      }).catch(() => setSuggestions([]));
    } else if (field === 'medicineName') {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (idx, name) => {
    const updated = [...medicineItems];
    updated[idx].medicineName = name;
    setMedicineItems(updated);
    setSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const addMedicineRow = () => {
    if (medicineItems.length >= 20) {
      return toast.error('Maximum 20 items per prescription allowed');
    }
    setMedicineItems([
      ...medicineItems,
      { medicineName: '', dosage: '500 mg', frequency: '1-0-1 (Twice a day)', durationDays: 5, timing: 'After food', instructions: '' }
    ]);
  };

  const removeMedicineRow = (idx) => {
    if (medicineItems.length <= 1) {
      return toast.error('Prescription must have at least 1 medicine item');
    }
    setMedicineItems(medicineItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeView === 'add' && !selectedPatientId) {
      return toast.error('Please select a patient');
    }
    if (!diagnosis.trim()) {
      return toast.error('Diagnosis is required');
    }

    const payload = {
      patientId: selectedPatientId,
      diagnosis: diagnosis.trim(),
      advice: advice.trim(),
      followUpDate: followUpDate || null,
      items: medicineItems
    };

    if (activeView === 'add') {
      createMutation.mutate(payload);
    } else if (activeView === 'edit' && selectedPrescription) {
      updateMutation.mutate({ id: selectedPrescription.id, data: payload });
    }
  };

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
      toast.error('Failed to download prescription PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const prescriptions = listData?.data || [];
  const pagination = listData?.pagination || { total: 0, totalPages: 1 };
  const patientsList = myPatientsData?.patients || [];
  const fullDetail = detailData || selectedPrescription;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Top Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Prescription Management
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Issue digital prescriptions with automated allergy warnings, auto-suggestions, and 24-hour edit windows.
          </p>
        </div>

        {activeView === 'list' && (
          <button
            onClick={handleStartAdd}
            className="btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={18} /> New Prescription
          </button>
        )}

        {activeView !== 'list' && (
          <button
            onClick={() => { resetForm(); setActiveView('list'); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-auto"
          >
            ← Back to Prescriptions List
          </button>
        )}
      </div>

      {/* VIEW: LIST */}
      {activeView === 'list' && (
        <div className="space-y-4 print:hidden">
          {/* Search Bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search prescription #, patient, diagnosis, medicine..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          {isListLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 skeleton rounded-2xl" />
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <div className={`card p-12 text-center rounded-2xl ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
              <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                No prescriptions found
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Issued prescriptions will be listed here with options to download PDFs or edit within 24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p) => (
                <div
                  key={p.id}
                  onClick={() => { setSelectedPrescription(p); setActiveView('detail'); }}
                  className={`card p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-md">
                          {p.prescription_number}
                        </span>
                        <span className="text-xs text-slate-400">
                          {dayjs(p.created_at).format('MMM D, YYYY')}
                        </span>
                      </div>

                      <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {p.patient_name} — <span className="font-normal text-slate-500">{p.diagnosis}</span>
                      </h3>

                      <p className="text-xs text-slate-400">
                        {p.item_count || 0} medicine item(s) prescribed
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(p.id, p.prescription_number); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition-colors"
                      >
                        <Download size={14} /> PDF
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
            <div className="flex items-center justify-between pt-4">
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
        </div>
      )}

      {/* VIEW: ADD OR EDIT FORM */}
      {(activeView === 'add' || activeView === 'edit') && (
        <div className={`card p-6 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeView === 'add' ? 'Create New Prescription' : `Edit Prescription ${selectedPrescription?.prescription_number}`}
            </h2>

            {/* Select Patient & Allergy Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Select Patient *</label>
                <select
                  disabled={activeView === 'edit'}
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                >
                  <option value="">-- Choose Patient --</option>
                  {patientsList.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.first_name} {pt.last_name} ({pt.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="Primary diagnosis (e.g. Acute Pharyngitis)"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>
            </div>

            {/* Allergy Warning Alert Banner (Read-only for selected patient) */}
            {selectedPatientId && patientHealthProfile && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                patientHealthProfile.allergies
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Patient Health & Allergy Profile</p>
                  <p><span className="font-semibold">Blood Group:</span> {patientHealthProfile.blood_group || 'N/A'}</p>
                  <p><span className="font-semibold">Recorded Allergies:</span> {patientHealthProfile.allergies || 'None reported'}</p>
                </div>
              </div>
            )}

            {/* Dynamic Medicine Rows */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Prescribed Medicines ({medicineItems.length})
                </h3>
                <button
                  type="button"
                  onClick={addMedicineRow}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Medicine Row
                </button>
              </div>

              {medicineItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border relative space-y-3 ${
                    isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Medicine #{idx + 1}
                    </span>
                    {medicineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicineRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove medicine"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Medicine Name with Suggestions */}
                    <div className="relative">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Medicine Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paracetamol 500mg"
                        value={item.medicineName}
                        onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                        className={`input-field text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                      />
                      {activeSuggestionIdx === idx && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                          {suggestions.map((s) => (
                            <div
                              key={s}
                              onClick={() => selectSuggestion(idx, s)}
                              className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dosage *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500 mg / 1 tablet"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                        className={`input-field text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Frequency *</label>
                      <select
                        value={item.frequency}
                        onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                        className={`input-field text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                      >
                        {COMMON_FREQUENCIES.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Duration Days */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Duration (Days) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.durationDays}
                        onChange={(e) => handleItemChange(idx, 'durationDays', e.target.value)}
                        className={`input-field text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                      />
                    </div>

                    {/* Timing */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Timing</label>
                      <select
                        value={item.timing}
                        onChange={(e) => handleItemChange(idx, 'timing', e.target.value)}
                        className={`input-field text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                      >
                        {TIMING_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Special Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Take with warm water"
                        value={item.instructions}
                        onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                        className={`input-field text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Advice & Follow Up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Doctor Advice / Dietary Restrictions</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Avoid cold drinks, rest for 3 days, drink plenty of water"
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Follow-up Visit Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { resetForm(); setActiveView('list'); }}
                className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary px-6 py-2.5 text-xs font-semibold"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : activeView === 'add' ? 'Issue Prescription' : 'Update Prescription'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: DETAIL & PRINT PREVIEW */}
      {activeView === 'detail' && fullDetail && (
        <div className="space-y-4">
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-md">
                {fullDetail.prescription_number}
              </span>
              {fullDetail.isEditable && (
                <button
                  onClick={() => handleStartEdit(fullDetail)}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  <Edit size={14} /> Edit (Window Open: {fullDetail.editWindowRemainingHours}h left)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <Printer size={14} /> Print
              </button>
              <button
                onClick={() => handleDownloadPDF(fullDetail.id, fullDetail.prescription_number)}
                className="btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>

          {/* Printable Prescription Template */}
          <div className={`card p-8 rounded-2xl border shadow-md ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'} print:shadow-none print:border-none print:bg-white print:text-black`}>
            {/* Header */}
            <div className="border-b-2 border-blue-600 pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-blue-900 dark:text-blue-400 print:text-black">
                  SMART HOSPITAL MANAGEMENT SYSTEM
                </h1>
                <p className="text-xs text-slate-500 print:text-gray-600">Healthcare Excellence & Digital Prescriptions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-600 print:text-black">{fullDetail.prescription_number}</p>
                <p className="text-xs text-slate-400 print:text-gray-600">Date: {dayjs(fullDetail.created_at).format('MMM D, YYYY')}</p>
              </div>
            </div>

            {/* Doctor & Patient Info Grid */}
            <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 print:bg-gray-50 text-xs">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black">Dr. {fullDetail.doctor_name}</p>
                <p className="text-slate-600 dark:text-slate-300 print:text-gray-700">{fullDetail.specialization || 'General Practice'} • {fullDetail.qualification || 'MBBS'}</p>
                <p className="text-slate-500 dark:text-slate-400 print:text-gray-600">Reg. No: {fullDetail.registration_number || 'N/A'} | Room: {fullDetail.room_number || 'Room 101'}</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black">Patient: {fullDetail.patient_name}</p>
                <p className="text-slate-600 dark:text-slate-300 print:text-gray-700">Gender: {(fullDetail.gender || 'N/A').toUpperCase()} | Blood Group: {fullDetail.blood_group || 'N/A'}</p>
                <p className="text-slate-500 dark:text-slate-400 print:text-gray-600">Phone: {fullDetail.patient_phone || 'N/A'}</p>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Diagnosis:</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 print:text-black">{fullDetail.diagnosis}</p>
            </div>

            {/* Medicines Table */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 print:text-black">Rx Prescribed Medicines</h3>
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

            {/* Advice & Follow up */}
            {fullDetail.advice && (
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Doctor Advice:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 print:text-black leading-relaxed">{fullDetail.advice}</p>
              </div>
            )}

            {fullDetail.follow_up_date && (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 print:text-black mb-8">
                Follow-up Visit Date: {dayjs(fullDetail.follow_up_date).format('MMMM D, YYYY')}
              </p>
            )}

            {/* Signature Block */}
            <div className="flex justify-end pt-12">
              <div className="text-center w-48 border-t border-slate-300 dark:border-slate-700 pt-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">Dr. {fullDetail.doctor_name}</p>
                <p className="text-[10px] text-slate-400 print:text-gray-500">Authorized Signature & Stamp</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-4 border-t text-center text-[10px] text-slate-400 print:text-gray-500">
              This prescription is computer generated. Take medicines only as advised by your doctor.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptions;
