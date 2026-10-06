import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from './Logo';
import {
  ShoppingBag,
  Menu,
  X,
  Home,
  Ticket,
  Search,
  KeyRound,
  LogOut,
  UserCheck,
  Shield,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, currentView, setCurrentView, logout, orders } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
        
        {/* Left: Brand logo + name + "DIGITAL REWARDS PLATFORM" subtitle */}
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            setCurrentView('landing');
          }}
          className="focus:outline-none rounded-xl cursor-pointer text-left shrink-0"
        >
          <Logo size="sm" showSubtitle={false} />
          <span className="block text-[9px] font-mono font-bold tracking-widest text-emerald-400/90 uppercase -mt-0.5">
            DIGITAL REWARDS PLATFORM
          </span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <button
            onClick={() => setCurrentView('landing')}
            className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'landing' ? 'text-emerald-400 font-bold' : ''
            }`}
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setCurrentView('dashboard')}
            className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'dashboard' || currentView === 'store' ? 'text-emerald-400 font-bold' : ''
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-emerald-400" />
            <span>Redeem Store</span>
          </button>

          <button
            onClick={() => setCurrentView('order-lookup')}
            className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'order-lookup' ? 'text-emerald-400 font-bold' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Order Lookup</span>
          </button>
        </nav>

        {/* Right Header Controls: Orders/Cart Icon + Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Orders Icon - VISIBLE ONLY AFTER AUTHENTICATED LOGIN */}
          {user && (
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-200 transition-all cursor-pointer relative shadow-md flex items-center gap-2"
              title="My Orders & Vault"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline text-xs font-mono font-bold text-slate-300">My Orders</span>
              <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-mono font-extrabold text-[10px] flex items-center justify-center shadow-lg">
                {orders.length}
              </span>
            </button>
          )}

          {/* Auth Buttons for Logged-Out Users */}
          {!user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('login')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentView('register')}
                className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Get Started
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors border border-slate-800/80 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {/* Mobile Slide Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-950/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('landing');
              }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-emerald-400 flex items-center gap-2"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('dashboard');
              }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-emerald-400 flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>Redeem Store</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('order-lookup');
              }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-emerald-400 flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Order Lookup</span>
            </button>
          </nav>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {!user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView('login');
                  }}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView('register');
                  }}
                  className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Get Started
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.fullName})</span>
              </button>
            )}
          </div>
        </div>
      )}

    </header>
  );
};
