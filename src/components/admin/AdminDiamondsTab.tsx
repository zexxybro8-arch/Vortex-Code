import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Sparkles } from 'lucide-react';

export const AdminDiamondsTab: React.FC = () => {
  const { products } = useAdmin();
  
  // Filter only diamonds products
  const diamondProducts = products.filter(p => p.category === 'DIAMONDS');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Diamonds Management</h1>
          <p className="text-xs text-slate-400">Manage Free Fire diamond top-up products.</p>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
         <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
             {diamondProducts.map(p => (
               <tr key={p.id} className="hover:bg-slate-950/50">
                 <td className="py-3 px-3 font-bold">{p.name}</td>
                 <td className="py-3 px-3">₹{p.priceRupees}</td>
                 <td className="py-3 px-3">{p.enabled ? 'Enabled' : 'Disabled'}</td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
