import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
  ShoppingBag,
  Clock,
  Key,
  Users,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AdminDashboardTab: React.FC = () => {
  const { stats, orders, setAdminTab } = useAdmin();

  return (
    <div className="space-y-8">
      
      {/* Overview Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Sales */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Sales Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ₹{stats.totalSalesRupees.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Today's Sales</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            ₹{stats.todaysSalesRupees.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">{stats.todaysOrders} orders processed today</p>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats.totalOrders.toLocaleString()}
          </div>
          <p className="text-[10px] text-amber-400 font-mono">
            {stats.pendingOrders} Pending Verification
          </p>
        </div>

        {/* Available Redeem Codes */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Code Key Inventory</span>
            <Key className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats.availableRedeemCodes.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            {stats.usedRedeemCodes.toLocaleString()} Codes Redeemed
          </p>
        </div>

      </div>

      {/* Customer Count Badge */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>
            Registered Customer Accounts: <strong className="text-white font-mono">{stats.registeredCustomers}</strong>
            <span className="mx-2 text-slate-600">|</span>
            Active Members: <strong className="text-emerald-400 font-mono">{stats.activeMembers}</strong>
          </span>
        </div>
        <button
          onClick={() => setAdminTab('customers')}
          className="text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>Manage Customers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recent Customer Orders</h2>
            <p className="text-xs text-slate-400">Live order fulfillment stream.</p>
          </div>
          <button
            onClick={() => setAdminTab('orders')}
            className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Delivery</th>
                <th className="py-3 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">{ord.orderNumber}</td>
                  <td className="py-3.5 px-3 text-slate-200">
                    <div>{ord.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{ord.customerEmail}</div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 font-medium">{ord.productName}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
