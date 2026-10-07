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
  LogOut,
  User,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, currentView, setCurrentView, logout, orders } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* LEFT AREA: Mobile Hamburger (LEFT on mobile) + Brand (Logo & Text) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          
          {/* Hamburger Menu on the LEFT for Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
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

        {/* CENTER: Desktop Nav Links (Hidden on Mobile) */}
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

        {/* RIGHT AREA: Cart / Orders Icon moved slightly inward from edge (LEFT) & aligned slightly UP */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-1.5 sm:mr-3 md:mr-4">
          
          {/* Cart / Orders Button (Always on the RIGHT, positioned slightly inward and vertically centered/higher) */}
          <button
            onClick={() => setCurrentView('dashboard')}
            className="relative -translate-y-0.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-200 transition-all cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
            title="My Orders & Cart"
            aria-label="View Cart and Orders"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline text-xs font-mono font-bold text-slate-300">Orders</span>
            <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-mono font-extrabold text-[10px] flex items-center justify-center shadow-lg shrink-0">
              {orders.length}
            </span>
          </button>

          {/* Desktop Auth Controls */}
          {!user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setCurrentView('login')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentView('register')}
                className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Register
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{user.fullName.split(' ')[0]}</span>
              </button>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors border border-slate-800/80 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
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
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('dashboard');
              }}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                currentView === 'dashboard' || currentView === 'store'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-200 hover:text-white'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Redeem Store</span>
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
              <Search className="w-4 h-4" />
              <span>Order Lookup</span>
            </button>
          </nav>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {!user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView('login');
                  }}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView('register');
                  }}
                  className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Register
                </button>
              </>
            ) : (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
                  <span>Signed in as:</span>
                  <span className="text-white font-bold">{user.fullName}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};
