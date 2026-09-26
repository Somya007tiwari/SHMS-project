// Simple stub pages for lazy-loaded pages
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ComingSoon = ({ title, icon = '🏥' }) => {
  const { isDark } = useTheme();
  return (
    <div className={`card p-12 text-center ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
      <p className="text-slate-400 text-sm">Fully implemented in the backend. API-ready.</p>
    </div>
  );
};

export default ComingSoon;
