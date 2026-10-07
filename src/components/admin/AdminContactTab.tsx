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
  Sliders,
  Smartphone,
  Monitor,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
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
    // Desktop appearance
    contactWidgetSize: 60,
    contactWidgetRight: 30,
    contactWidgetBottom: 30,
    contactIconSize: 42,
    // Mobile appearance
    contactWidgetMobileSize: 55,
    contactWidgetMobileRight: 35,
    contactWidgetMobileBottom: 110,
    contactMobileIconSize: 42,
  });

  const [previewDeviceMode, setPreviewDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
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
        contactWidgetSize: Number(storeSettings.contactWidgetSize) || 60,
        contactWidgetRight:
          storeSettings.contactWidgetRight !== undefined && !isNaN(Number(storeSettings.contactWidgetRight))
            ? Number(storeSettings.contactWidgetRight)
            : 30,
        contactWidgetBottom:
          storeSettings.contactWidgetBottom !== undefined && !isNaN(Number(storeSettings.contactWidgetBottom))
            ? Number(storeSettings.contactWidgetBottom)
            : 30,
        contactIconSize:
          storeSettings.contactIconSize !== undefined && !isNaN(Number(storeSettings.contactIconSize))
            ? Number(storeSettings.contactIconSize)
            : 42,
        contactWidgetMobileSize: Number(storeSettings.contactWidgetMobileSize) || 55,
        contactWidgetMobileRight:
          storeSettings.contactWidgetMobileRight !== undefined && !isNaN(Number(storeSettings.contactWidgetMobileRight))
            ? Number(storeSettings.contactWidgetMobileRight)
            : 35,
        contactWidgetMobileBottom:
          storeSettings.contactWidgetMobileBottom !== undefined && !isNaN(Number(storeSettings.contactWidgetMobileBottom))
            ? Number(storeSettings.contactWidgetMobileBottom)
            : 110,
        contactMobileIconSize:
          storeSettings.contactMobileIconSize !== undefined && !isNaN(Number(storeSettings.contactMobileIconSize))
            ? Number(storeSettings.contactMobileIconSize)
            : 42,
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
        contactWidgetSize: Number(form.contactWidgetSize) || 60,
        contactWidgetRight: Number(form.contactWidgetRight) || 0,
        contactWidgetBottom: Number(form.contactWidgetBottom) || 0,
        contactIconSize: Number(form.contactIconSize) || 42,
        contactWidgetMobileSize: Number(form.contactWidgetMobileSize) || 55,
        contactWidgetMobileRight: Number(form.contactWidgetMobileRight) || 0,
        contactWidgetMobileBottom: Number(form.contactWidgetMobileBottom) || 60,
        contactMobileIconSize: Number(form.contactMobileIconSize) || 42,
      });

      if (updated) {
        setForm((prev) => ({
          ...prev,
          contactEnabled: updated.contactEnabled !== undefined ? updated.contactEnabled : form.contactEnabled,
          contactPlatform: updated.contactPlatform || form.contactPlatform,
          contactUrl: updated.contactUrl || form.contactUrl,
          contactIconUrl: updated.contactIconUrl !== undefined ? updated.contactIconUrl : form.contactIconUrl,
          contactLabel: updated.contactLabel || form.contactLabel,
          contactWidgetSize: updated.contactWidgetSize !== undefined ? Number(updated.contactWidgetSize) : form.contactWidgetSize,
          contactWidgetRight: updated.contactWidgetRight !== undefined ? Number(updated.contactWidgetRight) : form.contactWidgetRight,
          contactWidgetBottom: updated.contactWidgetBottom !== undefined ? Number(updated.contactWidgetBottom) : form.contactWidgetBottom,
          contactIconSize: updated.contactIconSize !== undefined ? Number(updated.contactIconSize) : form.contactIconSize,
          contactWidgetMobileSize: updated.contactWidgetMobileSize !== undefined ? Number(updated.contactWidgetMobileSize) : form.contactWidgetMobileSize,
          contactWidgetMobileRight: updated.contactWidgetMobileRight !== undefined ? Number(updated.contactWidgetMobileRight) : form.contactWidgetMobileRight,
          contactWidgetMobileBottom: updated.contactWidgetMobileBottom !== undefined ? Number(updated.contactWidgetMobileBottom) : form.contactWidgetMobileBottom,
          contactMobileIconSize: updated.contactMobileIconSize !== undefined ? Number(updated.contactMobileIconSize) : form.contactMobileIconSize,
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

  const handleResetPositionAndSize = () => {
    setForm((prev) => ({
      ...prev,
      contactWidgetSize: 60,
      contactWidgetRight: 30,
      contactWidgetBottom: 30,
      contactIconSize: 42,
      contactWidgetMobileSize: 55,
      contactWidgetMobileRight: 35,
      contactWidgetMobileBottom: 110,
      contactMobileIconSize: 42,
    }));
  };

  const nudgePosition = (device: 'mobile' | 'desktop', direction: 'up' | 'down' | 'left' | 'right', amount = 5) => {
    setForm((prev) => {
      if (device === 'mobile') {
        let newBottom = prev.contactWidgetMobileBottom;
        let newRight = prev.contactWidgetMobileRight;

        if (direction === 'up') newBottom = Math.min(300, newBottom + amount);
        if (direction === 'down') newBottom = Math.max(60, newBottom - amount);
        if (direction === 'left') newRight = Math.min(100, newRight + amount);
        if (direction === 'right') newRight = Math.max(0, newRight - amount);

        return {
          ...prev,
          contactWidgetMobileBottom: newBottom,
          contactWidgetMobileRight: newRight,
        };
      } else {
        let newBottom = prev.contactWidgetBottom;
        let newRight = prev.contactWidgetRight;

        if (direction === 'up') newBottom = Math.min(300, newBottom + amount);
        if (direction === 'down') newBottom = Math.max(0, newBottom - amount);
        if (direction === 'left') newRight = Math.min(100, newRight + amount);
        if (direction === 'right') newRight = Math.max(0, newRight - amount);

        return {
          ...prev,
          contactWidgetBottom: newBottom,
          contactWidgetRight: newRight,
        };
      }
    });
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

  // Active preview dimensions based on selected tab (mobile / desktop)
  const currentPreviewSize = previewDeviceMode === 'mobile' ? form.contactWidgetMobileSize : form.contactWidgetSize;
  const rawPreviewIconSize = previewDeviceMode === 'mobile' ? form.contactMobileIconSize : form.contactIconSize;
  const currentPreviewIconSize = Math.min(rawPreviewIconSize, Math.max(16, currentPreviewSize - 4));
  const currentPreviewRight = previewDeviceMode === 'mobile' ? form.contactWidgetMobileRight : form.contactWidgetRight;
  const currentPreviewBottom = previewDeviceMode === 'mobile' ? form.contactWidgetMobileBottom : form.contactWidgetBottom;

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <MessageCircle className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Floating Contact & Widget Settings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure the customer-facing contact button (Telegram, WhatsApp, Custom) and adjust its button size, inner logo/icon size, and screen positioning for mobile and desktop viewports.
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
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          
          {/* SECTION 1: CONTACT INTEGRATION PARAMETERS */}
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Contact Integration Parameters</span>
              </h2>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Database Sync
              </span>
            </div>

            {/* Contact Enabled Toggle Switch */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Widget Status</span>
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
                    ? 'The floating contact button is rendered live on all customer storefront pages.'
                    : 'The contact button is completely hidden from customer view.'}
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

            {/* Platform Selector */}
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

            {/* Destination URL Input */}
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
              {form.contactUrl.trim() && (
                <div className="pt-0.5">
                  <a
                    href={getEffectiveContactUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <span>Test Destination ({getEffectiveContactUrl()})</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Custom Icon URL Input */}
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
                placeholder="https://example.com/custom-icon.png (Leave empty for official platform SVG)"
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400 transition-colors"
                autoComplete="off"
              />
              <p className="text-[11px] text-slate-400">
                Paste any direct logo URL (PNG, SVG, WEBP). It will be displayed directly inside the circular button with your chosen icon size below.
              </p>
            </div>

            {/* Button Label Input */}
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
          </div>

          {/* SECTION 2: CONTACT WIDGET APPEARANCE */}
          <div className="space-y-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Contact Widget Appearance</span>
              </h2>
              <button
                type="button"
                onClick={handleResetPositionAndSize}
                className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-mono"
                title="Reset Size & Position to Safe Defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Position & Size</span>
              </button>
            </div>

            {/* MOBILE APPEARANCE SETTINGS */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mobile Configuration (Screen &lt; 640px)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Btn: {form.contactWidgetMobileSize}px · Icon: {form.contactMobileIconSize}px
                </span>
              </div>

              {/* Mobile Widget Size Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Widget Button Size:</span>
                  <span className="text-emerald-400 font-bold">{form.contactWidgetMobileSize}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={form.contactWidgetMobileSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactWidgetMobileSize: val }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>40px</span>
                  <span>Default: 55px</span>
                  <span>100px</span>
                </div>
              </div>

              {/* Mobile Icon / Logo Size Slider */}
              <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Mobile Icon / Logo Size:</span>
                  </span>
                  <span className="text-sky-400 font-bold">{form.contactMobileIconSize}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={form.contactMobileIconSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactMobileIconSize: val }));
                  }}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>20px (Compact)</span>
                  <span>Default: 42px (~70%)</span>
                  <span>100px (Max)</span>
                </div>
              </div>

              {/* Mobile Right Position Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Distance from Right:</span>
                  <span className="text-emerald-400 font-bold">{form.contactWidgetMobileRight}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.contactWidgetMobileRight}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactWidgetMobileRight: val }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0px (Right Edge)</span>
                  <span>Default: 35px</span>
                  <span>100px (Inward)</span>
                </div>
              </div>

              {/* Mobile Bottom Position Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Distance from Bottom:</span>
                  <span className="text-emerald-400 font-bold">{form.contactWidgetMobileBottom}px</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="300"
                  value={form.contactWidgetMobileBottom}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactWidgetMobileBottom: val }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>60px (Near Footer)</span>
                  <span>Default: 110px</span>
                  <span>300px (Higher)</span>
                </div>
              </div>

              {/* Quick Nudge Buttons for Mobile */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400">Position Nudge (±5px):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => nudgePosition('mobile', 'up')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Up 5px"
                  >
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                    <span>Up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePosition('mobile', 'down')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Down 5px"
                  >
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                    <span>Down</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePosition('mobile', 'left')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Left 5px"
                  >
                    <ArrowLeft className="w-3 h-3 text-emerald-400" />
                    <span>Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePosition('mobile', 'right')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Right 5px"
                  >
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <span>Right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* DESKTOP APPEARANCE SETTINGS */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Desktop Configuration (Screen &ge; 640px)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Btn: {form.contactWidgetSize}px · Icon: {form.contactIconSize}px
                </span>
              </div>

              {/* Desktop Widget Size Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Widget Button Size:</span>
                  <span className="text-emerald-400 font-bold">{form.contactWidgetSize}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={form.contactWidgetSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactWidgetSize: val }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>40px</span>
                  <span>Default: 60px</span>
                  <span>100px</span>
                </div>
              </div>

              {/* Desktop Icon / Logo Size Slider */}
              <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Desktop Icon / Logo Size:</span>
                  </span>
                  <span className="text-sky-400 font-bold">{form.contactIconSize}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={form.contactIconSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactIconSize: val }));
                  }}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>20px (Compact)</span>
                  <span>Default: 42px (~70%)</span>
                  <span>100px (Max)</span>
                </div>
              </div>

              {/* Desktop Right Position Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Distance from Right:</span>
                  <span className="text-emerald-400 font-bold">{form.contactWidgetRight}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.contactWidgetRight}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactWidgetRight: val }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0px (Right Edge)</span>
                  <span>Default: 30px</span>
                  <span>100px (Inward)</span>
                </div>
              </div>

              {/* Desktop Bottom Position Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Distance from Bottom:</span>
                  <span className="text-emerald-400 font-bold">{form.contactWidgetBottom}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={form.contactWidgetBottom}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({ ...prev, contactWidgetBottom: val }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0px (Bottom Edge)</span>
                  <span>Default: 30px</span>
                  <span>300px (Higher)</span>
                </div>
              </div>

              {/* Quick Nudge Buttons for Desktop */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400">Position Nudge (±5px):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => nudgePosition('desktop', 'up')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Up 5px"
                  >
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                    <span>Up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePosition('desktop', 'down')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Down 5px"
                  >
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                    <span>Down</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePosition('desktop', 'left')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Left 5px"
                  >
                    <ArrowLeft className="w-3 h-3 text-emerald-400" />
                    <span>Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePosition('desktop', 'right')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Move Right 5px"
                  >
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <span>Right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-6 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 cursor-pointer"
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

        {/* SECTION 3: LIVE REAL-TIME WIDGET PREVIEW PANEL */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 sticky top-20">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Live Real-Time Preview</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                INSTANT
              </span>
            </div>

            {/* Device Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPreviewDeviceMode('mobile')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  previewDeviceMode === 'mobile'
                    ? 'bg-emerald-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile View</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDeviceMode('desktop')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  previewDeviceMode === 'desktop'
                    ? 'bg-emerald-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop View</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Real-time visualization in a simulated storefront viewport:
            </p>

            {/* Simulated Viewport Stage */}
            <div className="relative w-full h-[320px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-3 select-none">
              
              {/* Simulated Store Header */}
              <div className="h-7 w-full bg-slate-900/90 rounded-lg border border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>VORTEX CODE</span>
                <span>🛍 Orders</span>
              </div>

              {/* Simulated Page Content Lines */}
              <div className="space-y-2 opacity-20 px-2">
                <div className="h-2 w-3/4 bg-slate-700 rounded"></div>
                <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
                <div className="h-8 w-full bg-slate-800 rounded border border-slate-700"></div>
                <div className="h-8 w-full bg-slate-800 rounded border border-slate-700"></div>
              </div>

              {/* The Live Interactive Floating Button */}
              {form.contactEnabled ? (
                <div
                  style={{
                    position: 'absolute',
                    right: `${Math.min(currentPreviewRight, 100)}px`,
                    bottom: `${Math.min(Math.max(currentPreviewBottom * 0.7, 10), 200)}px`,
                    width: `${currentPreviewSize}px`,
                    height: `${currentPreviewSize}px`,
                    transition: 'all 0.15s ease-out',
                  }}
                  className="z-20"
                >
                  <div
                    className={`relative w-full h-full rounded-full bg-gradient-to-tr ${previewBgGradient} flex items-center justify-center shadow-xl border-2 hover:scale-105 transition-transform`}
                  >
                    {/* Glow aura */}
                    <div className={`absolute inset-0 rounded-full ${previewAuraColor} blur-md pointer-events-none`}></div>

                    {/* Icon with independent size control */}
                    {hasCustomIconPreview ? (
                      <img
                        src={form.contactIconUrl.trim()}
                        alt="Preview Icon"
                        onError={() => setPreviewIconError(true)}
                        style={{
                          width: `${currentPreviewIconSize}px`,
                          height: `${currentPreviewIconSize}px`,
                          maxWidth: `${Math.max(16, currentPreviewSize - 4)}px`,
                          maxHeight: `${Math.max(16, currentPreviewSize - 4)}px`,
                        }}
                        className="object-contain drop-shadow-md rounded-full relative z-10"
                      />
                    ) : isWhatsApp ? (
                      <svg
                        style={{
                          width: `${currentPreviewIconSize}px`,
                          height: `${currentPreviewIconSize}px`,
                          maxWidth: `${Math.max(16, currentPreviewSize - 4)}px`,
                          maxHeight: `${Math.max(16, currentPreviewSize - 4)}px`,
                        }}
                        className="fill-current text-white drop-shadow-md relative z-10"
                        viewBox="0 0 24 24"
                      >
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    ) : isTelegram ? (
                      <svg
                        style={{
                          width: `${currentPreviewIconSize}px`,
                          height: `${currentPreviewIconSize}px`,
                          maxWidth: `${Math.max(16, currentPreviewSize - 4)}px`,
                          maxHeight: `${Math.max(16, currentPreviewSize - 4)}px`,
                        }}
                        className="text-white fill-current transform -translate-x-0.5 translate-y-0.5 drop-shadow-md relative z-10"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                    ) : (
                      <svg
                        style={{
                          width: `${currentPreviewIconSize}px`,
                          height: `${currentPreviewIconSize}px`,
                          maxWidth: `${Math.max(16, currentPreviewSize - 4)}px`,
                          maxHeight: `${Math.max(16, currentPreviewSize - 4)}px`,
                        }}
                        className="text-white fill-none stroke-current stroke-2 drop-shadow-md relative z-10"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}

                    {/* Proportional online dot */}
                    <span className="absolute top-0 right-0 flex w-[22%] h-[22%] max-w-[14px] max-h-[14px] min-w-[8px] min-h-[8px]">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border-2 border-slate-950"></span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-1">
                  <MessageCircle className="w-6 h-6 opacity-30" />
                  <span>Widget Disabled</span>
                </div>
              )}
            </div>

            {/* Current Values Display Card */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Active View:</span>
                <span className="text-emerald-400 font-bold uppercase">{previewDeviceMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Button Outer Size:</span>
                <span className="text-white font-bold">{currentPreviewSize}px &times; {currentPreviewSize}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Inner Icon / Logo Size:</span>
                <span className="text-sky-400 font-bold">{currentPreviewIconSize}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Position Coordinates:</span>
                <span className="text-slate-200">right: {currentPreviewRight}px, bottom: {currentPreviewBottom}px</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1">
                <span className="text-slate-400">Target URL:</span>
                <span className="text-emerald-400 font-bold max-w-[170px] truncate">{getEffectiveContactUrl()}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
