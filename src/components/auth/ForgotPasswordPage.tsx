import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset, setCurrentView, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid account email address.');
      return;
    }

    try {
      await requestPasswordReset(email.trim());
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send reset link. Try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Neon Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" showSubtitle={true} />
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden neon-glow">
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"></div>

          {!isSubmitted ? (
            <>
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Enter your registered account email address to receive a secure recovery link.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <span className="shrink-0 text-base">⚠️</span>
                  <p>{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@vortexcode.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Send Reset Link Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success confirmation card */
            <div className="text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-400/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Reset Link Dispatched</h2>
                <p className="text-xs text-slate-300 leading-relaxed px-2">
                  We've sent password reset instructions to <strong className="text-emerald-300 font-mono">{email}</strong>. Please follow the instructions in the email to securely update your password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline cursor-pointer"
              >
                Need to try a different email?
              </button>
            </div>
          )}

          {/* Back to Sign In Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              onClick={() => setCurrentView('login')}
              className="text-xs text-slate-300 hover:text-emerald-400 font-medium transition-colors inline-flex items-center gap-1.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Sign In</span>
            </button>
          </div>

        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
          <span>🔒 256-bit SSL encrypted reset protocol.</span>
        </div>

      </div>
    </div>
  );
};
