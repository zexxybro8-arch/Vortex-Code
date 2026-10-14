import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Sparkles, DollarSign, ShoppingBag, CheckCircle, Package, RefreshCcw, AlertCircle, X } from 'lucide-react';

export const AdminDiamondsSalesTab: React.FC = () => {
  const { orders, products, storeSettings, resetDiamondAnalytics } = useAdmin();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleResetConfirm = async () => {
    try {
      setIsResetting(true);
      await resetDiamondAnalytics();
      setResetSuccess("✅ Diamond analytics reporting baseline reset successfully.");
      setIsResetModalOpen(false);
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: any) {
      alert("Failed to reset diamond analytics: " + (err.message || "Unknown error"));
    } finally {
      setIsResetting(false);
    }
  };

  const diamondProducts = useMemo(() => {
    return products.filter(p => p.category === 'DIAMONDS');
  }, [products]);

  const diamondProductIds = useMemo(() => {
    return new Set(diamondProducts.map(p => p.id));
  }, [diamondProducts]);

  const allDiamondOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.paymentStatus !== 'PAID') return false;
      if (o.productId && diamondProductIds.has(o.productId)) return true;
      const matched = products.find(p => p.id === o.productId || p.name === o.productName);
      return matched?.category === 'DIAMONDS';
    });
  }, [orders, products, diamondProductIds]);

  const resetAt = storeSettings.diamond_analytics_reset_at || '';

  const filteredDiamondOrders = useMemo(() => {
    return allDiamondOrders.filter(o => !resetAt || o.createdAt > resetAt);
  }, [allDiamondOrders, resetAt]);

  const productSales = useMemo(() => {
    return diamondProducts.map(p => {
      const pOrders = filteredDiamondOrders.filter(o => o.productId === p.id || o.productName === p.name);
      return {
        ...p,
        totalUnits: pOrders.length,
        totalRevenue: pOrders.reduce((sum, o) => sum + Number(o.amountRupees || o.amount || 0), 0),
        totalOrders: pOrders.length
      };
    });
  }, [filteredDiamondOrders, diamondProducts]);

  const totalFilteredRevenue = filteredDiamondOrders.reduce((sum, o) => sum + Number(o.amountRupees || o.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Diamonds Sales & Analytics</h1>
          <p className="text-xs text-slate-400">Track real-time diamond recharges, revenue totals, and customer purchase logs.</p>
        </div>
        <button
          onClick={() => setIsResetModalOpen(true)}
          disabled={isResetting}
          className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Reset Diamond Analytics</span>
        </button>
      </div>

      {resetSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {resetSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="text-xs text-slate-400">Total Successful Diamond Orders</div>
          <div className="text-2xl font-extrabold text-white">{filteredDiamondOrders.length.toLocaleString()}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="text-xs text-slate-400">Total Diamond Revenue</div>
          <div className="text-2xl font-extrabold text-white">₹{totalFilteredRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Diamond Product Sales</h2>
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Units Sold</th>
              <th className="py-3 px-3">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {productSales.map(p => (
              <tr key={p.id} className="hover:bg-slate-950/50 font-mono">
                <td className="py-3 px-3 font-sans font-bold text-white">{p.name}</td>
                <td className="py-3 px-3">{p.totalUnits}</td>
                <td className="py-3 px-3 font-bold text-emerald-400">₹{p.totalRevenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Customer Purchase History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Package</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {allDiamondOrders.map(ord => (
                <tr key={ord.id} className="hover:bg-slate-950/50 font-mono">
                  <td className="py-3 px-3 text-emerald-400">{ord.orderNumber}</td>
                  <td className="py-3 px-3 font-sans">{ord.customerName}</td>
                  <td className="py-3 px-3 font-sans">{ord.productName}</td>
                  <td className="py-3 px-3 font-bold">₹{ord.amountRupees}</td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">{ord.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Reset Diamond Analytics?</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              This will reset the displayed diamond order count and diamond revenue reporting totals. Historical customer orders, payment transactions, customer records, and order details will remain unchanged.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50"
              >
                {isResetting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Confirm Reset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
