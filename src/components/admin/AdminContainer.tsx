import React from 'react';
import { AdminProvider, useAdmin } from '../../context/AdminContext';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminLayout } from './AdminLayout';

const AdminContent: React.FC = () => {
  const { adminUser, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans select-none relative overflow-hidden">
        {/* Background Neon Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin"></div>
          <p className="text-[11px] font-mono tracking-[0.2em] text-emerald-400 uppercase font-bold">
            Verifying Admin Session...
          </p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLoginPage />;
  }

  return <AdminLayout />;
};

export const AdminContainer: React.FC = () => {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
};
