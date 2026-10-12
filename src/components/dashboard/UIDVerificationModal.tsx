import React, { useState, useEffect } from 'react';
import { Loader2, X, Crown, Star, Users, ShieldCheck, Mail } from 'lucide-react';
import { api } from '../../services/api';

interface UIDVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (uid: string) => Promise<any | null>;
  isVerifying: boolean;
  onContinue: () => void;
}

export const UIDVerificationModal: React.FC<UIDVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  isVerifying,
  onContinue,
}) => {
  const [uid, setUid] = useState('');
  const [playerData, setPlayerData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      api.getCategoricalSettings('diamonds').then(res => {
        if (res) setSettings(res);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (playerData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        {/* Card Container */}
        <div className="w-full max-w-md p-6 space-y-6 rounded-2xl bg-[#0a1520] border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] relative">
          
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
            <h2 className="text-2xl font-black text-white tracking-wider text-center drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{playerData.nickname}</h2>
          </div>
          
          {/* Level & Guild Panels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[#0d1c2b] border border-cyan-500/40 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-emerald-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">LEVEL</span>
              </div>
              <div className="text-xl font-black text-white">{playerData.level}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0d1c2b] border border-cyan-500/40 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">GUILD</span>
              </div>
              <div className="text-sm font-bold text-white truncate max-w-full">{playerData.guild}</div>
            </div>
          </div>
          
          {/* Verified Badge */}
          <div className="flex items-center justify-center gap-2 py-2.5 border-y border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
              {settings.verificationSuccessfulMessage || 'PLAYER VERIFIED'}
            </span>
          </div>

          {/* Diamond Delivery Notice */}
          <div className="p-4 rounded-lg bg-[#0a1520] border border-cyan-500/20 shadow-inner space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-[0.05em]">
              <Mail className="w-3.5 h-3.5" />
              {settings.deliveryNoticeHeading || 'DIAMOND DELIVERY NOTICE'}
            </div>
            <div className="text-xs text-slate-100 font-semibold space-y-3 leading-relaxed whitespace-pre-wrap">
              {settings.englishDeliveryMessage ? (
                <div>{settings.englishDeliveryMessage}</div>
              ) : (
                <p>
                  Your selected <span className="text-emerald-400 font-bold tracking-wide">{playerData.diamondQuantity || 'Diamonds'}</span> will be delivered to your in-game mailbox within <span className="text-emerald-400 font-bold">10–15 minutes</span> after successful payment.
                </p>
              )}
              {settings.hindiHinglishDeliveryMessage && (
                <div className="text-emerald-300 font-mono text-[11px] pt-1 border-t border-cyan-500/20">
                  {settings.hindiHinglishDeliveryMessage}
                </div>
              )}
            </div>
          </div>
          
          {/* Continue Button */}
          <button
            onClick={() => {
              onClose();
              setPlayerData(null);
              onContinue();
            }}
            className="w-full py-4 px-6 rounded-md bg-[#38BDF8] text-[#06111F] font-black tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {settings.payNowButtonText || 'CONTINUE TO PAYMENT →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm p-6 space-y-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{settings.verificationHeading || 'VERIFY PLAYER'}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">{settings.playerIdLabel || 'ENTER YOUR GAME UID'}</label>
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            placeholder="e.g., 123456789"
          />
        </div>
        <button
          onClick={async () => {
            const data = await onVerify(uid);
            if (data) {
              setPlayerData(data);
            }
          }}
          disabled={isVerifying || !uid}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
        >
          {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : (settings.verificationButtonText || 'VERIFY')}
        </button>
      </div>
    </div>
  );
};
