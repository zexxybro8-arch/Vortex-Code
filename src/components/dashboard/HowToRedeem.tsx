import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HelpCircle } from 'lucide-react';
import { api } from '../../services/api';

const StepImage: React.FC<{ enabled: boolean; url: string; alt: string }> = ({ enabled, url, alt }) => {
  const [error, setError] = useState(false);

  if (!enabled || !url || !url.trim() || error) return null;

  return (
    <div className="mt-4 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2 max-h-[350px] shrink-0">
      <img
        src={url.trim()}
        alt={alt}
        className="max-w-full max-h-[330px] object-contain rounded-xl"
        onError={() => setError(true)}
      />
    </div>
  );
};

export const HowToRedeem: React.FC = () => {
  const { setCurrentView } = useAuth();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    api.getStoreSettings().then((res) => {
      if (isMounted && res) {
        setSettings(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-3 relative overflow-hidden neon-glow">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Official Redemption Guide</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          How To Redeem Your Code
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
          Purchase your Redeem Code from VortexCode and redeem it safely on Google Play.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            1
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>1. Choose Your Redeem Code</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Go to the REDEEM CODE store and select the Redeem Code amount you want to purchase.
            </p>
            <StepImage
              enabled={!!settings?.how_to_redeem_step_1_image_enabled}
              url={settings?.how_to_redeem_step_1_image_url || ''}
              alt="Choose Your Redeem Code"
            />
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white">2. Complete Your Payment</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Click REDEEM NOW, complete the payment securely, and wait for your payment to be verified.
            </p>
            <StepImage
              enabled={!!settings?.how_to_redeem_step_2_image_enabled}
              url={settings?.how_to_redeem_step_2_image_url || ''}
              alt="Complete Your Payment"
            />
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            3
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white">3. Get Your Redeem Code</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              After a successful payment, your purchased Redeem Code will be available in your order details. Copy the code securely.
            </p>
            <StepImage
              enabled={!!settings?.how_to_redeem_step_3_image_enabled}
              url={settings?.how_to_redeem_step_3_image_url || ''}
              alt="Get Your Redeem Code"
            />
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            4
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white">4. Redeem on Google Play</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Open Google Play Store, tap your profile picture → Payments & subscriptions → Redeem code, enter your purchased code, and tap Redeem.
            </p>
            <StepImage
              enabled={!!settings?.how_to_redeem_step_4_image_enabled}
              url={settings?.how_to_redeem_step_4_image_url || ''}
              alt="Redeem on Google Play"
            />
          </div>
        </div>

      </div>

    </div>
  );
};

