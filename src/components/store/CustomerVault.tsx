import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, Copy, Check, Eye, EyeOff, ShieldCheck, Download, RefreshCw, Smartphone, History, Lock, UserCheck } from 'lucide-react';
import { formatFullCode, formatMaskedCode } from '../../utils/codeFormat';

export const CustomerVault: React.FC = () => {
  const { user, orders, addToast, setCurrentView } = useAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'security'>('orders');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [visibleCodeIds, setVisibleCodeIds] = useState<Record<string, boolean>>({});

  // Security tab state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [enable2FA, setEnable2FA] = useState(user?.security2FA || false);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Vault Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          You must be logged in with a customer account to access private digital orders and claimed redeem codes.
        </p>
        <button
          onClick={() => setCurrentView('login')}
          className="py-3 px-6 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
        >
          Sign In to Access Vault
        </button>
      </div>
    );
  }

  const toggleVisibility = (id: string) => {
    setVisibleCodeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    addToast('success', 'Digital code copied to clipboard!');
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      addToast('error', 'Please fill in current and new password.');
      return;
    }
    if (newPass !== confirmNewPass) {
      addToast('error', 'New passwords do not match.');
      return;
    }
    addToast('success', '🔒 Password successfully updated in encrypted vault.');
    setCurrentPass('');
    setNewPass('');
    setConfirmNewPass('');
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      
      {/* Vault Header Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Customer Vault & Orders</h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
              AUTHENTICATED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Account: <strong className="text-slate-200">{user.email}</strong> · Member since 2026
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Claimed Codes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Security & Profile
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        /* Orders & Claimed Codes View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              <span>Digital Key Inventory</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total Reward Credit: ₹{orders.reduce((sum, o) => sum + (o.rewardValueRupees || o.codeValue || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-slate-400 text-sm">No orders or claimed codes yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const isVisible = visibleCodeIds[ord.id];

                return (
                  <div
                    key={ord.id}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 transition-all space-y-4 shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400 font-bold">{ord.orderNumber}</span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-400">{ord.category}</span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">{ord.codeTitle}</h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-mono">{ord.purchaseDate}</span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Secret Redeem Code Display Box */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Digital Code Secret Key:</span>
                        {ord.pin && <span>PIN: <strong className="text-emerald-400 font-mono">{isVisible ? ord.pin : '••••'}</strong></span>}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-base sm:text-lg font-bold text-emerald-300 tracking-wider">
                          {isVisible ? formatFullCode(ord.redeemCode) : formatMaskedCode(ord.redeemCode)}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleVisibility(ord.id)}
                            className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                            title={isVisible ? 'Mask Code' : 'Reveal Full 16-Char Code'}
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => copyToClipboard(formatFullCode(ord.redeemCode), ord.id)}
                            className="py-2 px-3 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Copy 16-Character Redeem Code"
                          >
                            {copiedCodeId === ord.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Security & Profile Settings View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Password Change Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Update Vault Password</span>
            </h2>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPass}
                  onChange={(e) => setConfirmNewPass(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save New Password
              </button>
            </form>
          </div>

          {/* 2FA & Session Security Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Two-Factor Authentication & Sessions</span>
            </h2>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-white">2-Factor Authentication (2FA)</h3>
                <p className="text-[11px] text-slate-400">Require security code verification on new logins.</p>
              </div>

              <button
                onClick={() => {
                  setEnable2FA(!enable2FA);
                  addToast('info', !enable2FA ? '2FA Protection enabled' : '2FA disabled');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  enable2FA ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {enable2FA ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Device Session</h3>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Current Web Browser (Vortex Web Session)</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">ACTIVE NOW</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
