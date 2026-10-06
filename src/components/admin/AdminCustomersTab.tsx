import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Users, Power, ShieldCheck, Mail, Calendar } from 'lucide-react';

export const AdminCustomersTab: React.FC = () => {
  const { customers, toggleCustomerStatus } = useAdmin();

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Customer Account Management</h1>
          <p className="text-xs text-slate-400">View registered customer profiles, total spend, and manage access status.</p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Customer Name</th>
              <th className="py-3 px-3">Email Address</th>
              <th className="py-3 px-3">Registration Date</th>
              <th className="py-3 px-3">Total Orders</th>
              <th className="py-3 px-3">Total Spent</th>
              <th className="py-3 px-3">Account Status</th>
              <th className="py-3 px-3 text-right">Access Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans text-xs">
                  No registered customer profiles found in database.
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white">{cust.fullName}</td>
                  <td className="py-3.5 px-3 text-emerald-300 font-mono">{cust.email}</td>
                  <td className="py-3.5 px-3 text-slate-400 font-mono">{cust.registrationDate}</td>
                  <td className="py-3.5 px-3 font-mono text-white font-bold">{cust.orderCount} Orders</td>
                  <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">₹{cust.totalSpentRupees}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        cust.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {cust.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => toggleCustomerStatus(cust.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                        cust.status === 'ACTIVE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      {cust.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
