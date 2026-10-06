import React, { useState } from 'react';
import { Tag, Plus, Check, Edit2, ShieldCheck } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  status: 'ACTIVE' | 'DISABLED';
}

export const AdminCategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: 'cat_1', name: 'Google Play', slug: 'google-play', itemCount: 8, status: 'ACTIVE' },
    { id: 'cat_2', name: 'Gaming Vouchers', slug: 'gaming', itemCount: 4, status: 'ACTIVE' },
    { id: 'cat_3', name: 'Digital Rewards', slug: 'digital-rewards', itemCount: 6, status: 'ACTIVE' },
    { id: 'cat_4', name: 'Other', slug: 'other', itemCount: 2, status: 'ACTIVE' },
  ]);

  const [newCatName, setNewCatName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: CategoryItem = {
      id: `cat_${Math.random().toString(36).substring(2, 7)}`,
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/\s+/g, '-'),
      itemCount: 0,
      status: 'ACTIVE',
    };

    setCategories((prev) => [...prev, newCategory]);
    setNewCatName('');
    setIsModalOpen(false);
  };

  const toggleCategoryStatus = (id: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Category Management</h1>
          <p className="text-xs text-slate-400">Configure catalog categories and store taxonomy.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Category Name</th>
              <th className="py-3 px-3">Slug</th>
              <th className="py-3 px-3">Assigned Products</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-950/50 transition-colors">
                <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>{cat.name}</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-400">{cat.slug}</td>
                <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">{cat.itemCount} Products</td>
                <td className="py-3.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      cat.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {cat.status}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={() => toggleCategoryStatus(cat.id)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      cat.status === 'ACTIVE'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {cat.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add New Category</h2>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Google Play Recharge"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold rounded-xl"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
