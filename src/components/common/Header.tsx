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
  const { user, currentView, setCurrentView, setDashboardTab, logout, orders } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myOrdersModalOpen, setMyOrdersModalOpen] = useState(false);

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

        {/* Navigation Menu Drawer (Opened via 3-line Menu) */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCurrentView('landing');
                }}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  currentView === 'landing'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>HOME</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('redeem-code');
                  setCurrentView('dashboard');
                }}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  currentView === 'dashboard' || currentView === 'store'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4 text-emerald-400" />
                <span>REDEEM STORE</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCurrentView('order-lookup');
                }}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  currentView === 'order-lookup'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4 text-emerald-400" />
                <span>ORDER LOOKUP</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('redeem-code');
                  setCurrentView('dashboard');
                }}
                className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Key className="w-4 h-4 text-emerald-400" />
                <span>REDEEM CODE</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('how-to-redeem');
                  setCurrentView('dashboard');
                }}
                className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>HOW TO REDEEM</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDashboardTab('support');
                  setCurrentView('dashboard');
                }}
                className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SUPPORT</span>
              </button>
            </nav>

            {/* Account section */}
            {user && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="px-2 text-xs font-mono text-slate-400">
                  <span>ACCOUNT</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400">
                  <span>CUSTOMER ID:</span>
                  <span className="text-white">{user.customerId}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>SIGN OUT</span>
                </button>
              </div>
            )}
          </div>
        )}

      </header>

      <MyOrdersModal
        isOpen={myOrdersModalOpen}
        onClose={() => setMyOrdersModalOpen(false)}
      />
    </>
  );
};
