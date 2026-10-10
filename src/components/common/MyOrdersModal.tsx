import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  ShoppingBag,
  X,
  Gift,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatFullCode, formatMaskedCode } from '../../utils/codeFormat';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const { user, setCurrentView, addToast } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, { code: string; pin: string }>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(10);

  const fetchMyOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getMyOrders(user.email, user.id);
      if (Array.isArray(res)) {
        setOrders(res);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Failed to load redemption history:', err);
      setError('Unable to load your redemption history.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchMyOrders();
    }
  }, [isOpen, fetchMyOrders]);

  if (!isOpen) return null;

  const handleRevealCode = async (orderId: string) => {
    if (!user) return;
    setRevealingId(orderId);
    try {
      const res = await api.revealOrderCode(orderId, user.email, user.id);
      if (res && res.success) {
        setRevealedCodes((prev) => ({
          ...prev,
          [orderId]: {
            code: res.code || 'XXXX XXXX XXXX XXXX',
            pin: res.pin || '',
          },
        }));
        addToast('success', 'Redeem code unlocked successfully!');
      } else {
        addToast('error', res?.error || 'Failed to reveal code.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Security verification failed.');
    } finally {
      setRevealingId(null);
    }
  };

  const paginatedOrders = orders.slice(0, displayLimit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                MY ORDERS / REDEMPTION HISTORY
              </h2>
              <p className="text-[11px] text-slate-400">
                {user ? `Authenticated as ${user.email}` : 'Secure customer transaction vault'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Unauthenticated State */}
          {!user ? (
            <div className="text-center py-12 px-4 space-y-4 bg-slate-950/50 rounded-2xl border border-slate-800">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Sign In Required</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Please sign in to your customer account to view your private redemption history and secure recharge codes.
              </p>
              <button
                onClick={() => {
                  onClose();
                  setCurrentView('login');
                }}
                className="py-2.5 px-6 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : isLoading ? (
            /* Loading State Skeleton */
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex justify-between">
                    <div className="w-24 h-4 bg-slate-800 rounded"></div>
                    <div className="w-20 h-4 bg-slate-800 rounded"></div>
                  </div>
                  <div className="w-48 h-5 bg-slate-800 rounded"></div>
                  <div className="w-full h-12 bg-slate-800 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-8 text-center bg-slate-950/80 border border-rose-500/30 rounded-2xl space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-rose-300">{error}</p>
              <button
                onClick={fetchMyOrders}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          ) : orders.length === 0 ? (
            /* Professional New User Empty State */
            <div className="py-12 px-6 bg-slate-950/60 border border-emerald-500/20 rounded-3xl text-center space-y-5 shadow-xl neon-glow">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <Gift className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  NO REDEMPTIONS YET
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  You haven't purchased any redeem codes yet. Your successful purchases and secure digital code keys will appear here.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    setCurrentView('dashboard');
                  }}
                  className="py-3 px-6 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition-all inline-flex items-center gap-2 cursor-pointer group"
                >
                  <span>BROWSE REDEEM CODES</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <p className="text-[10px] text-slate-500 font-mono">
                Your purchase history is securely saved and encrypted.
              </p>
            </div>
          ) : (
            /* Order History List */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                <span>Showing {paginatedOrders.length} of {orders.length} successful orders</span>
                <span className="text-emerald-400 font-bold">✓ Verified & Secure</span>
              </div>

              {paginatedOrders.map((ord) => {
                const revealed = revealedCodes[ord.id];
                const isRevealing = revealingId === ord.id;
                const formattedDate = ord.purchaseDate
                  ? ord.purchaseDate.replace('T', ' ').substring(0, 16)
                  : 'Recently';

                return (
                  <div
                    key={ord.id}
                    className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg hover:border-emerald-400/60 transition-all"
                  >
                    {/* Top Meta Row */}
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">{ord.orderNumber}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-mono text-[11px]">{formattedDate}</span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        ✓ REDEEMED / COMPLETED
                      </span>
                    </div>

                    {/* Product & Pricing Grid */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-white text-sm sm:text-base">
                          {ord.productName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                          <span className="text-slate-400">Balance: <strong className="text-emerald-400">₹{ord.balance}</strong></span>
                          <span className="text-slate-400">Price Paid: <strong className="text-white">₹{ord.pricePaid}</strong></span>
                          <span className="text-slate-400">Payment: <strong className="text-emerald-400">PAID</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Secure Code Reveal Box */}
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Recharge Code Reference:</span>
                        {ord.deliveredPin && (
                          <span className="text-slate-300">
                            PIN: <strong className="text-emerald-400 font-mono">{revealed ? revealed.pin : '••••'}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-sm sm:text-base font-black tracking-widest text-emerald-300 truncate">
                          {revealed ? revealed.code : formatMaskedCode(ord.deliveredCode)}
                        </div>

                        {revealed ? (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(revealed.code);
                              addToast('success', 'Secret code copied to clipboard!');
                            }}
                            className="py-1.5 px-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevealCode(ord.id)}
                            disabled={isRevealing}
                            className="py-1.5 px-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {isRevealing ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            <span>VIEW CODE</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {orders.length > displayLimit && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 10)}
                    className="py-2 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Load More ({orders.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure 256-Bit Encrypted Vault</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl font-bold transition-all cursor-pointer border border-slate-800"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
};
