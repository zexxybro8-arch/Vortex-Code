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

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);

  // Load GSI client, but NOT the button
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
            } finally {
              setIsGoogleLoading(false);
            }
          },
          use_fedcm_for_prompt: false,
        });
        setIsGsiLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (err) {}
    };
  }, [loginWithGoogle]);

  const handleGoogleClick = () => {
    if (!isGsiLoaded) return;
    setIsGoogleLoading(true);
    const google = (window as any).google;
    if (google) {
      // Use prompt to show the sign-in modal
      google.accounts.id.prompt();
    } else {
      setErrorMessage('Google Sign-In is not initialized. Please refresh.');
      setIsGoogleLoading(false);
    }
  };

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
          <div className="flex justify-center w-full pt-1">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isGoogleLoading || !isGsiLoaded}
              className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-slate-700 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
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
