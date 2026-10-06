import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, ShieldCheck, CheckCircle2, Copy, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

export const HowToRedeem: React.FC = () => {
  const { setCurrentView } = useAuth();

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
          How To Redeem Your Digital Code
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
          Follow these 4 simple steps to purchase, reveal, and activate your authentic digital vouchers safely.
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
              <span>Select Your Reward Denomination</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Navigate to the <strong className="text-emerald-400">REDEEM CODE</strong> store tab. Filter by denomination (₹100, ₹120, ₹150, ₹200, etc.) or category to select your desired voucher pass.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white">Click "BUY NOW" to Claim</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Click the <strong className="text-emerald-400">BUY NOW</strong> button on the product card. Your wallet balance or payment method processes instantly and your code is fulfilled within seconds.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            3
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white">Reveal Code Key & PIN in Your Vault</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Open the <strong className="text-emerald-400">My Orders & Vault</strong> tab. Click the eye icon (<Key className="w-3.5 h-3.5 inline text-emerald-400" />) to reveal your 16-digit secret key and security PIN.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 bg-emerald-400 text-slate-950 font-extrabold font-mono text-xl rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            4
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-white">Paste Key into Target App or Platform</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Copy the code key using the <strong className="text-emerald-400">Copy</strong> button and paste it into your game console, streaming app, or partner voucher redemption page to enjoy your rewards!
            </p>
          </div>
        </div>

      </div>

      {/* Security Assurance */}
      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <p>
          All Vortex Code vouchers are generated with 256-bit encryption. Need help with activation? Contact our support team in the <strong>SUPPORT</strong> tab.
        </p>
      </div>

    </div>
  );
};
