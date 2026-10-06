import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Search, ShieldCheck, CheckCircle2, Key, ArrowRight, FileText } from 'lucide-react';

export const OrderLookupPage: React.FC = () => {
  const { orders, setCurrentView } = useAuth();
  const [orderQuery, setOrderQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<any | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const clean = orderQuery.trim().toUpperCase();
    
    if (!clean) {
      setFoundOrder(null);
      return;
    }

    const localMatch = orders.find(
      (o) => o.orderNumber.toUpperCase() === clean || o.id.toUpperCase() === clean
    );

    if (localMatch) {
      setFoundOrder(localMatch);
      return;
    }

    setIsSearching(true);
    try {
      const dbOrder = await api.getOrder(clean);
      if (dbOrder) {
        setFoundOrder({
          id: dbOrder.id,
          orderNumber: dbOrder.orderNumber,
          codeTitle: dbOrder.productName,
          purchaseDate: dbOrder.createdAt ? dbOrder.createdAt.substring(0, 16).replace('T', ' ') : 'Recently',
          status: dbOrder.deliveryStatus === 'DELIVERED' ? 'Completed' : 'Processing',
        });
      } else {
        setFoundOrder(null);
      }
    } catch {
      setFoundOrder(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex flex-col justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 neon-glow">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Order Status Lookup</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Enter your Vortex Code Order ID (e.g. <span className="font-mono text-emerald-400">VRX-2026-8801</span>) to check fulfillment status.
          </p>
        </div>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={orderQuery}
            onChange={(e) => {
              setOrderQuery(e.target.value);
              setSearched(false);
            }}
            placeholder="e.g. VRX-2026-8801"
            className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 font-mono"
            required
          />
          <button
            type="submit"
            className="py-3 px-6 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Search Order</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {searched && (
          <div className="pt-4 border-t border-slate-800">
            {foundOrder ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{foundOrder.orderNumber}</span>
                  <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {foundOrder.status}
                  </span>
                </div>

                <div className="text-sm font-bold text-white">{foundOrder.codeTitle}</div>

                <p className="text-xs text-slate-400">
                  Purchased on: <span className="text-slate-200 font-mono">{foundOrder.purchaseDate}</span>
                </p>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Sign in to view secret digital code key.</span>
                  <button
                    onClick={() => setCurrentView('login')}
                    className="py-1.5 px-3 bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-300"
                  >
                    Sign In to Unlock Key
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                <p>No order found matching "<span className="font-mono text-amber-400">{orderQuery}</span>".</p>
                <p className="text-slate-500">
                  Tip: Check your email receipt or sign in to view all past orders in your private vault.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => setCurrentView('login')}
            className="text-xs text-emerald-400 hover:underline font-medium"
          >
            Or Sign In to View Your Complete Order History →
          </button>
        </div>

      </div>
    </div>
  );
};
