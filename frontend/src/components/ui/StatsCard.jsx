import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue }) => {
  const { isDark } = useTheme();

  const gradients = {
    blue: 'from-blue-500 to-blue-700',
    teal: 'from-teal-500 to-teal-700',
    green: 'from-green-500 to-green-700',
    purple: 'from-purple-500 to-purple-700',
    orange: 'from-orange-500 to-orange-700',
    red: 'from-red-500 to-red-700',
  };

  const bgColors = {
    blue: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
    teal: isDark ? 'bg-teal-900/20' : 'bg-teal-50',
    green: isDark ? 'bg-green-900/20' : 'bg-green-50',
    purple: isDark ? 'bg-purple-900/20' : 'bg-purple-50',
    orange: isDark ? 'bg-orange-900/20' : 'bg-orange-50',
    red: isDark ? 'bg-red-900/20' : 'bg-red-50',
  };

  return (
    <div className={`stats-card relative overflow-hidden animate-fade-in
      ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
      
      {/* Background decoration */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br ${gradients[color]}`} />
      <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-5 bg-gradient-to-br ${gradients[color]}`} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{title}</p>
          <p className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</p>
          {subtitle && (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold
              ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trendValue || trend)}% vs last month
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-xl ${bgColors[color]}`}>
            <Icon size={24} className={`text-${color}-500`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
