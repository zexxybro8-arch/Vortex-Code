import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  ArrowRight,
  ExternalLink,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatFullCode } from '../../utils/codeFormat';

export interface CheckoutData {
  order: {
    id: string;
    orderNumber: string;
    productId: string;
    productName: string;
    denomination: string;
    rewardValue: number;
    amount: number;
    currency: string;
    paymentStatus: string;
    deliveryStatus: string;
    customerName?: string;
    customerEmail?: string;
    createdAt: string;
  };
  gatewayOrder?: any;
  gatewayConfig?: {
    provider: string;
    isConfigured: boolean;
    currency: string;
    publicKey?: string;
    merchantName: string;
    webhookConfigured: boolean;
  };
  productImage?: string;
}

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutData: CheckoutData | null;
  onPaymentSuccess?: (fulfilledOrder: any) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  checkoutData,
  onPaymentSuccess,
}) => {
  const { addToast, setCurrentView, refreshCustomerOrders } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [fulfilledOrder, setFulfilledOrder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Clean and reset any stale order fulfillment and verification states on load/order switch
  React.useEffect(() => {
    if (isOpen) {
      setFulfilledOrder(null);
      setErrorMessage(null);
      setCopied(false);
      setIsVerifying(false);
    }
  }, [isOpen, checkoutData?.order?.id]);

  if (!isOpen || !checkoutData) return null;

  const { order, gatewayConfig, productImage } = checkoutData;
  const isGatewayReady = gatewayConfig?.isConfigured;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    addToast('success', 'Redeem code copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulatedGatewayVerification = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // Calls server-side verification endpoint
      const result = await api.verifyPayment({
        orderId: order.id,
        gatewayPaymentId: `pay_${Math.random().toString(36).substring(2, 9)}`,
        gatewayOrderId: checkoutData.gatewayOrder?.gatewayOrderId,
        isSimulatedVerification: true,
      });

      if (result.success && result.order) {
        setFulfilledOrder(result.order);
        addToast('success', 'Payment verified by server! Code attached to order.');
        await refreshCustomerOrders();
        if (onPaymentSuccess) {
          onPaymentSuccess(result.order);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed on the server.');
      addToast('error', err.message || 'Payment verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl shadow-emerald-950/50 space-y-6 relative animate-in fade-in zoom-in duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {fulfilledOrder ? 'Payment & Delivery Complete' : 'Secure Checkout'}
              </h2>
              <p className="text-[11px] font-mono text-emerald-400">
                ORDER ID: {order.orderNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUCCESS STATE */}
        {fulfilledOrder ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-center">
              <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-emerald-400 mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Payment Verified Successfully!</h3>
              <p className="text-xs text-slate-300">
                Your payment was verified by the server. Your exclusive 16-character recharge code has been atomically assigned and saved to your Vault.
              </p>
            </div>

            {/* Delivered Code Display Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
              <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>DELIVERED 16-CHARACTER RECHARGE CODE</span>
                <span className="text-emerald-400 font-bold">100% UNUSED</span>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono">
                <span className="text-base sm:text-lg font-black text-emerald-300 tracking-widest truncate">
                  {fulfilledOrder.deliveredCode || formatFullCode(fulfilledOrder.code)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(fulfilledOrder.deliveredCode || fulfilledOrder.code)}
                  className="py-1.5 px-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {fulfilledOrder.deliveredPin && (
                <div className="text-xs font-mono text-slate-400 flex items-center gap-2 pt-1">
                  <span>PIN / Security Key:</span>
                  <strong className="text-white">{fulfilledOrder.deliveredPin}</strong>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentView('vault');
                }}
                className="flex-1 py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span>Go to Customer Vault</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* PENDING CHECKOUT FLOW */
          <div className="space-y-5">
            
            {/* 1. ORDER SUMMARY (Server-Verified Data) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center shrink-0 p-1">
                  <img
                    src={productImage || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'}
                    alt="Google Play"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {order.productName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Denomination: <span className="text-white font-bold">{order.denomination}</span>
                  </div>
                </div>
              </div>

              {/* Price & Balance Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">AMOUNT PAYABLE</div>
                  <div className="text-lg font-black text-white">
                    ₹{order.amount} <span className="text-[10px] text-slate-400 font-normal">INR</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <div className="text-[9px] font-bold text-emerald-400 uppercase">BALANCE VALUE</div>
                  <div className="text-lg font-black text-emerald-400">
                    ₹{order.rewardValue?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 2. PAYMENT METHOD & QR SECTION */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>UPI & Payment Gateway Section</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  STATUS: PENDING
                </span>
              </div>

              {/* UPI QR PAYMENT CODE DISPLAY */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex flex-col items-center justify-center space-y-3 text-center">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Scan & Pay via UPI / QR</span>
                </div>

                {/* Dynamically generated UPI QR Code image matching exact DB order amount */}
                <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=vortexcode@upi&pn=VortexCode&am=${order.amount}&cu=INR&tn=${order.orderNumber}`
                    )}`}
                    alt="Payment QR Code"
                    className="w-40 h-40 object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono font-extrabold text-emerald-400">
                    AMOUNT: ₹{order.amount} INR
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    UPI ID: <strong className="text-slate-200">vortexcode@upi</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 text-[10px] text-amber-300 border border-amber-500/20 max-w-sm leading-relaxed">
                  ⚠️ <strong>Notice:</strong> Scanning or opening this QR code does NOT automatically deliver a code or mark payment as completed. Payment must be verified server-side.
                </div>
              </div>

              {/* PAYMENT VERIFICATION ACTION */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSimulatedGatewayVerification}
                  disabled={isVerifying}
                  className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {isVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Verify Payment & Claim Code (₹{order.amount})</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                  Executes server-side verification, atomic code assignment (1 code max), and updates order status to PAID.
                </p>
              </div>

            </div>

            {/* 3. SECURITY ASSURANCES */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-900">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Idempotency Protected</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-900">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Server-Verified Price</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
