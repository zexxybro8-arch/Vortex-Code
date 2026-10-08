import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, setCurrentView, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamically load Google Identity Services (GSI) script on component mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: '412099378603-nh2kva25qtq5jbajf7n49denqmj6evcf.apps.googleusercontent.com',
          callback: async (response: any) => {
            try {
              setErrorMessage('');
              await loginWithGoogle(response.credential);
            } catch (err: any) {
              setErrorMessage(err.message || 'Google authentication cancelled or failed.');
            }
          },
        });

        // Renders standard, highly professional, secure Google branded button
        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn-container'),
          {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
          }
        );
      }
    };

    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (err) {
        // Safe fallback in case script was already unmounted
      }
    };
  }, [loginWithGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email/username or password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Neon Subtle Radial Glowing Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-emerald-600/5 rounded-full blur-[90px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Top Header branding lockup */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" showSubtitle={true} />
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden neon-glow">
          
          {/* Subtle top ambient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"></div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Sign in to access your orders and digital rewards.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <span className="shrink-0 text-base">⚠️</span>
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Input 1: Email or Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Email or Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Input 2: Password with Show/Hide toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options: Remember me & Forgot Password? */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer accent-emerald-500"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setCurrentView('forgot-password')}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Main Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex py-1 items-center justify-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest">──────── OR ────────</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Secure Google Login Button */}
          <div className="relative w-full pt-1">
            {/* Custom Button UI */}
            <div className="w-full h-[52px] sm:h-[56px] rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center gap-3 text-sm font-medium text-slate-100 transition-all active:scale-[0.98] hover:border-emerald-500/50 hover:bg-slate-900 shadow-sm relative z-0">
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span>Continue with Google</span>
            </div>

            {/* Standard GSI Button Overlay (Invisible but functional) */}
            <div id="google-signin-btn-container" className="absolute top-0 left-0 w-full h-full opacity-0 z-10 cursor-pointer"></div>
          </div>

          {/* Below link: Register Page */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <span>Don't have an account?</span>
            <button
              onClick={() => setCurrentView('register')}
              className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors hover:underline"
            >
              Create Account
            </button>
          </div>

        </div>

        {/* Subtle security message */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
          <span>🔒 Your account information is securely protected.</span>
        </div>

      </div>
    </div>
  );
};
