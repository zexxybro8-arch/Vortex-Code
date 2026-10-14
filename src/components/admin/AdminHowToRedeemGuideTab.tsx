import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { HelpCircle, Save, Check, Image as ImageIcon } from 'lucide-react';

export const AdminHowToRedeemGuideTab: React.FC = () => {
  const { storeSettings, updateStoreSettings } = useAdmin();

  const [step1Enabled, setStep1Enabled] = useState(false);
  const [step1Url, setStep1Url] = useState('');

  const [step2Enabled, setStep2Enabled] = useState(false);
  const [step2Url, setStep2Url] = useState('');

  const [step3Enabled, setStep3Enabled] = useState(false);
  const [step3Url, setStep3Url] = useState('');

  const [step4Enabled, setStep4Enabled] = useState(false);
  const [step4Url, setStep4Url] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (storeSettings) {
      setStep1Enabled(Boolean(storeSettings.how_to_redeem_step_1_image_enabled));
      setStep1Url(storeSettings.how_to_redeem_step_1_image_url || '');

      setStep2Enabled(Boolean(storeSettings.how_to_redeem_step_2_image_enabled));
      setStep2Url(storeSettings.how_to_redeem_step_2_image_url || '');

      setStep3Enabled(Boolean(storeSettings.how_to_redeem_step_3_image_enabled));
      setStep3Url(storeSettings.how_to_redeem_step_3_image_url || '');

      setStep4Enabled(Boolean(storeSettings.how_to_redeem_step_4_image_enabled));
      setStep4Url(storeSettings.how_to_redeem_step_4_image_url || '');
    }
  }, [storeSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateStoreSettings({
        how_to_redeem_step_1_image_enabled: step1Enabled,
        how_to_redeem_step_1_image_url: step1Url.trim(),

        how_to_redeem_step_2_image_enabled: step2Enabled,
        how_to_redeem_step_2_image_url: step2Url.trim(),

        how_to_redeem_step_3_image_enabled: step3Enabled,
        how_to_redeem_step_3_image_url: step3Url.trim(),

        how_to_redeem_step_4_image_enabled: step4Enabled,
        how_to_redeem_step_4_image_url: step4Url.trim(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to update guide images: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Step 1: Choose Your Redeem Code',
      enabled: step1Enabled,
      setEnabled: setStep1Enabled,
      url: step1Url,
      setUrl: setStep1Url,
    },
    {
      num: 2,
      title: 'Step 2: Complete Your Payment',
      enabled: step2Enabled,
      setEnabled: setStep2Enabled,
      url: step2Url,
      setUrl: setStep2Url,
    },
    {
      num: 3,
      title: 'Step 3: Get Your Redeem Code',
      enabled: step3Enabled,
      setEnabled: setStep3Enabled,
      url: step3Url,
      setUrl: setStep3Url,
    },
    {
      num: 4,
      title: 'Step 4: Redeem on Google Play',
      enabled: step4Enabled,
      setEnabled: setStep4Enabled,
      url: step4Url,
      setUrl: setStep4Url,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <span>HOW TO REDEEM GUIDE IMAGES</span>
          </h1>
          <p className="text-xs text-slate-400">
            Configure step-by-step guide illustrations displayed to customers in the "How to Redeem" page.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="py-2.5 px-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Guide Images'}</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Guide image configuration updated successfully in database!</span>
        </div>
      )}

      {/* Guide Image Settings Cards */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-400 text-slate-950 text-xs font-mono font-extrabold flex items-center justify-center">
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </span>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.enabled}
                    onChange={(e) => step.setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-400"></div>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={step.url}
                  onChange={(e) => step.setUrl(e.target.value)}
                  placeholder="https://example.com/guide-step.png"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                />
              </div>

              {/* Preview Box */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Image Preview
                </span>
                {step.enabled && step.url && step.url.trim() ? (
                  <div className="w-full h-40 bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={step.url.trim()}
                      alt={`Step ${step.num} Preview`}
                      className="max-h-full max-w-full object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-slate-950/60 rounded-xl border border-slate-800/80 border-dashed flex flex-col items-center justify-center text-slate-600 text-xs gap-1">
                    <ImageIcon className="w-5 h-5" />
                    <span>{step.enabled ? 'No Image URL Provided' : 'Step Image Disabled'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </form>
    </div>
  );
};
