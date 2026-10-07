import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
  Send,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  MessageCircle,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Link,
  Image,
  Tag,
} from 'lucide-react';

export const AdminContactTab: React.FC = () => {
  const { storeSettings, updateContactSettings } = useAdmin();

  // Local draft state
  const [form, setForm] = useState({
    contactEnabled: true,
    contactPlatform: 'telegram' as 'telegram' | 'whatsapp' | 'custom',
    contactUrl: 'https://t.me/VortexCodeSupport',
    contactIconUrl: '',
    contactLabel: 'Contact Admin',
  });

  const [previewIconError, setPreviewIconError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (storeSettings && !isInitializedRef.current) {
      const isEnabled =
        storeSettings.contactEnabled !== undefined
          ? storeSettings.contactEnabled
          : storeSettings.telegramEnabled !== undefined
          ? storeSettings.telegramEnabled
          : true;

      const platform = (storeSettings.contactPlatform || 'telegram').toLowerCase();

      setForm({
        contactEnabled: isEnabled,
        contactPlatform: platform === 'whatsapp' || platform === 'custom' ? platform : 'telegram',
        contactUrl: storeSettings.contactUrl || storeSettings.telegramUrl || 'https://t.me/VortexCodeSupport',
        contactIconUrl: storeSettings.contactIconUrl || '',
        contactLabel: storeSettings.contactLabel || 'Contact Admin',
      });
      isInitializedRef.current = true;
    }
  }, [storeSettings]);

  // Reset icon preview error when icon URL changes
  useEffect(() => {
    setPreviewIconError(false);
  }, [form.contactIconUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      let cleanUrl = form.contactUrl.trim();
      if (!cleanUrl) {
        throw new Error('Please provide a valid contact link, phone number, or handle.');
      }

      const updated = await updateContactSettings({
        contactEnabled: form.contactEnabled,
        contactPlatform: form.contactPlatform,
        contactUrl: cleanUrl,
        contactIconUrl: form.contactIconUrl.trim(),
        contactLabel: form.contactLabel.trim() || 'Contact Admin',
      });

      if (updated) {
        setForm((prev) => ({
          ...prev,
          contactEnabled: updated.contactEnabled !== undefined ? updated.contactEnabled : form.contactEnabled,
          contactPlatform: updated.contactPlatform || form.contactPlatform,
          contactUrl: updated.contactUrl || form.contactUrl,
          contactIconUrl: updated.contactIconUrl !== undefined ? updated.contactIconUrl : form.contactIconUrl,
          contactLabel: updated.contactLabel || form.contactLabel,
        }));
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to update contact settings:', err);
      setErrorMessage(err.message || 'Failed to save contact settings to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEffectiveContactUrl = () => {
    let raw = form.contactUrl.trim();
    if (!raw) {
      if (form.contactPlatform === 'telegram') return 'https://t.me/VortexCodeSupport';
      if (form.contactPlatform === 'whatsapp') return 'https://wa.me/919999999999';
      return 'https://vortexcode.shop';
    }

    if (form.contactPlatform === 'telegram') {
      if (raw.startsWith('@')) return `https://t.me/${raw.substring(1)}`;
      if (raw.startsWith('t.me/')) return `https://${raw}`;
      if (!raw.startsWith('http://') && !raw.startsWith('https://')) return `https://t.me/${raw}`;
      return raw;
    } else if (form.contactPlatform === 'whatsapp') {
      const digits = raw.replace(/[\s\-\+\(\)]/g, '');
      if (/^\d{7,15}$/.test(digits)) return `https://wa.me/${digits}`;
      if (raw.startsWith('wa.me/')) return `https://${raw}`;
      if (!raw.startsWith('http://') && !raw.startsWith('https://')) return `https://wa.me/${digits || raw}`;
      return raw;
    } else {
      if (!raw.startsWith('http://') && !raw.startsWith('https://')) return `https://${raw}`;
      return raw;
    }
  };

  const isWhatsApp = form.contactPlatform === 'whatsapp';
  const isTelegram = form.contactPlatform === 'telegram';

  const previewBgGradient = isWhatsApp
    ? 'from-emerald-600 via-emerald-500 to-green-400 border-emerald-300/60 shadow-emerald-950/60'
    : isTelegram
    ? 'from-sky-600 via-sky-500 to-sky-400 border-sky-300/60 shadow-sky-950/60'
    : 'from-emerald-600 via-teal-500 to-cyan-400 border-teal-300/60 shadow-cyan-950/60';

  const previewAuraColor = isWhatsApp
    ? 'bg-emerald-500/30 group-hover:bg-emerald-400/50'
    : isTelegram
    ? 'bg-sky-500/30 group-hover:bg-sky-400/50'
    : 'bg-teal-500/30 group-hover:bg-teal-400/50';

  const hasCustomIconPreview = Boolean(form.contactIconUrl.trim() && !previewIconError);

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <MessageCircle className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Floating Contact & Support Widget Settings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure the customer-facing floating contact button (Telegram, WhatsApp, or Custom). Modify the destination URL, platform, label, and custom icon dynamically without redeploying.
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono font-bold animate-in fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Saved to Database!</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Contact Parameters</span>
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Database Sync
            </span>
          </div>

          {/* Contact Enabled Toggle Switch */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5 pr-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Floating Contact Widget</span>
                {form.contactEnabled ? (
                  <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 rounded-md font-bold">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.2 rounded-md font-bold">
                    DISABLED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {form.contactEnabled
                  ? 'The circular floating button is visible in the bottom-right area of all storefront pages.'
                  : 'The floating contact button is completely hidden from customer view.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, contactEnabled: !prev.contactEnabled }))}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                form.contactEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {form.contactEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          {/* Contact Platform Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Platform</span>
            </label>
            <select
              value={form.contactPlatform}
              onChange={(e) => {
                const val = e.target.value as 'telegram' | 'whatsapp' | 'custom';
                setForm((prev) => {
                  let defaultUrl = prev.contactUrl;
                  if (val === 'telegram' && prev.contactPlatform !== 'telegram') {
                    defaultUrl = 'https://t.me/VortexCodeSupport';
                  } else if (val === 'whatsapp' && prev.contactPlatform !== 'whatsapp') {
                    defaultUrl = 'https://wa.me/919999999999';
                  }
                  return {
                    ...prev,
                    contactPlatform: val,
                    contactUrl: defaultUrl,
                  };
                });
              }}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-emerald-400 transition-colors cursor-pointer"
            >
              <option value="telegram">Telegram (https://t.me/username)</option>
              <option value="whatsapp">WhatsApp (https://wa.me/phone or number)</option>
              <option value="custom">Custom / Web Contact URL</option>
            </select>
          </div>

          {/* Contact URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Destination URL or Username</span>
            </label>
            <input
              type="text"
              value={form.contactUrl}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, contactUrl: val }));
              }}
              placeholder={
                form.contactPlatform === 'telegram'
                  ? 'https://t.me/YourAdminUsername or @YourUsername'
                  : form.contactPlatform === 'whatsapp'
                  ? 'https://wa.me/919999999999 or 919999999999'
                  : 'https://example.com/contact'
              }
              required
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-400">
              {form.contactPlatform === 'telegram' && 'Example: https://t.me/YourUsername or @YourUsername'}
              {form.contactPlatform === 'whatsapp' && 'Example: https://wa.me/919876543210 or 919876543210 (include country code)'}
              {form.contactPlatform === 'custom' && 'Example: https://yourdomain.com/support'}
            </p>
          </div>

          {/* Contact Icon URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-emerald-400" />
              <span>Custom Icon Image URL (Optional)</span>
            </label>
            <input
              type="url"
              value={form.contactIconUrl}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, contactIconUrl: val }));
              }}
              placeholder="https://example.com/custom-icon.png (Leave empty for default platform icon)"
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-400">
              Paste direct image URL (PNG, SVG, WEBP). If left empty, the official built-in SVG icon for the chosen platform will be used automatically.
            </p>
          </div>

          {/* Contact Label Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Button Tooltip / Accessible Label</span>
            </label>
            <input
              type="text"
              value={form.contactLabel}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, contactLabel: val }));
              }}
              placeholder="Contact Admin"
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Test Link Button */}
          {form.contactUrl.trim() && (
            <div className="pt-1">
              <a
                href={getEffectiveContactUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 underline"
              >
                <span>Test Configured Link ({getEffectiveContactUrl()})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Contact Settings</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Preview Panel */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Live Widget Preview</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                REAL-TIME
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Customer preview of the floating contact widget on the bottom-right of the user storefront:
            </p>

            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-4 relative min-h-[180px]">
              {form.contactEnabled ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative group cursor-pointer">
                    <div className={`absolute inset-0 rounded-full ${previewAuraColor} blur-lg transition-all`}></div>
                    <div className={`relative w-14 h-14 rounded-full bg-gradient-to-tr ${previewBgGradient} flex items-center justify-center shadow-xl border-2 group-hover:scale-105 transition-transform`}>
                      {hasCustomIconPreview ? (
                        <img
                          src={form.contactIconUrl.trim()}
                          alt="Custom Icon Preview"
                          onError={() => setPreviewIconError(true)}
                          className="w-7 h-7 object-contain drop-shadow-md rounded-full relative z-10"
                        />
                      ) : isWhatsApp ? (
                        <svg className="w-7 h-7 fill-current text-white drop-shadow-md relative z-10" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                      ) : isTelegram ? (
                        <svg className="w-7 h-7 text-white fill-current transform -translate-x-0.5 translate-y-0.5 drop-shadow-md relative z-10" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-white fill-none stroke-current stroke-2 drop-shadow-md relative z-10" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                      <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse"></div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">{form.contactLabel || 'Contact Admin'}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 max-w-[200px] truncate">
                    {getEffectiveContactUrl()}
                  </span>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                    <MessageCircle className="w-5 h-5 opacity-40" />
                  </div>
                  <p className="text-xs font-mono text-slate-400">Contact Widget Disabled</p>
                  <p className="text-[10px] text-slate-500">No floating button will be rendered to users.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-[11px] font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Platform:</span>
                <span className="text-white font-bold uppercase">{form.contactPlatform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Public Status:</span>
                <span className={form.contactEnabled ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {form.contactEnabled ? 'Visible' : 'Hidden'}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
