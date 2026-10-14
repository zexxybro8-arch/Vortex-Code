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
  isPendingVerification?: boolean;
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
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = React.useRef(0);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Clean and reset any stale order fulfillment and verification states on load/order switch
  React.useEffect(() => {
    if (isOpen) {
      stopPolling();
      setFulfilledOrder(null);
      setErrorMessage(null);
      setStatusNotice(null);
      setCopied(false);
      setIsVerifying(false);

      if (checkoutData?.isPendingVerification) {
        executeVerification();
      }
    }
  }, [isOpen, checkoutData?.order?.id, checkoutData?.isPendingVerification]);

  const handleClose = () => {
    stopPolling();
    setFulfilledOrder(null);
    setErrorMessage(null);
    setStatusNotice(null);
    setCopied(false);
    setIsVerifying(false);
    onClose();
  };

  if (!isOpen || !checkoutData) return null;

  const { order, gatewayConfig, productImage } = checkoutData;
  const isGatewayReady = gatewayConfig?.isConfigured;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    addToast('success', 'Redeem code copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const executeVerification = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // Calls server-side verification endpoint
      const result = await api.verifyPayment({
        orderId: order.id,
        gatewayOrderId: checkoutData.gatewayOrder?.gatewayOrderId,
      });

      if (result.status === 'PAID' || result.order?.deliveredCode) {
        stopPolling();
        setIsVerifying(false);
        setStatusNotice(null);
        setFulfilledOrder(result.order);
        addToast('success', 'Payment verified by server! Code attached to order.');
        await refreshCustomerOrders();
        if (onPaymentSuccess) {
          onPaymentSuccess(result.order);
        }
        return;
      }

      if (result.status === 'PENDING') {
        setStatusNotice('Payment in progress — waiting for UPI bank confirmation... (Checking automatically)');
        if (!pollTimerRef.current) {
          pollCountRef.current = 0;
          setIsVerifying(true);
          pollTimerRef.current = setInterval(async () => {
            pollCountRef.current += 1;
            if (pollCountRef.current > 40) {
              stopPolling();
              setIsVerifying(false);
              setStatusNotice('Bank confirmation is taking longer than usual. If money was debited, your code will be added to your Vault shortly.');
              return;
            }
            try {
              const pollRes = await api.verifyPayment({
                orderId: order.id,
                gatewayOrderId: checkoutData.gatewayOrder?.gatewayOrderId,
              });
              if (pollRes.status === 'PAID' || pollRes.order?.deliveredCode) {
                stopPolling();
                setIsVerifying(false);
                setStatusNotice(null);
                setFulfilledOrder(pollRes.order);
                addToast('success', 'Payment confirmed! Code delivered.');
                await refreshCustomerOrders();
                if (onPaymentSuccess) {
                  onPaymentSuccess(pollRes.order);
                }
              }
            } catch {
              // Ignore transient polling notice
            }
          }, 3000);
        }
        return;
      }

      if (result.status === 'FAILED') {
        stopPolling();
        setIsVerifying(false);
        setStatusNotice(null);
        setErrorMessage(result.message || 'Payment was declined or cancelled on gateway.');
        return;
      }

      if (result.status === 'EXPIRED') {
        stopPolling();
        setIsVerifying(false);
        setStatusNotice(null);
        setErrorMessage('Payment session expired.');
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed on the server.');
      addToast('error', err.message || 'Payment verification failed.');
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
            onClick={handleClose}
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


            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setCurrentView('vault');
                }}
                className="flex-1 py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span>Go to Customer Vault</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
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

              {/* Price Breakdown */}
              <div className="pt-2 border-t border-slate-900 font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">AMOUNT PAYABLE</div>
                  <div className="text-lg font-black text-white">
                    ₹{order.amount} <span className="text-[10px] text-slate-400 font-normal">INR</span>
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

            {/* In-Progress / Pending Notice */}
            {statusNotice && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 font-mono animate-pulse">
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-amber-400" />
                <span>{statusNotice}</span>
              </div>
            )}

            {/* 2. PAYMENT METHOD & TRUST GATEWAY SECTION */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Trust Gateway UPI Payment</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isGatewayReady
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {isGatewayReady ? 'GATEWAY: READY' : 'STATUS: OFFLINE'}
                </span>
              </div>

              {isGatewayReady ? (
                /* LIVE TRUST GATEWAY CHECKOUT INTERFACE */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white">Trust Gateway UPI Checkout</h4>
                      <p className="text-xs text-emerald-300 font-mono">
                        Exact Amount Payable: <strong className="text-white font-extrabold">₹{checkoutData.gatewayOrder?.payableAmount || (checkoutData.order as any)?.payableAmount || order.amount}</strong>
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      You will be securely redirected to the official Trust Gateway hosted checkout page to complete UPI payment (PhonePe, Google Pay, Paytm, CRED).
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    {(checkoutData.gatewayOrder?.paymentUrl || (checkoutData.order as any)?.checkoutUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetUrl = checkoutData.gatewayOrder?.paymentUrl || (checkoutData.order as any)?.checkoutUrl;
                          if (targetUrl) {
                            window.location.href = targetUrl;
                          }
                        }}
                        className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Pay ₹{checkoutData.gatewayOrder?.payableAmount || (checkoutData.order as any)?.payableAmount || order.amount} on Trust Gateway</span>
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={executeVerification}
                      disabled={isVerifying}
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl border border-slate-800 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Verifying with Bank...' : 'I have Completed Payment — Verify Status'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* OFFLINE PAYMENT SERVICE NOTIFICATION */
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center space-y-3 text-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Payment Gateway Offline</h4>
                      <p className="text-xs text-amber-300 font-semibold">
                        Payment service temporarily unavailable. Please try again later.
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                      Trust Gateway credentials have not been configured on this host yet. Live payments will activate as soon as TRUST_GATEWAY_API_KEY is supplied.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 px-4 bg-slate-800 text-slate-500 font-extrabold text-xs sm:text-sm rounded-xl cursor-not-allowed opacity-60 flex items-center justify-center gap-2 border border-slate-700"
                    >
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>Payment service temporarily unavailable. Please try again later.</span>
                    </button>
                  </div>
                </div>
              )}

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
