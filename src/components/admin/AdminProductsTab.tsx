import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { StoreProduct } from '../../types';
import { Plus, Edit2, Power, Check, X, Shield, Search } from 'lucide-react';

export const AdminProductsTab: React.FC = () => {
  const { products, addProduct, updateProduct } = useAdmin();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [priceRupees, setPriceRupees] = useState(100);
  const [rewardValueRupees, setRewardValueRupees] = useState(1500);
  const [denomination, setDenomination] = useState('₹100');
  const [category, setCategory] = useState<'GAMING' | 'DIGITAL REWARDS' | 'OTHER'>('DIGITAL REWARDS');
  const [stockStatus, setStockStatus] = useState<'AVAILABLE' | 'LIMITED STOCK' | 'OUT OF STOCK'>('AVAILABLE');
  const [description, setDescription] = useState('');

  const openAddModal = () => {
    setEditingProduct(null);
    setName('Google Play Recharge Code');
    setPriceRupees(100);
    setRewardValueRupees(1500);
    setDenomination('₹100');
    setCategory('DIGITAL REWARDS');
    setStockStatus('AVAILABLE');
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: StoreProduct) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPriceRupees(prod.priceRupees);
    setRewardValueRupees(prod.rewardValueRupees);
    setDenomination(prod.denomination);
    setCategory(prod.category);
    setStockStatus(prod.stockStatus);
    setDescription(prod.description);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name,
          priceRupees: Number(priceRupees),
          rewardValueRupees: Number(rewardValueRupees),
          denomination,
          category,
          stockStatus,
          description,
        });
        setFormSuccess(`Product ${name} updated successfully in database!`);
      } else {
        await addProduct({
          name,
          priceRupees: Number(priceRupees),
          rewardValueRupees: Number(rewardValueRupees),
          denomination,
          category,
          stockStatus,
          deliveryInfo: '⚡ Instant Automated Vault Key Delivery',
          image: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
          description,
        });
        setFormSuccess(`Product ${name} created successfully in database!`);
      }
      setIsModalOpen(false);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Database write failed. Changes not saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProductStatus = async (prod: StoreProduct) => {
    const nextEnabled = prod.enabled === false ? true : false;
    try {
      await updateProduct(prod.id, {
        enabled: nextEnabled,
        stockStatus: nextEnabled ? 'AVAILABLE' : 'OUT OF STOCK',
      });
      setFormSuccess(`Product ${prod.name} ${nextEnabled ? 'enabled' : 'disabled'} successfully.`);
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      alert(`Error toggling product status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Product Catalog Management</h1>
          <p className="text-xs text-slate-400">Configure prices, reward values, and real-time inventory availability.</p>
        </div>

        <button
          onClick={openAddModal}
          className="py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {formSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <span>✅</span>
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Recharge Price</th>
              <th className="py-3 px-3">Reward Value</th>
              <th className="py-3 px-3">Denomination</th>
              <th className="py-3 px-3">Real Stock Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {products.map((prod) => {
              const isAvailable = prod.enabled !== false && (prod.stock ?? 0) > 0;
              const isOutOfStock = prod.enabled !== false && (prod.stock ?? 0) === 0;

              return (
                <tr key={prod.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white">{prod.name}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                      {prod.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-white">₹{prod.priceRupees}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                    ₹{prod.rewardValueRupees.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">{prod.denomination}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        prod.enabled === false
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {prod.enabled === false
                        ? 'DISABLED'
                        : isAvailable
                        ? `${prod.stock} Available`
                        : 'OUT OF STOCK'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => toggleProductStatus(prod)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        prod.enabled !== false
                          ? 'text-rose-400 hover:bg-rose-500/20 bg-rose-500/10'
                          : 'text-emerald-400 hover:bg-emerald-500/20 bg-emerald-500/10'
                      }`}
                      title={prod.enabled !== false ? 'Disable Product' : 'Enable Product'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Digital Reward Voucher Pass"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recharge Price (₹)</label>
                  <input
                    type="number"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reward Value (₹)</label>
                  <input
                    type="number"
                    value={rewardValueRupees}
                    onChange={(e) => setRewardValueRupees(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Denomination Label</label>
                  <input
                    type="text"
                    value={denomination}
                    onChange={(e) => setDenomination(e.target.value)}
                    placeholder="e.g. ₹100"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-sans text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="GAMING">GAMING</option>
                    <option value="DIGITAL REWARDS">DIGITAL REWARDS</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
