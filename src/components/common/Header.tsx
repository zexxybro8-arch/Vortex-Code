import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from './Logo';
import { MyOrdersModal } from './MyOrdersModal';
import {
  ShoppingBag,
  Menu,
  X,
  Home,
  Ticket,
  Search,
  Key,
  HelpCircle,
  ShieldCheck,
  LogOut,
  User,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, currentView, setCurrentView, dashboardTab, setDashboardTab, logout, orders } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myOrdersModalOpen, setMyOrdersModalOpen] = useState(false);

  // Lock body scroll when mobile menu drawer is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 shadow-2xl transition-all">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LEFT AREA: Hamburger Menu + Brand (Logo & Text) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink">
            
            {/* Hamburger Menu on the LEFT (Visible on all screens) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo & Brand Name & Subtitle without any frame or container */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('landing');
              }}
              className="focus:outline-none rounded-xl cursor-pointer text-left shrink min-w-0 flex items-center"
            >
              <Logo size="sm" showSubtitle={true} />
            </button>
          </div>

          {/* RIGHT AREA: Customer ID Box + Cart/Orders Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-1.5 sm:mr-3 md:mr-4">
            
            {/* Customer ID Box (Immediately to the LEFT of Cart when logged in) */}
            {user && user.customerId && (
              <div className="flex items-center px-2.5 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs shadow-md tracking-wider shrink-0">
                {user.customerId}
              </div>
            )}

            {/* Cart / Orders Button (Always on the RIGHT) */}
            <button
              onClick={() => setMyOrdersModalOpen(true)}
              className="relative -translate-y-0.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-200 transition-all cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
              title="My Orders & Redemption History"
              aria-label="View My Orders and Redemption History"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden lg:inline text-xs font-mono font-bold text-slate-300">Orders</span>
              <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-mono font-extrabold text-[10px] flex items-center justify-center shadow-lg shrink-0">
                {orders.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Left Side Slide-Out Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Dark Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Dark Slide-out Drawer Panel */}
          <div className="relative w-[65vw] max-w-[380px] min-w-[280px] h-full bg-slate-950/98 border-r border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            
            {/* Top Header Row */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-emerald-400">
                Navigation
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/20 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <div className="flex-1 overflow-y-auto py-5 px-4 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 min-h-0">
              
              {/* 1. HOME */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCurrentView('landing');
                }}
                className={`w-full h-14 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition-all cursor-pointer border ${
                  currentView === 'landing'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <Home className={`w-4 h-4 shrink-0 ${currentView === 'landing' ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>HOME</span>
              </button>

              {/* 2. REDEEM CODE STORE */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('redeem-code');
                  setCurrentView('dashboard');
                }}
                className={`w-full h-14 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition-all cursor-pointer border ${
                  (currentView === 'dashboard' && dashboardTab === 'redeem-code') || currentView === 'store'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <ShoppingBag className={`w-4 h-4 shrink-0 ${((currentView === 'dashboard' && dashboardTab === 'redeem-code') || currentView === 'store') ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>REDEEM CODE STORE</span>
              </button>

              {/* 3. ORDER LOOKUP */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCurrentView('order-lookup');
                }}
                className={`w-full h-14 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition-all cursor-pointer border ${
                  currentView === 'order-lookup'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <Search className={`w-4 h-4 shrink-0 ${currentView === 'order-lookup' ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>ORDER LOOKUP</span>
              </button>

              {/* 5. HOW TO REDEEM */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('how-to-redeem');
                  setCurrentView('dashboard');
                }}
                className={`w-full h-14 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition-all cursor-pointer border ${
                  currentView === 'dashboard' && dashboardTab === 'how-to-redeem'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <HelpCircle className={`w-4 h-4 shrink-0 ${currentView === 'dashboard' && dashboardTab === 'how-to-redeem' ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>HOW TO REDEEM</span>
              </button>

              {/* 6. SUPPORT */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('support');
                  setCurrentView('dashboard');
                }}
                className={`w-full h-14 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition-all cursor-pointer border ${
                  currentView === 'dashboard' && dashboardTab === 'support'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${currentView === 'dashboard' && dashboardTab === 'support' ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>SUPPORT</span>
              </button>
            </div>

            {/* Bottom Sticky Section for Customer ID & Logout */}
            {user && (
              <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0 space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/20 text-xs font-mono font-bold text-slate-200">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Customer ID:</span>
                  <span className="text-white font-extrabold tracking-wider">{user.customerId}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full h-12 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>SIGN OUT</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      <MyOrdersModal
        isOpen={myOrdersModalOpen}
        onClose={() => setMyOrdersModalOpen(false)}
      />
    </>
  );
};
