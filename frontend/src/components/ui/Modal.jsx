import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  const { isDark } = useTheme();
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col
          ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b
          ${isDark ? 'border-gray-700' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all
              ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`p-6 border-t flex items-center justify-end gap-3
            ${isDark ? 'border-gray-700' : 'border-slate-100'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
