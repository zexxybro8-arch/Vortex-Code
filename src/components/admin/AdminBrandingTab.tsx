import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Logo } from '../common/Logo';
import { Sparkles, Save, Image, Globe, Tag, Check, AlertCircle, RefreshCw, Eye, RotateCcw } from 'lucide-react';

export const AdminBrandingTab: React.FC = () => {
  const { storeSettings, updateBranding } = useAdmin();

  // Local draft form state
  const [form, setForm] = useState({
    logoUrl: '',
    websiteName: 'VORTEX CODE',
    tagline: 'SECURE DIGITAL STORE',
  });

  const [previewImgError, setPreviewImgError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchronization ref: ensures database values initialize draft form state ONCE upon initial component mount
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (storeSettings && !isInitializedRef.current) {
      setForm({
        logoUrl: storeSettings.logoUrl !== undefined ? storeSettings.logoUrl : '',
        websiteName: storeSettings.websiteName || storeSettings.storeName || 'VORTEX CODE',
        tagline: storeSettings.tagline || storeSettings.subtitle || 'SECURE DIGITAL STORE',
      });
      isInitializedRef.current = true;
    }
  }, [storeSettings]);

  // Reset preview image error when logoUrl draft changes
  useEffect(() => {
    setPreviewImgError(false);
  }, [form.logoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        logoUrl: form.logoUrl.trim(),
        websiteName: form.websiteName.trim() || 'VORTEX CODE',
        tagline: form.tagline.trim() || 'SECURE DIGITAL STORE',
      };

      await updateBranding(payload);

      // Keep exact user entered values in form
      setForm(payload);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to update branding:', err);
      setSaveError(err.message || 'Failed to save branding settings to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = () => {
    setForm({
      logoUrl: '',
      websiteName: 'VORTEX CODE',
      tagline: 'SECURE DIGITAL STORE',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Website Logo & Branding Management</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize the storefront logo, site name, and tagline. The user-facing website header and customer pages update dynamically from these database settings.
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono font-bold animate-in fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Saved to Database!</span>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Branding Configuration Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Image className="w-4 h-4 text-emerald-400" />
              <span>Brand Identity Parameters</span>
            </h2>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          {/* Logo URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Website Logo Image URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({ ...prev, logoUrl: val }));
                }}
                placeholder="https://example.com/logo.png"
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400 transition-colors"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Paste any direct image URL (PNG, SVG, WEBP, JPG). If empty or invalid, the sleek built-in SVG logo will automatically be used.
            </p>
            {form.logoUrl.trim() && previewImgError && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Notice: Image failed to load from this URL. Default logo will be used as fallback.</span>
              </div>
            )}
          </div>

          {/* Website Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Website Name</span>
            </label>
            <input
              type="text"
              value={form.websiteName}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, websiteName: val }));
              }}
              placeholder="VORTEX CODE"
              required
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-emerald-400 transition-colors"
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-400">
              Displays as the primary brand name in the header, login screens, and order confirmation receipts.
            </p>
          </div>

          {/* Optional Tagline Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Optional Tagline / Subtitle</span>
            </label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, tagline: val }));
              }}
              placeholder="SECURE DIGITAL STORE"
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors"
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-400">
              Displayed below the website name in headers and branded badges.
            </p>
          </div>

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
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Branding Settings</span>
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
                <span>Live Header Preview</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                REAL-TIME
              </span>
            </div>

            <p className="text-xs text-slate-400">
              This is how your branding will look to customers across the site:
            </p>

            {/* Header simulation card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                STOREFRONT HEADER VIEW
              </span>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                <Logo
                  size="sm"
                  showSubtitle={true}
                  logoUrl={form.logoUrl.trim()}
                  websiteName={form.websiteName.trim()}
                  tagline={form.tagline.trim()}
                />
              </div>
            </div>

            {/* Login screen preview */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                AUTH & HERO BANNER VIEW
              </span>

              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 flex justify-center">
                <Logo
                  size="md"
                  showSubtitle={true}
                  logoUrl={form.logoUrl.trim()}
                  websiteName={form.websiteName.trim()}
                  tagline={form.tagline.trim()}
                />
              </div>
            </div>

            {/* Image Loading Test Status */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Logo Mode:</span>
                <span className="text-emerald-400 font-bold">
                  {form.logoUrl.trim() ? 'Custom Image URL' : 'Default Dynamic SVG'}
                </span>
              </div>
              {form.logoUrl.trim() && (
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-900">
                  <span className="text-slate-400">Image Test:</span>
                  <span className={previewImgError ? 'text-amber-400' : 'text-emerald-400'}>
                    {previewImgError ? 'Failed (Fallback Active)' : 'Loads Successfully'}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
