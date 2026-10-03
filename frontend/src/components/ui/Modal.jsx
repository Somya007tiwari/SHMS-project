import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  const { isDark } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size] || 'max-w-lg'} rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col my-auto
          ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0
          ${isDark ? 'border-gray-700' : 'border-slate-100'}`}>
          <h2 id="modal-title" className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`p-2 rounded-xl transition-all min-w-[36px] min-h-[36px] flex items-center justify-center
              ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`p-4 sm:p-6 border-t flex flex-wrap items-center justify-end gap-2.5 flex-shrink-0
            ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
