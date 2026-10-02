import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { doctorService, reviewService } from "../../services/services";
import {
  Star,
  MapPin,
  GraduationCap,
  Clock,
  Calendar,
  Stethoscope,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const DAYS_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [reviewsPage, setReviewsPage] = useState(1);
  const [imgFailed, setImgFailed] = useState(false);

  // Fetch doctor detail
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => doctorService.getById(id).then((r) => r.data.data),
  });

  // Fetch doctor schedule
  const { data: schedule } = useQuery({
    queryKey: ["doctorSchedule", id],
    queryFn: () => doctorService.getSchedule(id).then((r) => r.data.data),
    enabled: !!id,
  });

  // Fetch rating summary
  const { data: summary } = useQuery({
    queryKey: ["ratingSummary", id],
    queryFn: () => reviewService.getSummary(id).then((r) => r.data.data),
    enabled: !!id,
  });

  // Fetch reviews list
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", id, reviewsPage],
    queryFn: () =>
      reviewService.getByDoctor(id, { page: reviewsPage, limit: 5 }).then((r) => r.data),
    enabled: !!id,
  });

  if (doctorLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-gray-800 rounded-2xl md:col-span-2" />
          <div className="h-64 bg-slate-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-md mx-auto text-center py-16 card p-8">
        <Stethoscope size={48} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Doctor Not Found</h2>
        <p className="text-slate-500 text-sm mt-2 mb-6">The requested doctor profile does not exist.</p>
        <button onClick={() => navigate(-1)} className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
          <ChevronLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const reviewsList = reviewsData?.data || [];
  const pagination = reviewsData?.pagination;
  const totalReviews = summary?.totalReviews || 0;
  const avgRating = summary?.averageRating || 0;

  const handleBookNow = () => {
    navigate(`/patient/book-appointment?doctorId=${doctor.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
      >
        <ChevronLeft size={16} /> Back to Doctors
      </button>

      {/* Main Doctor Card Header */}
      <div className={`card p-6 md:p-8 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {doctor.profile_image_url && !imgFailed ? (
            <img
              src={doctor.profile_image_url}
              alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
              onError={() => setImgFailed(true)}
              className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-28 h-28 md:w-36 md:h-36 gradient-primary rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md flex-shrink-0">
              {doctor.first_name?.[0]}
              {doctor.last_name?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Dr. {doctor.first_name} {doctor.last_name}
              </h1>
              <span
                className={`badge ${doctor.is_available ? "badge-approved" : "badge-cancelled"}`}
              >
                {doctor.is_available ? "Available" : "Unavailable"}
              </span>
            </div>

            <p className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
              {doctor.specialization}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Stethoscope size={16} className="text-blue-500" />
                {doctor.department_name}
              </span>
              {doctor.qualification && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={16} className="text-blue-500" />
                  {doctor.qualification}
                </span>
              )}
              {doctor.room_number && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-blue-500" />
                  Room {doctor.room_number}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={16} className="text-blue-500" />
                {doctor.experience_years} Years Experience
              </span>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <IndianRupee size={20} className="text-green-600 dark:text-green-400" />
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {doctor.consultation_fee}
                </span>
                <span className="text-xs text-slate-400">Consultation Fee</span>
              </div>

              {totalReviews > 0 ? (
                <div className="flex items-center gap-1.5 text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-slate-800 dark:text-white">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-slate-400">({totalReviews} reviews)</span>
                </div>
              ) : (
                <span className="text-xs bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
                  New Doctor
                </span>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex-shrink-0 pt-4 md:pt-0">
            <button
              onClick={handleBookNow}
              disabled={!doctor.is_available}
              className="btn-primary w-full md:w-auto px-8 py-3.5 text-base justify-center shadow-lg disabled:opacity-50"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Grid Section: About & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About Bio */}
        <div className={`md:col-span-2 card p-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
            About Dr. {doctor.last_name}
          </h2>
          <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {doctor.bio || "No description provided."}
          </p>
        </div>

        {/* Working Hours Schedule */}
        <div className={`card p-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
            <Calendar size={18} className="text-blue-500" /> Working Days
          </h2>
          <div className="space-y-2 text-xs">
            {DAYS_ORDER.map((dayKey) => {
              const dayItem = (schedule || []).find(
                (s) => s.day_of_week?.toLowerCase() === dayKey
              );
              const isActive = dayItem && (dayItem.is_active === true || dayItem.is_active === 'true');
              const dayLabel = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

              return (
                <div
                  key={dayKey}
                  className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-gray-700 last:border-0"
                >
                  <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                    {dayLabel}
                  </span>
                  {isActive ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {dayItem.start_time?.substring(0, 5)} - {dayItem.end_time?.substring(0, 5)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Off</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ratings & Reviews Breakdown */}
      <div className={`card p-6 md:p-8 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
        <h2 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>
          Patient Reviews & Ratings
        </h2>

        {totalReviews > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-100 dark:border-gray-700">
            {/* Overall Rating Score */}
            <div className="text-center md:border-r border-slate-100 dark:border-gray-700 pr-6 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-800 dark:text-white">
                {avgRating.toFixed(1)}
              </span>
              <div className="flex gap-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={`${
                      star <= Math.round(avgRating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-200 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400">Based on {totalReviews} reviews</p>
            </div>

            {/* Star Breakdown Bars */}
            <div className="md:col-span-2 space-y-2 justify-center flex flex-col">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary?.stars?.[star] || 0;
                const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-medium text-slate-500 dark:text-gray-400 flex items-center gap-1">
                      {star} <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    </span>
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-slate-400 font-medium">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 dark:bg-gray-700/30 rounded-2xl mb-6">
            <MessageSquare size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-gray-300">No reviews yet</p>
            <p className="text-xs text-slate-400 mt-1">Be the first patient to review Dr. {doctor.last_name} after your consultation.</p>
          </div>
        )}

        {/* Reviews List */}
        {reviewsList.length > 0 && (
          <div className="space-y-4">
            <h3 className={`font-semibold text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              Latest Reviews
            </h3>
            {reviewsList.map((rev) => (
              <div
                key={rev.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDark
                    ? "bg-gray-700/40 border-gray-700"
                    : "bg-slate-50/70 border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xs">
                      {rev.patient_name?.[0]}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>
                        {rev.patient_name}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rev.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={`${
                          s <= rev.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-slate-200 dark:text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 leading-relaxed">
                    "{rev.comment}"
                  </p>
                )}
              </div>
            ))}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                    disabled={reviewsPage === 1}
                    className="btn-secondary p-2 text-xs disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setReviewsPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={reviewsPage >= pagination.totalPages}
                    className="btn-secondary p-2 text-xs disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;
