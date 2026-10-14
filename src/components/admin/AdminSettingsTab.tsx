import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Settings, Save, ShieldCheck, Mail, Globe, Bell, CreditCard, Key, Copy, Check, ExternalLink } from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const { storeSettings, updateStoreSettings } = useAdmin();

  const [storeName, setStoreName] = useState(storeSettings.storeName || 'VORTEX CODE');
  const [subtitle, setSubtitle] = useState(storeSettings.subtitle || 'SECURE DIGITAL STORE');
  const [diamondCategoryLabel, setDiamondCategoryLabel] = useState(storeSettings.diamondCategoryLabel || 'DIAMONDS');
  const [diamondProductLabel, setDiamondProductLabel] = useState(storeSettings.diamondProductLabel || 'DIAMONDS');
  const [supportEmail, setSupportEmail] = useState(storeSettings.supportEmail || 'support@vortexcode.com');
  const [currencySymbol, setCurrencySymbol] = useState(storeSettings.currencySymbol || '₹');
  const [enableAutoFulfillment, setEnableAutoFulfillment] = useState(storeSettings.enableAutoFulfillment ?? true);
  const [defaultOpeningCategory, setDefaultOpeningCategory] = useState(storeSettings.defaultOpeningCategory || 'REDEEM CODE');



  const [appUrl, setAppUrl] = useState(storeSettings.appUrl || 'https://vortexcode.shop');

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isInitializedRef = React.useRef(false);

  // Sync state ONLY ONCE upon initial load to prevent background polling from overwriting user typing
  useEffect(() => {
    if (storeSettings && !isInitializedRef.current) {
      if (storeSettings.storeName) setStoreName(storeSettings.storeName);
      if (storeSettings.subtitle) setSubtitle(storeSettings.subtitle);
      if (storeSettings.diamondCategoryLabel) setDiamondCategoryLabel(storeSettings.diamondCategoryLabel);
      if (storeSettings.diamondProductLabel) setDiamondProductLabel(storeSettings.diamondProductLabel);
      if (storeSettings.supportEmail) setSupportEmail(storeSettings.supportEmail);
      if (storeSettings.currencySymbol) setCurrencySymbol(storeSettings.currencySymbol);
      if (storeSettings.enableAutoFulfillment !== undefined) setEnableAutoFulfillment(storeSettings.enableAutoFulfillment);
      if (storeSettings.defaultOpeningCategory) setDefaultOpeningCategory(storeSettings.defaultOpeningCategory);
      if (storeSettings.appUrl) setAppUrl(storeSettings.appUrl);

      // Mark as initialized so subsequent 3-second background polling ticks don't wipe out typed inputs
      isInitializedRef.current = true;
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
      diamondCategoryLabel,
      diamondProductLabel,
      supportEmail,
      currencySymbol,
      enableAutoFulfillment,
      defaultStoreCategory: defaultOpeningCategory,
      defaultOpeningCategory,
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
          <p className="text-xs text-slate-400">Configure global store branding, application domain, and webhook endpoints.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* A. API / ENDPOINT SETTINGS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>API / Endpoint Settings</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
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
          </div>

          {/* Website Domain & Webhook Copy Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-4">
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
                Webhook URL reserved for your future payment gateway dashboard notification settings.
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

        {/* B. TRUST GATEWAY UPI CONFIGURATION CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Trust Gateway UPI Integration</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
              storeSettings?.trustGatewayConfigured
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}>
              {storeSettings?.trustGatewayConfigured ? 'STATUS: ACTIVE' : 'AWAITING TRUST_GATEWAY_API_KEY'}
            </span>
          </h2>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white">Trust Gateway UPI API Endpoints</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Trust Gateway UPI integration is active in Vortex Code. Payment creation, status verification, and HMAC-SHA256 webhooks are fully implemented.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Base URL</span>
                <div className="text-emerald-400 font-bold truncate">https://trustgateway.in</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Create Order</span>
                <div className="text-slate-200 truncate">POST /api/v1/orders/create</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Status Verification</span>
                <div className="text-slate-200 truncate">GET /api/v1/orders/status/:id</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Webhook Security</span>
                <div className="text-teal-400 truncate">HMAC-SHA256 (Constant-Time)</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <strong className="text-white block font-sans">Hosting Dashboard Configuration:</strong>
              <p>Add these server-side environment variables in your hosting dashboard (e.g. Cloud Run, Vercel, Railway, or VPS):</p>
              <div className="font-mono text-[10px] text-emerald-300 bg-slate-950 p-2 rounded border border-slate-800 space-y-0.5">
                <div>TRUST_GATEWAY_API_KEY=&lt;Your-TrustGateway-API-Key&gt;</div>
                <div>TRUST_GATEWAY_WEBHOOK_SECRET=&lt;Your-TrustGateway-Webhook-Secret&gt;</div>
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
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Diamond Category Label</label>
              <input
                type="text"
                value={diamondCategoryLabel}
                onChange={(e) => setDiamondCategoryLabel(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Diamond Product Label</label>
              <input
                type="text"
                value={diamondProductLabel}
                onChange={(e) => setDiamondProductLabel(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div className="sm:col-span-2 border-t border-slate-800/80 pt-3 mt-1">
              <label className="block text-xs font-bold text-emerald-400 mb-1">DEFAULT STORE CATEGORY</label>
              <p className="text-[11px] text-slate-400 mb-2">
                Select which category is selected first when a customer opens the store (REDEEM CODE or DIAMONDS).
              </p>
              <select
                value={defaultOpeningCategory}
                onChange={(e) => setDefaultOpeningCategory(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              >
                <option value="REDEEM CODE">REDEEM CODE</option>
                <option value="DIAMONDS">DIAMONDS</option>
              </select>
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
