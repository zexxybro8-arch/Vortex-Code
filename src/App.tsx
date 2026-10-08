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
        
        <AuthRequiredModal />
        <ToastContainer />
        <TelegramFloatingButton />

        {/* Minimal Branding Footer */}
        <footer className="py-8 px-4 text-center text-slate-500 text-[11px] font-mono">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-extrabold text-white tracking-wider">VORTEX CODE</span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400 font-bold tracking-wide">TRUSTED BY THOUSANDS</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
