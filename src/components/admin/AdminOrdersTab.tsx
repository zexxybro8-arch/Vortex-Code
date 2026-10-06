import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { AdminOrder } from '../../types/admin';
import { ShoppingBag, Eye, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const AdminOrdersTab: React.FC = () => {
  const { orders, updateOrderStatus } = useAdmin();
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Order Management</h1>
          <p className="text-xs text-slate-400">Review customer orders, payment status, and instant delivery logs.</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Order ID</th>
              <th className="py-3 px-3">Customer Email</th>
              <th className="py-3 px-3">Product Title</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Payment Status</th>
              <th className="py-3 px-3">Delivery Status</th>
              <th className="py-3 px-3">Timestamp</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {orders.map((ord) => (
              <tr key={ord.id} className="hover:bg-slate-950/50 transition-colors">
                <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">{ord.orderNumber}</td>
                <td className="py-3.5 px-3 text-slate-200">
                  <div className="font-bold">{ord.customerName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{ord.customerEmail}</div>
                </td>
                <td className="py-3.5 px-3 text-slate-300">{ord.productName}</td>
                <td className="py-3.5 px-3 font-mono font-bold text-white">₹{ord.amountRupees}</td>
                <td className="py-3.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      ord.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {ord.paymentStatus}
                  </span>
                </td>
                <td className="py-3.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      ord.deliveryStatus === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ord.deliveryStatus}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{ord.createdAt}</td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={() => setSelectedOrder(ord)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                    title="View Order Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <span>Order Details - {selectedOrder.orderNumber}</span>
            </h2>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-white font-bold">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-emerald-300">{selectedOrder.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="text-white font-sans">{selectedOrder.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="text-emerald-400 font-bold">₹{selectedOrder.amountRupees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-300">{selectedOrder.createdAt}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await updateOrderStatus(selectedOrder.id, 'PAID', 'DELIVERED');
                    setSelectedOrder(null);
                  } catch (err: any) {
                    alert(`Failed to update order: ${err.message}`);
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                Mark as Fully Delivered
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
