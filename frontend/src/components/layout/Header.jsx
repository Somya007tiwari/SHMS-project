import React, { useEffect, useState } from "react";
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  PhoneCall,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../../services/services";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

// Edit these to match the numbers your hospital wants to show
const EMERGENCY_CONTACTS = [
  { label: "National Emergency", number: "112" },
  { label: "Ambulance", number: "108" },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const Header = ({ onMenuToggle, title }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [profileOpen, setProfileOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: unreadRes } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationService.getUnreadCount().then((r) => r.data),
    refetchInterval: 30000,
  });
  const unreadCount = unreadRes?.unreadCount || 0;

  const { data: latestRes, isLoading: isNotifLoading } = useQuery({
    queryKey: ["notifications-latest"],
    queryFn: () => notificationService.getMyNotifications({ limit: 8 }).then((r) => r.data),
    refetchInterval: 30000,
  });
  const latestNotifications = latestRes?.data || [];

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-latest"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-latest"] });
    },
  });

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    setNotifOpen(false);
    if (n.link) {
      navigate(n.link);
    } else {
      navigate("/notifications");
    }
  };

  const firstName = user?.firstName || "User";
  const lastName = user?.lastName || "";
  const role = user?.role || "User";
  const isPatient = role === "patient";

  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Close the emergency dialog with Escape
  useEffect(() => {
    if (!emergencyOpen) return;
    const onKey = (e) => e.key === "Escape" && setEmergencyOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emergencyOpen]);

  const iconBtn =
    "flex items-center justify-center w-10 h-10 rounded-xl transition-colors " +
    (isDark
      ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200");

  return (
    <header
      className={
        "sticky top-0 z-30 min-h-[76px] flex items-center gap-3 px-4 md:px-6 border-b " +
        (isDark ? "bg-[#111827] border-slate-800" : "bg-white border-slate-200")
      }
    >
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onMenuToggle}
        className={
          "lg:hidden flex items-center justify-center w-10 h-10 rounded-xl " +
          (isDark
            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
            : "text-slate-600 hover:bg-slate-100")
        }
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Title + greeting + date */}
      <div className="min-w-0">
        <h1
          className={
            "text-lg md:text-xl font-bold tracking-tight truncate " +
            (isDark ? "text-white" : "text-[#0F172A]")
          }
        >
          {title}
        </h1>
        <p
          className={
            "hidden md:block text-xs mt-1 truncate " +
            (isDark ? "text-slate-500" : "text-slate-400")
          }
        >
          {getGreeting()}, {firstName} <span className="mx-1">•</span>{" "}
          {todayLabel}
        </p>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <button
        type="button"
        className={
          "hidden lg:flex items-center gap-3 w-[220px] px-3.5 py-2.5 rounded-xl border text-sm " +
          (isDark
            ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-blue-500/50"
            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300")
        }
      >
        <Search size={16} />
        <span className="flex-1 text-left">Search...</span>
        <span
          className={
            "px-1.5 py-0.5 rounded-md text-[10px] " +
            (isDark
              ? "bg-slate-700 text-slate-400"
              : "bg-white border border-slate-200 text-slate-400")
          }
        >
          Ctrl K
        </span>
      </button>

      {/* Emergency (patients only) */}
      {isPatient && (
        <button
          type="button"
          onClick={() => setEmergencyOpen(true)}
          className="flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          title="Emergency contacts"
        >
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
          </span>
          <span className="hidden sm:inline">Emergency</span>
          <PhoneCall size={16} className="sm:hidden" />
        </button>
      )}

      {/* Theme */}
      <button
        type="button"
        onClick={toggleTheme}
        className={
          "flex items-center justify-center w-10 h-10 rounded-xl transition-colors " +
          (isDark
            ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200")
        }
        title="Change theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications Bell & Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setNotifOpen(!notifOpen)}
          className={"relative " + iconBtn}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full border-2 border-white dark:border-[#111827]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setNotifOpen(false)}
            />

            <div
              className={
                "absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden " +
                (isDark
                  ? "bg-[#111827] border-slate-700"
                  : "bg-white border-slate-200")
              }
            >
              <div
                className={
                  "flex items-center justify-between px-4 py-3 border-b " +
                  (isDark ? "border-slate-800" : "border-slate-100")
                }
              >
                <div className="flex items-center gap-2">
                  <h3
                    className={
                      "font-semibold text-sm " +
                      (isDark ? "text-white" : "text-slate-800")
                    }
                  >
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllMutation.mutate()}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {isNotifLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 skeleton rounded-xl" />
                    ))}
                  </div>
                ) : latestNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No notifications yet
                  </div>
                ) : (
                  latestNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={
                        "p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 " +
                        (!n.is_read
                          ? isDark
                            ? "bg-blue-950/20"
                            : "bg-blue-50/50"
                          : "")
                      }
                    >
                      <div
                        className={
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 " +
                          (!n.is_read
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
                        }
                      >
                        <Bell size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={
                              "text-xs font-semibold truncate " +
                              (isDark ? "text-slate-200" : "text-slate-800")
                            }
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {dayjs(n.created_at).fromNow()}
                          </span>
                        </div>
                        <p
                          className={
                            "text-xs line-clamp-2 mt-0.5 " +
                            (isDark ? "text-slate-400" : "text-slate-600")
                          }
                        >
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                className={
                  "p-2.5 text-center border-t " +
                  (isDark ? "border-slate-800" : "border-slate-100")
                }
              >
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="block text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={
          "hidden sm:block h-8 w-px " +
          (isDark ? "bg-slate-700" : "bg-slate-200")
        }
      />

      {/* Profile */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className={
            "flex items-center gap-2 px-2 py-1.5 rounded-xl " +
            (isDark ? "hover:bg-slate-800" : "hover:bg-slate-50")
          }
        >
          <div className="relative">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1E3A5F] text-white text-xs font-bold">
              {initials}
            </div>
            <span
              className={
                "absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 " +
                (isDark ? "border-[#111827]" : "border-white")
              }
            />
          </div>

          <div className="hidden sm:block text-left max-w-[110px]">
            <p
              className={
                "text-sm font-semibold truncate " +
                (isDark ? "text-white" : "text-slate-700")
              }
            >
              {firstName}
            </p>
            <p
              className={
                "text-[10px] capitalize truncate " +
                (isDark ? "text-slate-500" : "text-slate-400")
              }
            >
              {role}
            </p>
          </div>

          <ChevronDown
            size={15}
            className={
              "hidden sm:block transition-transform " +
              (profileOpen ? "rotate-180 " : "") +
              (isDark ? "text-slate-500" : "text-slate-400")
            }
          />
        </button>

        {profileOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setProfileOpen(false)}
            />

            <div
              className={
                "absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden " +
                (isDark
                  ? "bg-[#111827] border-slate-700"
                  : "bg-white border-slate-200")
              }
            >
              <div
                className={
                  "px-4 py-4 border-b " +
                  (isDark ? "border-slate-700" : "border-slate-100")
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#1E3A5F] text-white text-sm font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={
                        "font-semibold text-sm truncate " +
                        (isDark ? "text-white" : "text-slate-800")
                      }
                    >
                      {firstName} {lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user?.email || "No email"}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full bg-blue-50 text-[#3B82F6]">
                      {role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {[
                  { icon: User, label: "My Profile" },
                  { icon: Settings, label: "Profile Settings" },
                ].map(({ icon: Icon, label }) => (
                  <Link
                    key={label}
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className={
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm " +
                      (isDark
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-slate-700 hover:bg-slate-50")
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                ))}

                <div
                  className={
                    "my-1 border-t " +
                    (isDark ? "border-slate-700" : "border-slate-100")
                  }
                />

                <button
                  type="button"
                  onClick={logout}
                  className={
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 " +
                    (isDark ? "hover:bg-red-500/10" : "hover:bg-red-50")
                  }
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Emergency dialog */}
      {emergencyOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          onClick={() => setEmergencyOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Emergency contacts"
        >
          <div
            className={
              "w-full max-w-sm rounded-2xl border shadow-2xl p-5 " +
              (isDark
                ? "bg-[#111827] border-slate-700"
                : "bg-white border-slate-200")
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h2
                    className={
                      "font-bold " + (isDark ? "text-white" : "text-slate-800")
                    }
                  >
                    Emergency help
                  </h2>
                  <p className="text-xs text-slate-400">Tap a number to call</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmergencyOpen(false)}
                className={
                  "p-1.5 rounded-lg " +
                  (isDark
                    ? "text-slate-400 hover:bg-slate-800"
                    : "text-slate-400 hover:bg-slate-100")
                }
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {EMERGENCY_CONTACTS.map((c) => (
                <a
                  key={c.number}
                  href={`tel:${c.number}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/25 transition-all"
                >
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-lg font-bold tracking-wide">
                    {c.number}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
