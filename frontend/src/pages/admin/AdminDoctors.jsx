import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorService, departmentService } from "../../services/services";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { Plus, Stethoscope, Search, Pencil, Camera, X, Star } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB, same as backend imageUpload
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_VALUES = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  departmentId: "",
  specialization: "",
  qualification: "",
  experienceYears: "",
  consultationFee: "",
  roomNumber: "",
  bio: "",
};

// Backend ke fields -> form ke fields
const rowToForm = (row) => ({
  firstName: row.first_name || "",
  lastName: row.last_name || "",
  email: row.email || "",
  phone: row.phone || "",
  departmentId: row.department_id || "",
  specialization: row.specialization || "",
  qualification: row.qualification || "",
  experienceYears: row.experience_years ?? "",
  consultationFee: row.consultation_fee ?? "",
  roomNumber: row.room_number || "",
  bio: row.bio || "",
});

const AdminDoctors = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null); // null = Add mode
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY_VALUES });

  const isEdit = !!editingDoctor;

  // Search debounce (har keystroke par API call na jaye)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Photo preview ka memory cleanup
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:"))
        URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", page, debouncedSearch],
    queryFn: () =>
      doctorService
        .getAll({ page, limit: 10, search: debouncedSearch })
        .then((r) => r.data),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getAll().then((r) => r.data.data),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingDoctor(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    reset(EMPTY_VALUES);
  };

  const openAdd = () => {
    setEditingDoctor(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    reset(EMPTY_VALUES);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingDoctor(row);
    setPhotoFile(null);
    setPhotoPreview(row.profile_image_url || null);
    reset(rowToForm(row));
    setShowModal(true);
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // same file dobara chunne par bhi onChange chale
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("Photo must be 2MB or smaller");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(isEdit ? editingDoctor.profile_image_url || null : null);
  };

  // Khaali fields bhejni hi nahi hain: multipart mein '' number column tod deta hai
  const buildFormData = (values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([key, val]) => {
      if (isEdit && key === "email") return; // email edit nahi hota
      if (val === "" || val === null || val === undefined) return;
      fd.append(key, val);
    });
    if (photoFile) fd.append("profileImage", photoFile);
    return fd;
  };

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const fd = buildFormData(values);
      return isEdit
        ? doctorService.update(editingDoctor.id, fd)
        : doctorService.create(fd);
    },
    onSuccess: (res) => {
      const genPassword = res?.data?.data?.generatedPassword;
      if (genPassword) {
        toast.success(`Doctor created! Password: ${genPassword}`, { duration: 8000 });
      } else {
        toast.success(isEdit ? "Doctor updated" : "Doctor account created");
      }
      qc.invalidateQueries({ queryKey: ["doctors"] });
      closeModal();
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message ||
          (isEdit ? "Failed to update doctor" : "Failed to create doctor"),
      ),
  });

  const columns = [
    {
      key: "first_name",
      label: "Doctor",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.profile_image_url ? (
            <img
              src={row.profile_image_url}
              alt=""
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {row.first_name?.[0]}
              {row.last_name?.[0]}
            </div>
          )}
          <div>
            <p
              className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-800"}`}
            >
              Dr. {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: "specialization", label: "Specialization" },
    { key: "department_name", label: "Department" },
    { key: "room_number", label: "Room", render: (val) => val || "-" },
    {
      key: "consultation_fee",
      label: "Fee",
      render: (val) => `₹${val || 0}`,
    },
    {
      key: "rating",
      label: "Rating",
      render: (_, row) =>
        Number(row.total_reviews) > 0 ? (
          <span className="flex items-center gap-1 font-semibold text-sm">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            {Number(row.rating).toFixed(1)}{" "}
            <span className="text-xs text-slate-400 font-normal">
              ({row.total_reviews})
            </span>
          </span>
        ) : (
          <span className="text-slate-400 text-sm">-</span>
        ),
    },
    {
      key: "is_available",
      label: "Status",
      render: (val) => (
        <span className={`badge ${val ? "badge-approved" : "badge-cancelled"}`}>
          {val ? "Available" : "Unavailable"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <button
          onClick={() => openEdit(row)}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? "text-gray-300 hover:bg-gray-700"
              : "text-slate-500 hover:bg-slate-100"
          }`}
          aria-label={`Edit Dr. ${row.first_name} ${row.last_name}`}
          title="Edit"
        >
          <Pencil size={16} />
        </button>
      ),
    },
  ];

  const labelCls = `block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`;
  const inputCls =
    "input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white";
  const sectionCls = `text-sm font-semibold mb-3 pb-2 border-b ${
    isDark ? "text-white border-gray-700" : "text-slate-800 border-slate-200"
  }`;

  const field = (name, label, opts = {}) => {
    const { type = "text", placeholder, required, disabled, rules = {} } = opts;
    return (
      <div key={name}>
        <label className={labelCls}>{label}</label>
        <input
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputCls} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          {...register(name, {
            ...(required ? { required: `${label} is required` } : {}),
            ...rules,
          })}
        />
        {errors[name] && (
          <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input-field pl-10 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openAdd} className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      <div
        className={`card p-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
      >
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          emptyMessage="No doctors found"
          emptyIcon={Stethoscope}
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={isEdit ? "Edit Doctor" : "Add New Doctor"}
        footer={
          <>
            <button
              onClick={closeModal}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit((values) => saveMutation.mutate(values))}
              disabled={saveMutation.isPending}
              className="btn-primary px-5 py-2 text-sm"
            >
              {saveMutation.isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Doctor"}
            </button>
          </>
        }
      >
        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
          {/* Basic */}
          <section>
            <h3 className={sectionCls}>Basic details</h3>

            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 ${
                  isDark ? "bg-gray-700" : "bg-slate-100"
                }`}
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Doctor"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={24} className="text-slate-400" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="btn-secondary px-4 py-2 text-sm cursor-pointer">
                    {photoPreview ? "Change photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onPhotoChange}
                    />
                  </label>
                  {photoFile && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500"
                      aria-label="Remove selected photo"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  JPG, PNG or WebP, up to 2MB
                </p>
              </div>
            </div>            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("firstName", "First Name", {
                placeholder: "First name",
                required: true,
              })}
              {field("lastName", "Last Name", {
                placeholder: "Last name",
                required: true,
              })}
              {field("email", "Email", {
                type: "email",
                placeholder: "doctor@shms.com",
                required: true,
                disabled: isEdit,
              })}
              {field("phone", "Phone", {
                placeholder: "+91 9876543210",
                required: true,
              })}
            </div>
          </section>

          {/* Professional */}
          <section>
            <h3 className={sectionCls}>Professional details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Department</label>
                <select
                  className={inputCls}
                  {...register("departmentId", {
                    required: "Department is required",
                  })}
                >
                  <option value="">Select department</option>
                  {(departments || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.departmentId && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.departmentId.message}
                  </p>
                )}
              </div>
              {field("specialization", "Specialization", {
                placeholder: "e.g., Interventional Cardiologist",
                required: true,
              })}
              {field("qualification", "Qualification", {
                placeholder: "e.g., MBBS, MD",
              })}
              {field("experienceYears", "Experience (years)", {
                type: "number",
                placeholder: "5",
                rules: { min: { value: 0, message: "Cannot be negative" } },
              })}
            </div>
          </section>

          {/* Hospital */}
          <section>
            <h3 className={sectionCls}>Hospital details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("consultationFee", "Consultation Fee (₹)", {
                type: "number",
                placeholder: "500",
                rules: { min: { value: 0, message: "Cannot be negative" } },
              })}
              {field("roomNumber", "Room Number", { placeholder: "e.g., 204" })}
              <div className="col-span-1 sm:col-span-2">
                <label className={labelCls}>About</label>
                <textarea
                  rows={3}
                  placeholder="Short bio shown to patients"
                  className={inputCls}
                  {...register("bio")}
                />
              </div>
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDoctors;
