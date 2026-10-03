import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  doctorService,
  departmentService,
  appointmentService,
} from "../../services/services";
import {
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Clock,
  Stethoscope,
  Check,
  MapPin,
  GraduationCap,
  IndianRupee,
  Eye,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import dayjs from "dayjs";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DoctorAvatar = ({ doctor, size = "w-14 h-14", text = "text-lg" }) => {
  const [failed, setFailed] = useState(false);
  if (doctor.profile_image_url && !failed) {
    return (
      <img
        src={doctor.profile_image_url}
        alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
        onError={() => setFailed(true)}
        className={`${size} rounded-xl object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${size} gradient-primary rounded-xl flex items-center justify-center text-white font-bold ${text} flex-shrink-0`}
    >
      {doctor.first_name?.[0]}
      {doctor.last_name?.[0]}
    </div>
  );
};

const BookAppointment = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get("doctorId");

  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState(searchParams.get("departmentId") || "");
  const [sortBy, setSortBy] = useState("");
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [booking, setBooking] = useState(false);

  // Wait 400ms after typing stops before calling the API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Handle preselected doctor from query parameter
  useEffect(() => {
    if (preselectedDoctorId && !selectedDoctor) {
      doctorService
        .getById(preselectedDoctorId)
        .then((r) => {
          if (r.data?.data) {
            setSelectedDoctor(r.data.data);
            setStep(2);
          }
        })
        .catch(() => {
          // If preselected doctor fails, stay on step 1
        });
    }
  }, [preselectedDoctorId]);

  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: [
      "doctors",
      { search: debouncedSearch, departmentId: deptFilter, sortBy },
    ],
    queryFn: () =>
      doctorService
        .getAll({
          search: debouncedSearch,
          departmentId: deptFilter,
          sortBy,
          limit: 20,
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getAll().then((r) => r.data.data),
  });

  const { data: slotsData } = useQuery({
    queryKey: ["slots", selectedDoctor?.id, selectedDate],
    queryFn: () =>
      appointmentService
        .getAvailableSlots(selectedDoctor?.id, selectedDate)
        .then((r) => r.data.data),
    enabled: !!selectedDoctor && !!selectedDate,
  });

  const daysInMonth = currentMonth.daysInMonth();
  const firstDay = currentMonth.startOf("month").day();
  const today = dayjs();

  const pickDoctor = (doctor) => {
    // New doctor: old date/slot no longer valid
    setSelectedDoctor(doctor);
    setSelectedDate("");
    setSelectedSlot("");
    setStep(2);
  };

  const pickDate = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(""); // FIX: slot from the previous date must not stay selected
  };

  const handleBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error("Please complete all required fields");
      return;
    }
    setBooking(true);
    try {
      await appointmentService.create({
        doctorId: selectedDoctor.id,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot,
        reason,
        symptoms,
      });
      toast.success("Appointment booked successfully!");
      queryClient.invalidateQueries(["slots", selectedDoctor.id, selectedDate]);
      setStep(4);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Booking failed. Please try again.";
      toast.error(msg);
      if (err.response?.status === 409) {
        queryClient.invalidateQueries(["slots", selectedDoctor?.id, selectedDate]);
        setSelectedSlot("");
        setStep(2);
      }
    } finally {
      setBooking(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {["Select Doctor", "Choose Date", "Confirm"].map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`flex items-center gap-2 ${i < step - 1 ? "text-green-500" : i === step - 1 ? "text-blue-600" : "text-slate-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${i < step - 1 ? "bg-green-500 text-white" : i === step - 1 ? "bg-blue-600 text-white" : isDark ? "bg-gray-700 text-gray-400" : "bg-slate-200 text-slate-500"}`}
            >
              {i < step - 1 ? <Check size={14} /> : i + 1}
            </div>
            <span className="text-sm font-medium hidden sm:block">{s}</span>
          </div>
          {i < 2 && (
            <div
              className={`flex-1 h-0.5 ${i < step - 1 ? "bg-green-400" : isDark ? "bg-gray-700" : "bg-slate-200"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  if (step === 4) {
    return (
      <div
        className={`card p-12 text-center max-w-md mx-auto ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
      >
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-500" />
        </div>
        <h2
          className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-800"}`}
        >
          Appointment Booked!
        </h2>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-2">
          With{" "}
          <strong>
            Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}
          </strong>
        </p>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">
          {dayjs(selectedDate).format("MMMM D, YYYY")} at {selectedSlot}
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl mb-6">
          ⏳ Your appointment is <strong>pending approval</strong> from the
          doctor. You'll receive an email notification once approved.
        </p>
        <Link
          to="/patient/appointments"
          className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
        >
          View My Appointments
        </Link>
      </div>
    );
  }

  const doctors = doctorsData?.data || [];

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator />

      {/* Step 1: Doctor Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input-field pl-10 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Search doctors by name or specialization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field sm:w-48 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="input-field sm:w-44 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="">Sort: Default</option>
              <option value="rating">Highest rated</option>
              <option value="experience">Most experienced</option>
              <option value="fee_asc">Lowest fee</option>
            </select>
          </div>

          {doctorsLoading && (
            <p className="text-sm text-slate-400 text-center py-8">
              Loading doctors...
            </p>
          )}

          {!doctorsLoading && doctors.length === 0 && (
            <div
              className={`card p-10 text-center ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
            >
              <Stethoscope size={32} className="mx-auto mb-3 text-slate-400" />
              <p
                className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}
              >
                No doctors found
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Try a different name or department.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                onClick={() => pickDoctor(doctor)}
                className={`card card-hover p-5 cursor-pointer transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "hover:border-blue-200 border border-transparent"}
                  ${selectedDoctor?.id === doctor.id ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <DoctorAvatar doctor={doctor} />
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-bold truncate ${isDark ? "text-white" : "text-slate-800"}`}
                    >
                      Dr. {doctor.first_name} {doctor.last_name}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium truncate">
                      {doctor.specialization}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">
                      {doctor.department_name}
                    </p>
                  </div>
                </div>

                {(doctor.qualification || doctor.room_number) && (
                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-gray-400">
                    {doctor.qualification && (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={13} />
                        {doctor.qualification}
                      </div>
                    )}
                    {doctor.room_number && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} />
                        Room {doctor.room_number}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
                  {/* Rating only shows when real reviews exist */}
                  {Number(doctor.total_reviews) > 0 ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Star
                        size={14}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span
                        className={isDark ? "text-gray-300" : "text-slate-700"}
                      >
                        {Number(doctor.rating).toFixed(1)}
                      </span>
                      <span className="text-slate-400">
                        ({doctor.total_reviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">New</span>
                  )}
                  <div className="flex items-center gap-0.5 text-sm font-semibold text-green-600 dark:text-green-400">
                    <IndianRupee size={14} />
                    {doctor.consultation_fee}
                  </div>
                  <Link
                    to={`/patient/doctors/${doctor.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-medium hover:underline"
                  >
                    <Eye size={12} /> Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Date & Slot Selection */}
      {step === 2 && selectedDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`card p-5 h-fit ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <DoctorAvatar
                doctor={selectedDoctor}
                size="w-12 h-12"
                text="text-base"
              />
              <div className="min-w-0">
                <h3
                  className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                </h3>
                <p className="text-xs text-blue-600">
                  {selectedDoctor.specialization}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                <Stethoscope size={14} />
                {selectedDoctor.department_name}
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                <IndianRupee size={14} />
                {selectedDoctor.consultation_fee}
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                <Clock size={14} />
                {selectedDoctor.experience_years} years experience
              </div>
              {selectedDoctor.room_number && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                  <MapPin size={14} />
                  Room {selectedDoctor.room_number}
                </div>
              )}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-sm text-blue-600 hover:underline w-full text-left"
            >
              ← Change Doctor
            </button>
          </div>

          <div
            className={`lg:col-span-2 card p-5 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}
              >
                {currentMonth.format("MMMM YYYY")}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentMonth((m) => m.subtract(1, "month"))}
                  className={`p-1.5 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-slate-100"}`}
                >
                  <ChevronLeft
                    size={16}
                    className={isDark ? "text-gray-400" : "text-slate-600"}
                  />
                </button>
                <button
                  onClick={() => setCurrentMonth((m) => m.add(1, "month"))}
                  className={`p-1.5 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-slate-100"}`}
                >
                  <ChevronRight
                    size={16}
                    className={isDark ? "text-gray-400" : "text-slate-600"}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-slate-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = currentMonth.date(i + 1);
                const dateStr = date.format("YYYY-MM-DD");
                const isPast = date.isBefore(today, "day");
                const isSelected = selectedDate === dateStr;
                const isToday = date.isSame(today, "day");

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isPast && pickDate(dateStr)}
                    disabled={isPast}
                    className={`w-full aspect-square rounded-xl text-sm font-medium transition-all
                      ${isPast ? "opacity-30 cursor-not-allowed" : ""}
                      ${isSelected ? "bg-blue-600 text-white shadow-lg scale-105" : ""}
                      ${isToday && !isSelected ? "border-2 border-blue-400 text-blue-600" : ""}
                      ${!isSelected && !isPast ? (isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-blue-50 text-slate-700") : ""}
                    `}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6">
                <h4
                  className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-slate-700"}`}
                >
                  Available Slots for{" "}
                  {dayjs(selectedDate).format("MMMM D, YYYY")}
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slotsData?.isDayOff ? (
                    <div className="col-span-6 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl text-center text-sm font-medium">
                      🗓️ Doctor is off on this day. Please select another date.
                    </div>
                  ) : slotsData?.isAvailable === false ? (
                    <div className="col-span-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center text-sm font-medium">
                      🚫 Doctor is currently unavailable.
                    </div>
                  ) : (slotsData?.slots || []).length === 0 ? (
                    <div className="col-span-6 bg-slate-50 dark:bg-gray-700/30 text-slate-500 dark:text-gray-400 p-4 rounded-xl text-center text-sm font-medium">
                      ⏰ No available slots left on this day.
                    </div>
                  ) : (
                    (slotsData?.slots || []).map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() =>
                          slot.available && setSelectedSlot(slot.time)
                        }
                        disabled={!slot.available}
                        className={`calendar-slot py-2 px-1 text-xs font-medium border text-center rounded-lg transition-all
                          ${!slot.available ? "booked text-slate-400 border-slate-200 dark:border-gray-700 opacity-50 cursor-not-allowed" : ""}
                          ${selectedSlot === slot.time ? "selected shadow-md ring-2 ring-blue-500" : ""}
                          ${slot.available && selectedSlot !== slot.time ? `available border-slate-200 dark:border-gray-700 ${isDark ? "text-gray-300 hover:bg-gray-700" : "text-slate-700 hover:bg-blue-50"}` : ""}`}
                      >
                        {slot.time}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedDate && selectedSlot && (
              <button
                onClick={() => setStep(3)}
                className="btn-primary w-full py-3 text-sm mt-4 justify-center"
              >
                Continue to Confirm <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="max-w-lg mx-auto">
          <div
            className={`card p-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
          >
            <h3
              className={`font-bold text-lg mb-6 ${isDark ? "text-white" : "text-slate-800"}`}
            >
              Confirm Appointment
            </h3>

            <div
              className={`p-4 rounded-xl mb-6 ${isDark ? "bg-gray-700" : "bg-blue-50"}`}
            >
              <div className="space-y-3 text-sm">
                {[
                  {
                    label: "Doctor",
                    value: `Dr. ${selectedDoctor?.first_name} ${selectedDoctor?.last_name}`,
                  },
                  {
                    label: "Specialization",
                    value: selectedDoctor?.specialization,
                  },
                  selectedDoctor?.room_number && {
                    label: "Room",
                    value: selectedDoctor.room_number,
                  },
                  {
                    label: "Date",
                    value: dayjs(selectedDate).format("MMMM D, YYYY (dddd)"),
                  },
                  { label: "Time", value: selectedSlot },
                  {
                    label: "Fee",
                    value: `₹${selectedDoctor?.consultation_fee}`,
                  },
                ]
                  .filter(Boolean)
                  .map(({ label, value }) => (
                    <div key={label} className="flex">
                      <span
                        className={`w-32 font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}
                      >
                        {label}:
                      </span>
                      <span
                        className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}
                >
                  Reason for Visit <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., Regular checkup, Back pain..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}
                >
                  Symptoms (optional)
                </label>
                <textarea
                  rows={3}
                  className="input-field resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Describe your symptoms..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="btn-secondary flex-1 py-3 text-sm"
              >
                ← Back
              </button>
              <button
                onClick={handleBooking}
                disabled={!reason.trim() || booking}
                className="btn-primary flex-1 py-3 text-sm justify-center disabled:opacity-50"
              >
                {booking ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
