import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Zap, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView } = useAuth();

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans selection:bg-emerald-500/30 selection:text-emerald-300 py-16 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-4xl mx-auto text-center space-y-8 my-auto">
        
        {/* Small badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase shadow-xl shadow-emerald-950/40">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>⚡ SECURE DIGITAL REWARDS STORE</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Get Your Digital Rewards{' '}
          <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            Fast & Secure
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Purchase digital redeem codes through a simple, secure and reliable checkout experience.
        </p>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => setCurrentView('register')}
            className="w-full sm:w-auto py-4 px-8 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setCurrentView('login')}
            className="w-full sm:w-auto py-4 px-8 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In to Existing Account</span>
          </button>
        </div>

      </section>

      {/* Clean vertical spacing before footer */}
      <div className="h-12 md:h-20"></div>

    </div>
  );
};
