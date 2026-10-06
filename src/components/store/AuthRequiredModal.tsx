import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, ShieldAlert, X, LogIn, UserPlus } from 'lucide-react';

export const AuthRequiredModal: React.FC = () => {
  const {
    authRequiredModalOpen,
    setAuthRequiredModalOpen,
    restrictedActionAttempted,
    setCurrentView,
  } = useAuth();

  if (!authRequiredModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative neon-glow">
        
        {/* Close Button */}
        <button
          onClick={() => setAuthRequiredModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-white tracking-tight">Authentication Required</h3>
            <p className="text-xs text-emerald-400/90 font-medium font-mono uppercase tracking-wider">
              {restrictedActionAttempted || 'Private Customer Vault Access'}
            </p>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            You are currently browsing as <strong className="text-amber-400">Guest</strong>. To claim digital redeem keys, track instant orders, and view private code secrets, please sign in or create an account.
          </p>

          <div className="w-full pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setAuthRequiredModalOpen(false);
                setCurrentView('login');
              }}
              className="py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In Now</span>
            </button>

            <button
              onClick={() => {
                setAuthRequiredModalOpen(false);
                setCurrentView('register');
              }}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Register Account</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            🔒 Account credentials remain strictly encrypted and confidential.
          </p>
        </div>

      </div>
    </div>
  );
};
