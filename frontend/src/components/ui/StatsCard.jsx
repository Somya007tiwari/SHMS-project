import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
  trendValue,
}) => {
  const { isDark } = useTheme();

  const colors = {
    blue: {
      iconBg: isDark ? "bg-blue-500/10" : "bg-blue-50",
      icon: "text-blue-600",
      accent: "bg-blue-500",
    },

    teal: {
      iconBg: isDark ? "bg-blue-500/10" : "bg-blue-50",
      icon: "text-blue-600",
      accent: "bg-blue-500",
    },

    green: {
      iconBg: isDark ? "bg-green-500/10" : "bg-green-50",
      icon: "text-green-600",
      accent: "bg-green-500",
    },

    purple: {
      iconBg: isDark ? "bg-purple-500/10" : "bg-purple-50",
      icon: "text-purple-600",
      accent: "bg-purple-500",
    },

    orange: {
      iconBg: isDark ? "bg-orange-500/10" : "bg-orange-50",
      icon: "text-orange-600",
      accent: "bg-orange-500",
    },

    red: {
      iconBg: isDark ? "bg-red-500/10" : "bg-red-50",
      icon: "text-red-600",
      accent: "bg-red-500",
    },
  };

  const theme = colors[color] || colors.blue;

  return (
    <div
      className={`stats-card group relative overflow-hidden
        ${
          isDark
            ? "bg-[#111827] border border-slate-800"
            : "bg-white border border-slate-100"
        }`}
    >
      {/* Top Accent */}
      <div className={`absolute top-0 left-0 w-full h-[3px] ${theme.accent}`} />

      <div className="relative flex items-start justify-between gap-4">
        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs md:text-sm font-medium mb-2 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {title}
          </p>

          <p
            className={`text-2xl md:text-3xl font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {value}
          </p>

          {subtitle && (
            <p
              className={`text-xs mt-2 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {subtitle}
            </p>
          )}

          {/* Trend */}
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1.5 mt-3 text-xs font-semibold ${
                trend >= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full ${
                  trend >= 0
                    ? isDark
                      ? "bg-green-500/10"
                      : "bg-green-50"
                    : isDark
                      ? "bg-red-500/10"
                      : "bg-red-50"
                }`}
              >
                {trend >= 0 ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
              </span>

              <span>{Math.abs(trendValue || trend)}% vs last month</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}
          >
            <Icon size={22} className={theme.icon} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
