import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Sparkles, DollarSign, ShoppingBag, CheckCircle, Package } from 'lucide-react';

export const AdminDiamondsSalesTab: React.FC = () => {
  const { orders, products } = useAdmin();

  const diamondOrders = useMemo(() => {
    return orders.filter(o => 
      o.paymentStatus === 'PAID' && 
      products.find(p => p.id === o.id || p.name === o.productName)?.category === 'DIAMONDS'
    );
  }, [orders, products]);

  const productSales = useMemo(() => {
    return products.filter(p => p.category === 'DIAMONDS').map(p => {
      const pOrders = diamondOrders.filter(o => o.productName === p.name);
      return {
        ...p,
        totalUnits: pOrders.length,
        totalRevenue: pOrders.reduce((sum, o) => sum + o.amountRupees, 0),
        totalOrders: pOrders.length
      };
    });
  }, [diamondOrders, products]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="text-xs text-slate-400">Total Successful Diamond Orders</div>
          <div className="text-2xl font-extrabold text-white">{diamondOrders.length.toLocaleString()}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="text-xs text-slate-400">Total Diamond Revenue</div>
          <div className="text-2xl font-extrabold text-white">₹{diamondOrders.reduce((sum, o) => sum + o.amountRupees, 0).toLocaleString()}</div>
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
              <tr key={p.id} className="hover:bg-slate-950/50">
                <td className="py-3 px-3">{p.name}</td>
                <td className="py-3 px-3">{p.totalUnits}</td>
                <td className="py-3 px-3 font-bold">₹{p.totalRevenue.toLocaleString()}</td>
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
              {diamondOrders.map(ord => (
                <tr key={ord.id} className="hover:bg-slate-950/50">
                  <td className="py-3 px-3 font-mono text-emerald-400">{ord.orderNumber}</td>
                  <td className="py-3 px-3">{ord.customerName}</td>
                  <td className="py-3 px-3">{ord.productName}</td>
                  <td className="py-3 px-3 font-bold">₹{ord.amountRupees}</td>
                  <td className="py-3 px-3 text-slate-400">{ord.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
