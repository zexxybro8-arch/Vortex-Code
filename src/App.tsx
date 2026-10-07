import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { CustomerDashboard } from './components/dashboard/CustomerDashboard';
import { CustomerVault } from './components/store/CustomerVault';
import { OrderLookupPage } from './components/store/OrderLookupPage';
import { AuthRequiredModal } from './components/store/AuthRequiredModal';
import { ToastContainer } from './components/common/Toast';
import { TelegramFloatingButton } from './components/common/TelegramFloatingButton';
import { AdminContainer } from './components/admin/AdminContainer';

const checkIsAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    path.startsWith('/developer') ||
    search.includes('developer') ||
    search.includes('route=/developer') ||
    hash.includes('developer')
  );
};

const CustomerMainContent: React.FC = () => {
  const { currentView, user, setCurrentView } = useAuth();

  // Route protection for customer vault
  useEffect(() => {
    if (currentView === 'vault' && !user) {
      setCurrentView('login');
    }
  }, [currentView, user, setCurrentView]);

  return (
    <main className="flex-1">
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'login' && <LoginPage />}
      {currentView === 'register' && <RegisterPage />}
      {currentView === 'forgot-password' && <ForgotPasswordPage />}
      {(currentView === 'dashboard' || currentView === 'store') && <CustomerDashboard />}
      {currentView === 'vault' && <CustomerVault />}
      {currentView === 'order-lookup' && <OrderLookupPage />}
    </main>
  );
};

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };

    // Initialize and run on mount to detect routing immediately
    handleRouteChange();

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  if (isAdminRoute) {
    return <AdminContainer />;
  }

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
        <Header />
        <CustomerMainContent />
        
        {/* CUSTOMER FOOTER */}
        <footer className="border-t border-slate-900 bg-slate-950/95 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Left: Brand */}
            <div className="space-y-1 text-center md:text-left">
              <div className="font-extrabold text-sm text-white font-mono tracking-wider">
                VORTEX<span className="text-emerald-400">CODE</span>
              </div>
              <p className="text-[11px] text-slate-500">Secure Digital Store</p>
            </div>

            {/* Middle Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300 font-medium">
              <FooterLink target="landing">Home</FooterLink>
              <FooterLink target="dashboard">Redeem Store</FooterLink>
              <FooterLink target="order-lookup">Order Lookup</FooterLink>
              <FooterLink target="dashboard">Support</FooterLink>
              <FooterLink target="register">Terms</FooterLink>
              <FooterLink target="register">Privacy</FooterLink>
            </div>

            {/* Right: Copyright */}
            <div className="text-slate-500 text-[11px] text-center md:text-right">
              © 2026 VORTEX CODE. All rights reserved.
            </div>

          </div>
        </footer>

        <AuthRequiredModal />
        <ToastContainer />
        <TelegramFloatingButton />
      </div>
    </AuthProvider>
  );
}

const FooterLink: React.FC<{ target: any; children: React.ReactNode }> = ({ target, children }) => {
  const { setCurrentView } = useAuth();
  return (
    <button
      onClick={() => setCurrentView(target)}
      className="hover:text-emerald-400 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
};
