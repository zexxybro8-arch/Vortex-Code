import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Settings, Save, ShieldCheck, Mail, Globe, Bell, CreditCard, Key, Copy, Check, ExternalLink } from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const { storeSettings, updateStoreSettings } = useAdmin();

  const [storeName, setStoreName] = useState(storeSettings.storeName || 'VORTEX CODE');
  const [subtitle, setSubtitle] = useState(storeSettings.subtitle || 'SECURE DIGITAL STORE');
  const [supportEmail, setSupportEmail] = useState(storeSettings.supportEmail || 'support@vortexcode.com');
  const [currencySymbol, setCurrencySymbol] = useState(storeSettings.currencySymbol || '₹');
  const [enableAutoFulfillment, setEnableAutoFulfillment] = useState(storeSettings.enableAutoFulfillment ?? true);

  // FamGateway Credentials & Domain URLs
  const [famupigatewayBaseUrl, setFamupigatewayBaseUrl] = useState(
    storeSettings.famupigatewayBaseUrl || 'https://famupigateway.site/api'
  );
  const [famupigatewayApiKey, setFamupigatewayApiKey] = useState(storeSettings.famupigatewayApiKey || '');
  const [famupigatewayWebhookSecret, setFamupigatewayWebhookSecret] = useState(
    storeSettings.famupigatewayWebhookSecret || ''
  );
  const [famupigatewayExpiryMinutes, setFamupigatewayExpiryMinutes] = useState(
    storeSettings.famupigatewayExpiryMinutes || 5
  );
  const [appUrl, setAppUrl] = useState(storeSettings.appUrl || 'https://vortexcode.shop');

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state if storeSettings loads or updates asynchronously
  useEffect(() => {
    if (storeSettings) {
      if (storeSettings.storeName) setStoreName(storeSettings.storeName);
      if (storeSettings.subtitle) setSubtitle(storeSettings.subtitle);
      if (storeSettings.supportEmail) setSupportEmail(storeSettings.supportEmail);
      if (storeSettings.currencySymbol) setCurrencySymbol(storeSettings.currencySymbol);
      if (storeSettings.enableAutoFulfillment !== undefined) setEnableAutoFulfillment(storeSettings.enableAutoFulfillment);
      if (storeSettings.famupigatewayBaseUrl) setFamupigatewayBaseUrl(storeSettings.famupigatewayBaseUrl);
      if (storeSettings.famupigatewayApiKey !== undefined) setFamupigatewayApiKey(storeSettings.famupigatewayApiKey);
      if (storeSettings.famupigatewayWebhookSecret !== undefined) setFamupigatewayWebhookSecret(storeSettings.famupigatewayWebhookSecret);
      if (storeSettings.famupigatewayExpiryMinutes) setFamupigatewayExpiryMinutes(storeSettings.famupigatewayExpiryMinutes);
      if (storeSettings.appUrl) setAppUrl(storeSettings.appUrl);
    }
  }, [storeSettings]);

  const cleanAppUrl = (appUrl || 'https://vortexcode.shop').trim().replace(/\/$/, '');
  const calculatedWebhookUrl = `${cleanAppUrl}/api/payment/webhook`;
  const calculatedCallbackUrl = `${cleanAppUrl}/api/payment/callback`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(calculatedWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(calculatedCallbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings({
      storeName,
      subtitle,
      supportEmail,
      currencySymbol,
      enableAutoFulfillment,
      famupigatewayBaseUrl,
      famupigatewayApiKey,
      famupigatewayWebhookSecret,
      famupigatewayExpiryMinutes,
      appUrl,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Store Configuration & Payment Gateway Settings</h1>
          <p className="text-xs text-slate-400">Configure global store branding, FamGateway production API credentials, and webhook integration endpoints.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* 1. FAMGATEWAY API INTEGRATION SETTINGS */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/10 border-b border-l border-emerald-500/30 rounded-bl-xl text-[10px] font-mono text-emerald-400 font-bold">
            LIVE INTEGRATION
          </div>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>FamGateway Payment Credentials</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                FamGateway Base API URL <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={famupigatewayBaseUrl}
                onChange={(e) => setFamupigatewayBaseUrl(e.target.value)}
                placeholder="https://famupigateway.site/api"
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Default API Endpoint: <code className="text-slate-400">https://famupigateway.site/api</code></p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Server-Side API Key (<code className="text-emerald-400">FAMUPIGATEWAY_API_KEY</code>) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={famupigatewayApiKey}
                  onChange={(e) => setFamupigatewayApiKey(e.target.value)}
                  placeholder="Paste your FamGateway API Key here..."
                  className="w-full py-2.5 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {famupigatewayApiKey.trim() ? (
                  <span className="text-emerald-400 font-bold">✓ Active API Key configured! Transactions will route through live FamGateway.</span>
                ) : (
                  <span className="text-amber-400 font-bold">⚠️ Enter your server API key above to enable real-time payment gateway processing.</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Webhook Secret (<code className="text-slate-400">Optional</code>)
              </label>
              <input
                type="text"
                value={famupigatewayWebhookSecret}
                onChange={(e) => setFamupigatewayWebhookSecret(e.target.value)}
                placeholder="FamGateway Webhook Secret..."
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Link Expiry (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={famupigatewayExpiryMinutes}
                onChange={(e) => setFamupigatewayExpiryMinutes(Number(e.target.value))}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Website Domain & Webhook Copy Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Application Domain URL (<code className="text-emerald-400">APP_URL</code>)
              </label>
              <input
                type="text"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://vortexcode.shop"
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Primary production URL of your store (e.g. <code className="text-slate-300">https://vortexcode.shop</code>)
              </p>
            </div>

            {/* Calculated Webhook Endpoint Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Webhook Notification Endpoint URL</span>
                <span className="text-[10px] text-emerald-400 font-mono">POST Request</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-emerald-300 truncate flex-1">{calculatedWebhookUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="py-1 px-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] rounded transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Paste this Webhook URL into your FamGateway dashboard under Notification / Webhook Settings.
              </p>
            </div>

            {/* Calculated Callback Endpoint Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Payment Callback / Redirect Endpoint URL</span>
                <span className="text-[10px] text-teal-400 font-mono">GET Redirect</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-teal-300 truncate flex-1">{calculatedCallbackUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyCallback}
                  className="py-1 px-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-[11px] rounded transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedCallback ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCallback ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
        
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
              <span>Configurations updated and saved to database successfully!</span>
            </span>
          ) : (
            <span></span>
          )}

          <button
            type="submit"
            className="py-3.5 px-7 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configurations</span>
          </button>
        </div>

      </form>

    </div>
  );
};
