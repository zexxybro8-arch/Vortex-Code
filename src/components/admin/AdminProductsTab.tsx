import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { StoreProduct } from '../../types';
import {
  Plus,
  Edit2,
  Power,
  X,
  Trash2,
} from 'lucide-react';

export const AdminProductsTab: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useAdmin();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    priceRupees: 100,
    rewardValueRupees: 1500,
    denomination: '₹100',
    category: 'DIGITAL REWARDS',
    stockStatus: 'AVAILABLE',
    description: 'Instant digital delivery with secure code',
    enabled: true,
    image: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
  });

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        priceRupees: editingProduct.priceRupees || 0,
        rewardValueRupees: editingProduct.rewardValueRupees || 0,
        denomination: editingProduct.denomination || '',
        category: editingProduct.category || 'DIGITAL REWARDS',
        stockStatus: editingProduct.stockStatus || 'AVAILABLE',
        description: editingProduct.description || '',
        enabled: editingProduct.enabled !== false,
        image: editingProduct.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      });
    } else {
      setFormData({
        name: 'Google Play Recharge Code',
        priceRupees: 100,
        rewardValueRupees: 1500,
        denomination: '₹100',
        category: 'DIGITAL REWARDS',
        stockStatus: 'AVAILABLE',
        description: 'Instant digital delivery with secure code',
        enabled: true,
        image: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      });
    }
  }, [editingProduct, isModalOpen]);

  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: StoreProduct) => {
    setEditingProduct(prod);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: formData.name.trim(),
      priceRupees: Number(formData.priceRupees),
      rewardValueRupees: Number(formData.rewardValueRupees),
      denomination: formData.denomination || `₹${formData.priceRupees}`,
      category: (formData.category || 'DIGITAL REWARDS') as StoreProduct['category'],
      stockStatus: formData.stockStatus || 'AVAILABLE',
      enabled: formData.enabled !== false,
      description: formData.description || '',
      image: formData.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      // Preserve existing design/glow settings on the product
      glowSettings: editingProduct?.glowSettings || {},
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        setFormSuccess(`Product "${payload.name}" updated successfully in database!`);
      } else {
        await addProduct({
          ...payload,
          deliveryInfo: '⚡ Instant Automated Vault Key Delivery',
        });
        setFormSuccess(`Product "${payload.name}" created successfully in database!`);
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
    const nextEnabled = prod.enabled === false;
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

  const handleDeleteProduct = async (prod: StoreProduct) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete product "${prod.name}" (${prod.denomination})?\n\n` +
      `Note: If this product is referenced by existing orders or inventory codes, deletion will be safely blocked to preserve historical data.`
    );
    if (!confirmed) return;

    try {
      await deleteProduct(prod.id);
      setFormSuccess(`Product "${prod.name}" deleted successfully from database.`);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Failed to delete product.';
      // Display clear message and offer safe deactivation alternative
      if (
        prod.enabled !== false &&
        window.confirm(`${msg}\n\nWould you like to deactivate/disable this product instead so customers cannot purchase it?`)
      ) {
        await toggleProductStatus(prod);
      } else {
        alert(msg);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Redeem Code Products & Pricing</h1>
          <p className="text-xs text-slate-400">
            Configure product catalog details, recharge prices, reward values, and inventory status.
          </p>
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
            {products.filter(p => p.category !== 'DIAMONDS').map((prod) => {
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
                        prod.enabled === false || prod.stockStatus === 'OUT OF STOCK'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {prod.enabled === false
                        ? 'DISABLED'
                        : prod.stockStatus === 'OUT OF STOCK'
                        ? 'SOLD OUT / OUT OF STOCK'
                        : `${prod.stock ?? 0} Available`}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit Product Details"
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

                    <button
                      onClick={() => handleDeleteProduct(prod)}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                {editingProduct ? 'Edit Redeem Code Product' : 'Add New Redeem Code Product'}
              </h2>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="e.g. Google Play Recharge Code"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={formData.priceRupees || ''}
                      onChange={(e) => updateFormField('priceRupees', Number(e.target.value))}
                      className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reward Value (₹)</label>
                    <input
                      type="number"
                      value={formData.rewardValueRupees || ''}
                      onChange={(e) => updateFormField('rewardValueRupees', Number(e.target.value))}
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
                      value={formData.denomination}
                      onChange={(e) => updateFormField('denomination', e.target.value)}
                      placeholder="e.g. ₹100"
                      className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Availability</label>
                    <select
                      value={formData.stockStatus}
                      onChange={(e) => updateFormField('stockStatus', e.target.value)}
                      className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-sans text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="OUT OF STOCK">SOLD OUT / OUT OF STOCK</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Image URL</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => updateFormField('image', e.target.value)}
                    placeholder="Image URL"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    placeholder="Product details or redemption terms..."
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
