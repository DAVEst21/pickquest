import React from 'react';

interface ToastProps {
  visible: boolean;
  message: string;
  icon?: string;
}

export const Toast: React.FC<ToastProps> = ({ visible, message, icon = 'check_circle' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 right-gutter z-50 transform transition-all duration-300 bg-surface-container-high text-on-surface px-space-lg py-space-md rounded-xl shadow-2xl flex items-center gap-space-sm border border-outline-variant/40 ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <span className="font-body-md text-body-md font-semibold">{message}</span>
    </div>
  );
};
