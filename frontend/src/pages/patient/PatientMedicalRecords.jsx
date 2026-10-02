import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthProfileService, medicalRecordService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  FileText,
  Activity,
  AlertTriangle,
  Heart,
  Phone,
  Edit,
  Search,
  Calendar,
  User,
  Clock,
  Download,
  File,
  X,
  Plus,
  Stethoscope,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PatientMedicalRecords = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  // Queries
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['health-profile-mine'],
    queryFn: () => healthProfileService.getMine().then((r) => r.data),
  });

  const { data: recordsData, isLoading: isRecordsLoading } = useQuery({
    queryKey: ['medical-records-mine', { page, search }],
    queryFn: () => medicalRecordService.getMyRecords({ page, limit: 10, search }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['medical-record-detail', selectedRecord?.id],
    queryFn: () => medicalRecordService.getById(selectedRecord.id).then((r) => r.data),
    enabled: !!selectedRecord?.id,
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: healthProfileService.updateMine,
    onSuccess: () => {
      toast.success('Health profile updated successfully');
      qc.invalidateQueries({ queryKey: ['health-profile-mine'] });
      setEditProfileOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update health profile');
    }
  });

  const openEditProfile = () => {
    if (profileData) {
      setProfileForm({
        bloodGroup: profileData.blood_group || '',
        allergies: profileData.allergies || '',
        chronicConditions: profileData.chronic_conditions || '',
        emergencyContactName: profileData.emergency_contact_name || '',
        emergencyContactPhone: profileData.emergency_contact_phone || ''
      });
    }
    setEditProfileOpen(true);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleDownloadFile = async (file) => {
    try {
      const res = await medicalRecordService.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: file.mime_type }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloading ${file.original_name}`);
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  const healthProfile = profileData || {};
  const records = recordsData?.data || [];
  const pagination = recordsData?.pagination || { total: 0, totalPages: 1 };
  const fullDetail = detailData || selectedRecord;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Page Title */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          My Medical Records & Health Profile
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Access your consultation history, diagnosis reports, prescriptions, and health parameters.
        </p>
      </div>

      {/* Top Card: Health Profile */}
      <div className={`card p-6 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Heart size={20} />
            </div>
            <div>
              <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Personal Health Profile
              </h2>
              <p className="text-xs text-slate-400">Emergency & vital information</p>
            </div>
          </div>

          <button
            onClick={openEditProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Edit size={14} /> Edit Profile
          </button>
        </div>

        {isProfileLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Blood Group
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  {healthProfile.blood_group || 'Not set'}
                </span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Allergies
              </span>
              <p className={`text-xs font-medium truncate ${healthProfile.allergies ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                {healthProfile.allergies || 'None reported'}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Chronic Conditions
              </span>
              <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {healthProfile.chronic_conditions || 'None reported'}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Emergency Contact
              </span>
              <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {healthProfile.emergency_contact_name || 'Not set'}
              </p>
              {healthProfile.emergency_contact_phone && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                  {healthProfile.emergency_contact_phone}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Consultation & Medical History
        </h2>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search diagnosis, symptoms..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Records Timeline / List */}
      {isRecordsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className={`card p-12 text-center rounded-2xl ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            No medical records found
          </h3>
          <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Medical records created by your treating doctors after consultations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setSelectedRecord(rec)}
              className={`card p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                isDark ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Stethoscope size={20} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                        {dayjs(rec.visit_date).format('MMM D, YYYY')}
                      </span>
                      <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {rec.diagnosis}
                      </h3>
                    </div>

                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className="font-semibold">Doctor:</span> Dr. {rec.doctor_name} {rec.department_name && `(${rec.department_name})`}
                    </p>

                    {rec.symptoms && (
                      <p className={`text-xs mt-1 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="font-medium">Symptoms:</span> {rec.symptoms}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    View Record <ChevronRight size={16} />
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
            Page {page} of {pagination.totalPages} ({pagination.total} total records)
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

      {/* Edit Health Profile Modal */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Edit Personal Health Profile</h3>
              <button onClick={() => setEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Blood Group</label>
                <select
                  value={profileForm.bloodGroup}
                  onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Dust, Peanuts"
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Chronic Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Asthma, Hypertension, Diabetes Type 2"
                  value={profileForm.chronicConditions}
                  onChange={(e) => setProfileForm({ ...profileForm, chronicConditions: e.target.value })}
                  className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="Contact person name"
                    value={profileForm.emergencyContactName}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                    className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Emergency Contact Phone</label>
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={profileForm.emergencyContactPhone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                    className={`input-field text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                  Visit Date: {dayjs(fullDetail.visit_date).format('MMMM D, YYYY')}
                </span>
                <h2 className="text-xl font-bold mt-2">{fullDetail.diagnosis}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Doctor: Dr. {fullDetail.doctor_name} {fullDetail.specialization && `(${fullDetail.specialization})`}
                </p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-5 pt-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Symptoms Description</h4>
                  <p className={`text-sm leading-relaxed p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    {fullDetail.symptoms || 'No detailed symptoms listed.'}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Doctor Notes & Instructions</h4>
                  <p className={`text-sm leading-relaxed p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    {fullDetail.doctor_notes || 'No notes provided by doctor.'}
                  </p>
                </div>

                {fullDetail.follow_up_date && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl">
                    <Calendar size={16} />
                    <span>Follow-up Date: {dayjs(fullDetail.follow_up_date).format('MMMM D, YYYY')}</span>
                  </div>
                )}

                {/* Prescription Quick Link */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-blue-50/60 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    <FileText size={16} />
                    <span>Digital Prescriptions & Dosage Info</span>
                  </div>
                  <a href="/patient/prescriptions" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    My Prescriptions →
                  </a>
                </div>

                {/* Attached Files */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Attached Reports & Files</h4>
                  {fullDetail.files && fullDetail.files.length > 0 ? (
                    <div className="space-y-2">
                      {fullDetail.files.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <File size={18} className="text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{file.original_name}</p>
                              <p className="text-[10px] text-slate-400">
                                {(file.size_bytes / 1024).toFixed(1)} KB • {file.mime_type}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 hover:bg-blue-200 transition-colors"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No files attached to this medical record.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientMedicalRecords;
