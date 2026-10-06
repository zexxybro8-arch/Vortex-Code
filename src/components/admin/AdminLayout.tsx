import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { AdminTab } from '../../types/admin';
import { Logo } from '../common/Logo';
import { AdminDashboardTab } from './AdminDashboardTab';
import { AdminProductsTab } from './AdminProductsTab';
import { AdminCategoriesTab } from './AdminCategoriesTab';
import { AdminDenominationsTab } from './AdminDenominationsTab';
import { AdminRedeemCodesTab } from './AdminRedeemCodesTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminCustomersTab } from './AdminCustomersTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Layers,
  Key,
  Receipt,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Globe,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { adminUser, adminTab, setAdminTab, adminLogout } = useAdmin();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const menuItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'customers', label: 'Registered Users', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: 'Products & Pricing', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
    { id: 'denominations', label: 'Denominations', icon: <Layers className="w-4 h-4" /> },
    { id: 'redeem-codes', label: 'Redeem Codes (Stock)', icon: <Key className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders & Sales', icon: <Receipt className="w-4 h-4" /> },
    { id: 'settings', label: 'Admin Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 h-16 flex items-center px-4 sm:px-6">
        <div className="w-full flex items-center justify-between">
          
          {/* Mobile Hamburger Button + Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800"
              aria-label="Toggle Navigation Sidebar"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Logo size="sm" showSubtitle={true} />

            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md ml-2">
              ADMIN CONSOLE
            </span>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/dashboard');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 py-1 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all ml-2 cursor-pointer"
              title="Visit Customer Storefront"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>User Store</span>
            </button>
          </div>

          {/* Admin Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white">{adminUser?.name || 'Administrator'}</span>
              <span className="text-[10px] text-emerald-400 font-mono">{adminUser?.role || 'Super Admin'}</span>
            </div>

            <button
              onClick={adminLogout}
              className="py-1.5 px-3 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* BODY WITH FIXED SIDEBAR AND MAIN CONTENT */}
      <div className="flex-1 flex relative">
        
        {/* DESKTOP FIXED SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900/90 border-r border-slate-800 p-4 shrink-0 min-h-[calc(100vh-64px)] sticky top-16 h-[calc(100vh-64px)] justify-between">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
              ADMIN MENU
            </div>

            {menuItems.map((item) => {
              const isActive = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setAdminTab(item.id)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-950" />}
                </button>
              );
            })}
          </nav>

          {/* Bottom Security Info */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Isolated Admin Portal</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Isolated session separate from customer portal.
            </p>
          </div>
        </aside>

        {/* MOBILE OVERLAY SIDEBAR */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setIsMobileSidebarOpen(false)}
            ></div>

            <div className="relative w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between z-10">
              <nav className="space-y-1">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-2">
                  <span className="text-xs font-bold text-white font-mono">ADMIN NAVIGATION</span>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {menuItems.map((item) => {
                  const isActive = adminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setAdminTab(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-400 text-slate-950'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <button
                onClick={adminLogout}
                className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
          {adminTab === 'dashboard' && <AdminDashboardTab />}
          {adminTab === 'customers' && <AdminCustomersTab />}
          {adminTab === 'products' && <AdminProductsTab />}
          {adminTab === 'categories' && <AdminCategoriesTab />}
          {adminTab === 'denominations' && <AdminDenominationsTab />}
          {adminTab === 'redeem-codes' && <AdminRedeemCodesTab />}
          {adminTab === 'orders' && <AdminOrdersTab />}
          {adminTab === 'settings' && <AdminSettingsTab />}
        </main>

      </div>

    </div>
  );
};
