import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService } from "../../services/services";
import { useTheme } from "../../context/ThemeContext";
import {
  Users,
  UserPlus,
  Edit2,
  UserMinus,
  AlertCircle,
  CheckCircle2,
  X,
  Heart,
  ShieldAlert,
  UserCheck,
  Calendar,
  Activity,
  Phone,
} from "lucide-react";
import dayjs from "dayjs";

const RELATIONS = [
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "spouse", label: "Spouse" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Other" },
];

const PatientFamily = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    relation: "child",
    dateOfBirth: "",
    gender: "male",
    bloodGroup: "",
    allergies: "",
  });

  const { data: dependentsRes, isLoading, error } = useQuery({
    queryKey: ["family-dependents"],
    queryFn: () => familyService.getDependents().then((r) => r.data),
  });

  const dependents = dependentsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => familyService.createDependent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-dependents"] });
      setSuccessMsg("Family member added successfully.");
      closeModal();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed to add family member.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => familyService.updateDependent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-dependents"] });
      setSuccessMsg("Family member updated successfully.");
      closeModal();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed to update family member.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => familyService.deactivateDependent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-dependents"] });
      setSuccessMsg("Family member profile deactivated.");
      setDeactivateConfirm(null);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed to deactivate family member.");
    },
  });

  const openAddModal = () => {
    setEditingDependent(null);
    setFormData({
      firstName: "",
      lastName: "",
      relation: "child",
      dateOfBirth: "",
      gender: "male",
      bloodGroup: "",
      allergies: "",
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (dep) => {
    setEditingDependent(dep);
    setFormData({
      firstName: dep.first_name || "",
      lastName: dep.last_name || "",
      relation: dep.relation || "other",
      dateOfBirth: dep.date_of_birth ? dayjs(dep.date_of_birth).format("YYYY-MM-DD") : "",
      gender: dep.gender || "male",
      bloodGroup: dep.blood_group || "",
      allergies: dep.allergies || "",
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDependent(null);
    setErrorMsg("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMsg("First name and last name are required.");
      return;
    }
    if (!formData.dateOfBirth) {
      setErrorMsg("Date of birth is required.");
      return;
    }

    if (editingDependent) {
      updateMutation.mutate({
        id: editingDependent.dependent_patient_id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSwitchProfile = (dep) => {
    if (dep) {
      sessionStorage.setItem("actingPatientId", dep.dependent_patient_id);
      sessionStorage.setItem("actingPatientName", `${dep.first_name} ${dep.last_name}`);
    } else {
      sessionStorage.removeItem("actingPatientId");
      sessionStorage.removeItem("actingPatientName");
    }
    qc.clear();
    window.location.reload();
  };

  const currentActingId = sessionStorage.getItem("actingPatientId");

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Users size={28} className="text-blue-200" />
            <h1 className="text-2xl font-bold">My Family & Dependents</h1>
          </div>
          <p className="text-blue-100 text-sm mt-1">
            Manage care for your children, parents, or family members under a single account (Up to 5 dependents).
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={dependents.filter((d) => d.is_active).length >= 5}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <UserPlus size={18} />
          Add Dependent Member
        </button>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="p-1 hover:bg-emerald-500/20 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="p-1 hover:bg-rose-500/20 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dependents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-48 rounded-2xl border p-5 ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              } animate-pulse`}
            />
          ))}
        </div>
      ) : dependents.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
          }`}
        >
          <Users size={48} className="mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-lg font-semibold mb-1">No Family Members Added Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            You can add up to 5 family members (e.g. children or parents) to book appointments, view prescriptions, and manage medical records for them.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-md"
          >
            <UserPlus size={18} />
            Add First Family Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.map((dep) => {
            const isCurrentlyActive = currentActingId === String(dep.dependent_patient_id);
            const age = dep.date_of_birth
              ? dayjs().diff(dayjs(dep.date_of_birth), "year")
              : null;

            return (
              <div
                key={dep.id}
                className={`relative rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isCurrentlyActive
                    ? isDark
                      ? "bg-amber-950/20 border-amber-500/50 shadow-md"
                      : "bg-amber-50/70 border-amber-400 shadow-md"
                    : dep.is_active
                    ? isDark
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-slate-300"
                    : isDark
                    ? "bg-slate-950/60 border-slate-900 opacity-60"
                    : "bg-slate-100/70 border-slate-200 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${
                          dep.relation === "child"
                            ? "bg-gradient-to-br from-pink-500 to-rose-500"
                            : dep.relation === "parent"
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                            : "bg-gradient-to-br from-blue-500 to-indigo-600"
                        }`}
                      >
                        {dep.first_name.charAt(0)}
                        {dep.last_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className={`font-bold text-base ${isDark ? "text-white" : "text-slate-800"}`}>
                          {dep.first_name} {dep.last_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {dep.relation}
                          </span>
                          {!dep.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(dep)}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors ${
                          isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        }`}
                        title="Edit member details"
                      >
                        <Edit2 size={16} />
                      </button>
                      {dep.is_active && (
                        <button
                          onClick={() => setDeactivateConfirm(dep)}
                          className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors ${
                            isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                          }`}
                          title="Deactivate family member"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs py-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Age / DOB</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {age !== null ? `${age} yrs` : "N/A"} (
                        {dep.date_of_birth ? dayjs(dep.date_of_birth).format("DD MMM YYYY") : "N/A"})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Gender</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">
                        {dep.gender || "N/A"}
                      </span>
                    </div>

                    {dep.blood_group && (
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Blood Group</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {dep.blood_group}
                        </span>
                      </div>
                    )}

                    {dep.allergies && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                        <span className="font-bold block text-[10px] uppercase">Allergies</span>
                        <span className="truncate block">{dep.allergies}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  {dep.is_active ? (
                    isCurrentlyActive ? (
                      <button
                        onClick={() => handleSwitchProfile(null)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <UserCheck size={15} />
                        Currently Managing (Switch Back)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSwitchProfile(dep)}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Users size={15} />
                        Switch to {dep.first_name}'s Profile
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-slate-400 italic">Profile Deactivated</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${
              isDark ? "bg-[#111827] border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                {editingDependent ? "Edit Family Member" : "Add Dependent Family Member"}
              </h2>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Relation *
                  </label>
                  <select
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                    }`}
                  >
                    {RELATIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                    }`}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Blood Group (Optional)
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                    }`}
                  >
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Known Allergies (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Penicillin, Dust, Peanuts"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300"
                  }`}
                />
              </div>

              {errorMsg && <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingDependent
                    ? "Update Member"
                    : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
              isDark ? "bg-[#111827] border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <ShieldAlert size={24} />
              <h3 className="font-bold text-lg">Deactivate Family Member?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              Are you sure you want to deactivate{" "}
              <strong>
                {deactivateConfirm.first_name} {deactivateConfirm.last_name}
              </strong>
              ?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl mb-4">
              <strong>Note:</strong> All existing medical records, appointments, prescriptions, and lab history for this member will be safely preserved.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeactivateConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMutation.mutate(deactivateConfirm.dependent_patient_id)}
                disabled={deactivateMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-md disabled:opacity-50"
              >
                {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientFamily;
