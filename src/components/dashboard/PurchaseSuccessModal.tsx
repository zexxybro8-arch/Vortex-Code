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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      api.getCategoricalSettings('redeem').then(res => {
        if (res) setSettings(res);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    if (order.deliveredCode) {
      navigator.clipboard.writeText(order.deliveredCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isPaid = order.paymentStatus === 'PAID';
  const hasCode = Boolean(order.deliveredCode);
  const isOutOfStock = order.deliveryStatus === 'OUT_OF_STOCK_PENDING_REFUND';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in duration-300">
        
        {settings.greenTickEnabled !== false && isPaid && (
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/30">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
        )}

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-white uppercase tracking-wider">
            {isPaid ? (settings.successHeading || 'PAYMENT SUCCESSFUL!') : 'ORDER STATUS'}
          </h2>
          <p className="text-xs text-slate-400">
            {isPaid
              ? (settings.successDescription || 'Your payment has been verified successfully.')
              : 'Payment verification is currently in progress.'}
          </p>
        </div>

        {/* Order Details Summary */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-left space-y-2 text-xs font-mono">
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
          <div className="flex justify-between text-slate-400">
            <span>Payment Status:</span>
            <span className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {order.paymentStatus || 'PENDING'}
            </span>
          </div>
        </div>

        {hasCode ? (
          <div className="space-y-2.5 pt-1 border-t border-slate-800">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              {settings.codeSectionHeading || 'PURCHASED REDEEM CODE'}
            </p>
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between font-mono text-sm font-bold text-emerald-300 shadow-inner">
              <span className="truncate mr-2 tracking-wider">{order.deliveredCode}</span>
              {order.deliveredPin && (
                <span className="text-[10px] text-slate-400 font-mono">PIN: {order.deliveredPin}</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-2.5 px-4 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-300 border border-emerald-400/40'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>CODE COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPY CODE</span>
                </>
              )}
            </button>
          </div>
        ) : isOutOfStock ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-amber-300 text-xs font-mono space-y-1 text-left">
            <p className="font-bold text-amber-200">Notice:</p>
            <p>Payment received, but no unused codes are currently in stock. Your order is marked for priority assistance.</p>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-amber-300 text-xs font-mono">
            Payment verification pending. Please refresh shortly.
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
