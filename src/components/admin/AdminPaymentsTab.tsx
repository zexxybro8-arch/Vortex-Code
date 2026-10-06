import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const AdminPaymentsTab: React.FC = () => {
  const { payments } = useAdmin();

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Payment Gateway Logs</h1>
          <p className="text-xs text-slate-400">Review 256-bit encrypted gateway transactions and payment confirmations.</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Transaction ID</th>
              <th className="py-3 px-3">Order ID</th>
              <th className="py-3 px-3">Customer Email</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Payment Method</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans text-xs">
                  No verified payment gateway transactions recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-emerald-300">{pay.transactionId}</td>
                  <td className="py-3.5 px-3 text-slate-300">{pay.orderId}</td>
                  <td className="py-3.5 px-3 text-slate-400">{pay.customerEmail}</td>
                  <td className="py-3.5 px-3 font-bold text-white">₹{pay.amountRupees}</td>
                  <td className="py-3.5 px-3 text-slate-300 font-sans">{pay.paymentMethod}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pay.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {pay.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 text-[11px]">{pay.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
