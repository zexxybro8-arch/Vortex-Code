import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Settings, Save, ShieldCheck, Mail, Globe, Bell } from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const { storeSettings, updateStoreSettings } = useAdmin();

  const [storeName, setStoreName] = useState(storeSettings.storeName);
  const [subtitle, setSubtitle] = useState(storeSettings.subtitle);
  const [supportEmail, setSupportEmail] = useState(storeSettings.supportEmail);
  const [currencySymbol, setCurrencySymbol] = useState(storeSettings.currencySymbol);
  const [enableAutoFulfillment, setEnableAutoFulfillment] = useState(storeSettings.enableAutoFulfillment);

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings({
      storeName,
      subtitle,
      supportEmail,
      currencySymbol,
      enableAutoFulfillment,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Store Configuration & Settings</h1>
          <p className="text-xs text-slate-400">Configure global store branding, support contacts, and automated fulfillment rules.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* General Store Identity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Store Identity & Branding</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Subtitle / Tagline</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                required
              />
            </div>
          </div>
        </div>

        {/* Support & Currency Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Support Contact & Regional Currency</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Support Email Address</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Currency</label>
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              >
                <option value="₹">₹ (Indian Rupee - INR)</option>
                <option value="$">$ (US Dollar - USD)</option>
                <option value="€">€ (Euro - EUR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fulfillment & Notifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>Fulfillment & Notifications</span>
          </h2>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">Instant Code Key Auto-Fulfillment</h3>
              <p className="text-[11px] text-slate-400">Automatically deliver 16-digit redeem codes upon order confirmation.</p>
            </div>

            <button
              type="button"
              onClick={() => setEnableAutoFulfillment(!enableAutoFulfillment)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all ${
                enableAutoFulfillment
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {enableAutoFulfillment ? 'ACTIVE' : 'PAUSED'}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          {isSaved ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Settings updated successfully!</span>
            </span>
          ) : (
            <span></span>
          )}

          <button
            type="submit"
            className="py-3 px-6 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configurations</span>
          </button>
        </div>

      </form>

    </div>
  );
};
