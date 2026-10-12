import React, { useState, useEffect } from 'react';
import { X, Check, Copy } from 'lucide-react';
import { api } from '../../services/api';

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({ isOpen, onClose, order }) => {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      api.getCategoricalSettings('redeem').then(res => {
        if (res) setSettings(res);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    if (order.deliveredCode) {
      navigator.clipboard.writeText(order.deliveredCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in duration-300">
        
        {settings.greenTickEnabled !== false && (
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/30">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
        )}

        <div className="space-y-1.5">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">{settings.successHeading || 'PURCHASE SUCCESSFUL!'}</h2>
            <p className="text-xs text-slate-400">{settings.successDescription || 'Your payment has been verified successfully.'}</p>
        </div>

        {/* Order Details Summary */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-left space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Order ID:</span>
            <span className="text-white font-bold">{order.orderNumber || order.id}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Product:</span>
            <span className="text-white font-bold truncate max-w-[180px]">{order.productName || 'Digital Product'}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount Paid:</span>
            <span className="text-emerald-400 font-bold">₹{order.amount || order.payableAmount || 0}</span>
          </div>
        </div>

        {order.deliveredCode ? (
          <div className="space-y-2 pt-1 border-t border-slate-800">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{settings.codeSectionHeading || 'YOUR REDEEM CODE'}</p>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between font-mono text-sm font-bold text-white shadow-inner">
                  <span className="truncate mr-2">{order.deliveredCode}</span>
                  <button onClick={handleCopy} className="text-emerald-400 hover:text-emerald-300 cursor-pointer flex-shrink-0" title="Copy Code">
                      <Copy className="w-5 h-5" />
                  </button>
              </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-amber-300 text-xs font-mono">
            Payment verification pending or processing. Please refresh shortly.
          </div>
        )}

        {settings.additionalSuccessMessage && (
          <div className="text-xs text-emerald-300 font-mono">
            {settings.additionalSuccessMessage}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-emerald-400 text-slate-950 font-black text-xs rounded-xl tracking-wider hover:bg-emerald-300 transition-colors uppercase font-mono shadow-md cursor-pointer"
        >
          {settings.doneButtonText || 'DONE'}
        </button>
      </div>
    </div>
  );
};
