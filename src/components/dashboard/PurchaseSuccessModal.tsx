import React, { useState, useEffect } from 'react';
import { X, Check, Copy, Clock, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({ isOpen, onClose, order }) => {
  const [settings, setSettings] = useState<any>({});
  const [copied, setCopied] = useState(false);

  // Distinguish between Diamond top-up orders and Redeem Code orders
  const isDiamondsOrder = Boolean(
    order && (
      order.orderType === 'DIAMOND_PURCHASE' ||
      order.productCategory === 'DIAMONDS' ||
      (typeof order.productName === 'string' && order.productName.toLowerCase().includes('diamond')) ||
      order.category === 'diamonds' ||
      order.category === 'DIAMONDS'
    )
  );

  useEffect(() => {
    if (isOpen && order) {
      setCopied(false);
      const categoryKey = isDiamondsOrder ? 'diamonds' : 'redeem';
      api.getCategoricalSettings(categoryKey).then(res => {
        if (res && Object.keys(res).length > 0) {
          setSettings(res);
        }
      }).catch(() => {});
    }
  }, [isOpen, order, isDiamondsOrder]);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    if (order.deliveredCode) {
      navigator.clipboard.writeText(order.deliveredCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const paymentStatus = (order.paymentStatus || 'PENDING').toUpperCase();
  const isPaid = paymentStatus === 'PAID';
  const isFailed = paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED';
  const isPending = !isPaid && !isFailed;

  const hasCode = Boolean(order.deliveredCode);
  const isOutOfStock = order.deliveryStatus === 'OUT_OF_STOCK_PENDING_REFUND';

  // Mutually exclusive fulfillment status for PAID orders
  const isVerifiedAndFulfilled = isPaid && (isDiamondsOrder || hasCode);
  const isVerifiedFulfillmentPending = isPaid && !isDiamondsOrder && !hasCode;

  // Defaults for Diamonds if not saved in settings
  const defaultDiamondEnglishDelivery =
    'Diamonds will be credited directly to your Free Fire UID Mail Box within 5-15 minutes after payment verification.';
  const defaultDiamondHindiDelivery =
    'Payment hone ke baad Diamonds aapke Free Fire Uid Mail Box me 5-15 minute me bhej diye jayenge.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-w-md w-full text-center space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button top-right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-950/60 hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ==================== STATE 1: PAYMENT PENDING ==================== */}
        {isPending && (
          <>
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500/30">
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {settings.paymentPendingHeading || 'PAYMENT PENDING'}
              </h2>
              <p className="text-xs text-slate-400">
                {settings.paymentPendingMessage || 'Payment verification is currently in progress.'}
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
                <span className="text-white font-bold truncate max-w-[200px]">{order.productName || (isDiamondsOrder ? 'DIAMOND' : 'Google Play Code')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-white font-bold">₹{order.amount || order.payableAmount || 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Status:</span>
                <span className="text-amber-400 font-bold">PENDING</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-amber-300 text-xs font-mono text-left space-y-1">
              <p className="font-bold text-amber-200">Verification in progress:</p>
              <p>Your transaction is being confirmed with the payment gateway. If payment was completed, it will be automatically verified shortly.</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl tracking-wider transition-colors uppercase font-mono shadow-md cursor-pointer"
            >
              {settings.closeButtonText || 'CLOSE'}
            </button>
          </>
        )}

        {/* ==================== STATE 2: PAYMENT FAILED ==================== */}
        {isFailed && (
          <>
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-rose-500/30">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-rose-400 uppercase tracking-wider">
                {settings.paymentFailedHeading || 'PAYMENT FAILED'}
              </h2>
              <p className="text-xs text-slate-400">
                {settings.paymentFailedMessage || 'Payment transaction failed or was declined.'}
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
                <span className="text-white font-bold truncate max-w-[200px]">{order.productName || (isDiamondsOrder ? 'DIAMOND' : 'Google Play Code')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-slate-400 font-bold">₹{order.amount || order.payableAmount || 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Status:</span>
                <span className="text-rose-400 font-bold">FAILED</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-black text-xs rounded-xl tracking-wider transition-colors uppercase font-mono cursor-pointer"
            >
              {settings.closeButtonText || 'CLOSE'}
            </button>
          </>
        )}

        {/* ==================== STATE 3: PAYMENT VERIFIED & FULFILLED ==================== */}
        {isVerifiedAndFulfilled && (
          <>
            {settings.greenTickEnabled !== false && (
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
            )}

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {settings.successHeading || (isDiamondsOrder ? 'PURCHASE SUCCESSFUL!' : 'PAYMENT SUCCESSFUL!')}
              </h2>
              <p className="text-xs text-slate-400">
                {settings.successDescription || (isDiamondsOrder ? 'Your diamond top-up or order has been completed' : 'Your payment has been verified successfully.')}
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
                <span className="text-white font-bold truncate max-w-[200px]">{order.productName || (isDiamondsOrder ? 'DIAMOND' : 'Google Play Code')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount Paid:</span>
                <span className="text-emerald-400 font-bold">₹{order.amount || order.payableAmount || 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Status:</span>
                <span className="text-emerald-400 font-bold">PAID</span>
              </div>
            </div>

            {/* PRODUCT SPECIFIC FULFILLMENT: DIAMONDS */}
            {isDiamondsOrder ? (
              <div className="space-y-3 pt-1 border-t border-slate-800 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                    {settings.deliveryNoticeHeading || 'DIAMONDS DELIVERY INSTRUCTIONS'}
                  </p>
                </div>

                {/* Configured English Delivery Message */}
                <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl text-xs text-slate-200 font-sans leading-relaxed">
                  <div className="font-semibold text-emerald-300 text-[11px] mb-1 font-mono uppercase tracking-wide">
                    Delivery Notice (English):
                  </div>
                  <div className="whitespace-pre-line">
                    {settings.englishDeliveryMessage || defaultDiamondEnglishDelivery}
                  </div>
                </div>

                {/* Configured Hindi / Hinglish Delivery Message */}
                <div className="p-3.5 bg-slate-950/80 border border-emerald-500/20 rounded-2xl text-xs text-slate-300 font-sans leading-relaxed">
                  <div className="font-semibold text-emerald-400/80 text-[11px] mb-1 font-mono uppercase tracking-wide">
                    Delivery Notice (Hindi / Hinglish):
                  </div>
                  <div className="whitespace-pre-line">
                    {settings.hindiHinglishDeliveryMessage || defaultDiamondHindiDelivery}
                  </div>
                </div>

                {/* Delivery Time Estimate */}
                {settings.deliveryTimeMessage && (
                  <p className="text-[10px] text-slate-400 font-mono text-center">
                    ⏱ {settings.deliveryTimeMessage}
                  </p>
                )}
              </div>
            ) : (
              /* PRODUCT SPECIFIC FULFILLMENT: REDEEM CODE */
              <div className="space-y-2.5 pt-1 border-t border-slate-800">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                  {settings.codeSectionHeading || 'PURCHASED REDEEM CODE'}
                </p>
                <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between font-mono text-sm font-bold text-emerald-300 shadow-inner">
                  <span className="truncate mr-2 tracking-wider">{order.deliveredCode}</span>
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
                      <span>{settings.copyCodeButtonText || 'COPY CODE'}</span>
                    </>
                  )}
                </button>

                {settings.additionalSuccessMessage && (
                  <div className="text-xs text-emerald-300 font-mono pt-1">
                    {settings.additionalSuccessMessage}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-emerald-400 text-slate-950 font-black text-xs rounded-xl tracking-wider hover:bg-emerald-300 transition-colors uppercase font-mono shadow-md cursor-pointer"
            >
              {settings.doneButtonText || settings.closeButtonText || 'DONE'}
            </button>
          </>
        )}

        {/* ==================== STATE 4: PAYMENT VERIFIED BUT FULFILLMENT PENDING ==================== */}
        {isVerifiedFulfillmentPending && (
          <>
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/30">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {settings.successHeading || 'PAYMENT VERIFIED'}
              </h2>
              <p className="text-xs text-slate-400">
                {settings.successDescription || 'Payment received and verified successfully.'}
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
                <span className="text-white font-bold truncate max-w-[200px]">{order.productName || 'Digital Product'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount Paid:</span>
                <span className="text-emerald-400 font-bold">₹{order.amount || order.payableAmount || 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Status:</span>
                <span className="text-emerald-400 font-bold">PAID</span>
              </div>
            </div>

            {isOutOfStock ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-amber-300 text-xs font-mono space-y-1 text-left">
                <p className="font-bold text-amber-200">Stock Allocation Notice:</p>
                <p>Payment verified, but code stock is temporarily depleted. Your order has been registered for immediate fulfillment or support assistance.</p>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-slate-300 text-xs font-mono space-y-1 text-left">
                <p className="font-bold text-emerald-400">Fulfillment in progress:</p>
                <p>Payment has been confirmed. Your digital code is being generated and assigned. Please check My Orders shortly.</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-emerald-400 text-slate-950 font-black text-xs rounded-xl tracking-wider hover:bg-emerald-300 transition-colors uppercase font-mono shadow-md cursor-pointer"
            >
              {settings.doneButtonText || 'DONE'}
            </button>
          </>
        )}

      </div>
    </div>
  );
};
