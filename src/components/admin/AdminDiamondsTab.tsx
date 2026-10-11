import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Sparkles, Plus, Edit2, Trash2 } from 'lucide-react';

export const AdminDiamondsTab: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Filter only diamonds products
  const diamondProducts = products.filter(p => p.category === 'DIAMONDS');

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const quantity = formData.get('quantity') as string;
    const prodData = {
      name: `${quantity} Diamonds`,
      priceRupees: Number(formData.get('price')),
      rewardValueRupees: Number(quantity),
      denomination: `${quantity} Diamonds`,
      category: 'DIAMONDS' as any,
      description: formData.get('description') as string,
      image: formData.get('image') as string,
      enabled: formData.get('status') === 'enabled',
      sortOrder: Number(formData.get('sortOrder') || 0),
    };

    if (editingProduct) {
      // Remove name from update if we want to keep it or update it automatically
      // Actually, updating name is fine based on new quantity
      await updateProduct(editingProduct.id, prodData);
    } else {
      await addProduct(prodData);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Diamonds Management</h1>
          <p className="text-xs text-slate-400">Manage Free Fire diamond top-up products.</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition"
        >
          <Plus size={14} /> Add Diamonds Product
        </button>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
         <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Quantity</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
             {diamondProducts.map(p => (
               <tr key={p.id} className="hover:bg-slate-950/50">
                 <td className="py-3 px-3">{p.rewardValueRupees} Diamonds</td>
                 <td className="py-3 px-3">₹{p.priceRupees}</td>
                 <td className="py-3 px-3">{p.enabled ? 'Enabled' : 'Disabled'}</td>
                 <td className="py-3 px-3 text-right">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="text-slate-400 hover:text-white mr-2"><Edit2 size={14}/></button>
                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-white">{editingProduct ? 'Edit' : 'Add'} Diamond Product</h2>
            <input name="quantity" type="number" defaultValue={editingProduct?.rewardValueRupees} placeholder="Diamond Quantity" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" required />
            <input name="price" type="number" defaultValue={editingProduct?.priceRupees} placeholder="Price (INR)" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" required />
            <input name="image" defaultValue={editingProduct?.image} placeholder="Image URL" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" required />
            <input name="sortOrder" type="number" defaultValue={editingProduct?.sortOrder || 0} placeholder="Sort Order" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" />
            <select name="status" defaultValue={editingProduct?.enabled ? 'enabled' : 'disabled'} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white">
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
