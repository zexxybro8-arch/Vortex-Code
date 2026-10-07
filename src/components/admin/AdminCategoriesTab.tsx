import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { AdminCategory } from '../../types/admin';
import {
  Tag,
  Plus,
  Check,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ArrowUpDown,
  AlertTriangle,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminCategoriesTab: React.FC = () => {
  const { categories, addCategory, updateCategory, toggleCategory, deleteCategory } = useAdmin();

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDenomination, setNewDenomination] = useState('₹');
  const [newSortOrder, setNewSortOrder] = useState<number>(categories.length + 1);
  const [newEnabled, setNewEnabled] = useState(true);

  // Edit Modal state
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editDenomination, setEditDenomination] = useState('');
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [editEnabled, setEditEnabled] = useState(true);

  // Delete confirm state
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlertNotice({ type, message });
    setTimeout(() => setAlertNotice(null), 4000);
  };

  const handleOpenCreate = () => {
    setNewName('');
    setNewDenomination('₹');
    setNewSortOrder(categories.length + 1);
    setNewEnabled(true);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDenomination.trim()) return;

    let cleanDenom = newDenomination.trim();
    if (!cleanDenom.startsWith('₹')) {
      cleanDenom = `₹${cleanDenom.replace(/\D/g, '') || cleanDenom}`;
    }

    setIsSubmitting(true);
    try {
      await addCategory({
        name: newName.trim(),
        denomination: cleanDenom,
        sortOrder: Number(newSortOrder),
        enabled: newEnabled,
      });
      setIsCreateModalOpen(false);
      showAlert('success', `Recharge category "${cleanDenom}" created successfully!`);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDenomination(cat.denomination);
    setEditSortOrder(cat.sortOrder);
    setEditEnabled(cat.enabled);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim() || !editDenomination.trim()) return;

    let cleanDenom = editDenomination.trim();
    if (!cleanDenom.startsWith('₹')) {
      cleanDenom = `₹${cleanDenom.replace(/\D/g, '') || cleanDenom}`;
    }

    setIsSubmitting(true);
    try {
      await updateCategory(editingCategory.id, {
        name: editName.trim(),
        denomination: cleanDenom,
        sortOrder: Number(editSortOrder),
        enabled: editEnabled,
      });
      setEditingCategory(null);
      showAlert('success', `Category "${cleanDenom}" updated successfully!`);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (cat: AdminCategory) => {
    try {
      await toggleCategory(cat.id);
      const action = cat.enabled ? 'Disabled' : 'Enabled';
      showAlert(
        'success',
        `Category ${cat.denomination} has been ${action}. ${
          cat.enabled ? 'It is now hidden from the customer storefront.' : 'It is now active and visible to customers.'
        }`
      );
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to toggle category');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      showAlert('success', `Category ${categoryToDelete.denomination} permanently deleted.`);
      setCategoryToDelete(null);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort categories by sortOrder ascending
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Recharge Categories & Denominations</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage recharge price categories (₹100, ₹120, ₹150, etc.). When a category is turned <span className="text-rose-400 font-bold font-mono">OFF</span>, it completely disappears from the customer storefront filter, cards, and counts, and backend orders are rejected.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recharge Category</span>
        </button>
      </div>

      {/* Notice alert */}
      {alertNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            alertNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{alertNotice.message}</span>
          <button onClick={() => setAlertNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Categories Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              ACTIVE RECHARGE CATEGORIES ({categories.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Enabled: {categories.filter((c) => c.enabled).length} | Disabled: {categories.filter((c) => !c.enabled).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-3">Sort</th>
                <th className="py-3 px-3">Denomination</th>
                <th className="py-3 px-3">Category Name</th>
                <th className="py-3 px-3">Catalog Stock</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">ON / OFF Toggle</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedCategories.map((cat) => (
                <tr
                  key={cat.id}
                  className={`transition-colors ${
                    cat.enabled ? 'hover:bg-slate-950/50' : 'bg-slate-950/40 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Sort Order */}
                  <td className="py-3.5 px-3 font-mono text-slate-400 font-bold">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[11px] text-emerald-400">
                      {cat.sortOrder}
                    </span>
                  </td>

                  {/* Denomination */}
                  <td className="py-3.5 px-3 font-mono font-black text-sm">
                    <span
                      className={`px-2.5 py-1 rounded-xl border ${
                        cat.enabled
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {cat.denomination}
                    </span>
                  </td>

                  {/* Name & ID */}
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      ID: {cat.id}
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-emerald-400 font-bold">
                      {cat.availableStock ?? 0} Unused Codes
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      ({cat.productCount ?? 1} product tier)
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3">
                    {cat.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        DISABLED
                      </span>
                    )}
                  </td>

                  {/* Clear ON/OFF Toggle */}
                  <td className="py-3.5 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(cat)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        cat.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                      }`}
                      title={cat.enabled ? 'Click to Disable Category' : 'Click to Enable Category'}
                    >
                      {cat.enabled ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                          <span>ON</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-slate-400" />
                          <span>OFF</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-2 text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-2 text-slate-400 hover:text-rose-400 bg-slate-950 rounded-lg border border-slate-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CATEGORY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Create Recharge Category</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Denomination (e.g. ₹100, ₹120, ₹150) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={newDenomination}
                  onChange={(e) => setNewDenomination(e.target.value)}
                  placeholder="₹120"
                  required
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. ₹120 Recharge Voucher"
                  required
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={newSortOrder}
                    onChange={(e) => setNewSortOrder(Number(e.target.value))}
                    min={1}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewEnabled(!newEnabled)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-mono border flex items-center justify-center gap-1.5 cursor-pointer ${
                      newEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {newEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Category: {editingCategory.denomination}</span>
              </h2>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Denomination
                </label>
                <input
                  type="text"
                  value={editDenomination}
                  onChange={(e) => setEditDenomination(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Storefront Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditEnabled(!editEnabled)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-mono border flex items-center justify-center gap-1.5 cursor-pointer ${
                      editEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {editEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  {isSubmitting ? 'Updating...' : 'Update Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white">Delete Category?</h2>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete the{' '}
              <span className="font-bold text-white font-mono">{categoryToDelete.denomination}</span> category?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="py-2 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="py-2 px-4 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
