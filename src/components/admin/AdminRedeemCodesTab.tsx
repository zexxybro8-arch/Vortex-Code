import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
  Key,
  Plus,
  Eye,
  EyeOff,
  Search,
  Check,
  Sparkles,
  Trash2,
  Edit2,
  AlertCircle,
  AlertTriangle,
  X,
  Filter,
  RefreshCw,
  Dices,
} from 'lucide-react';
import { generate16CharKey, formatFullCode, formatMaskedCode } from '../../utils/codeFormat';
import type { AdminRedeemCode } from '../../types/admin';

export const AdminRedeemCodesTab: React.FC = () => {
  const {
    products,
    categories,
    redeemCodes,
    addSingleRedeemCode,
    addBulkRedeemCodes,
    updateRedeemCode,
    deleteRedeemCode,
    refreshData,
  } = useAdmin();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'RESERVED' | 'USED' | 'DISABLED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Modals & form state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<AdminRedeemCode | null>(null);
  const [codeToEdit, setCodeToEdit] = useState<AdminRedeemCode | null>(null);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  // Edit Code State
  const [editCodeValue, setEditCodeValue] = useState('');
  const [editPinValue, setEditPinValue] = useState('');
  const [editStatusValue, setEditStatusValue] = useState<'AVAILABLE' | 'RESERVED' | 'USED' | 'DISABLED'>('AVAILABLE');
  const [editProductIdValue, setEditProductIdValue] = useState('');

  // Bulk Generator State
  const [bulkMode, setBulkMode] = useState<'generate' | 'paste'>('generate');
  const [quantity, setQuantity] = useState(5);
  const [pastedCodes, setPastedCodes] = useState('');

  // Single Code State
  const [singleCode, setSingleCode] = useState('');
  const [singlePin, setSinglePin] = useState('');
  const [singleStatus, setSingleStatus] = useState<'AVAILABLE' | 'RESERVED' | 'USED' | 'DISABLED'>('AVAILABLE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Available denomination filters derived from categories and products
  const uniqueDenominations = Array.from(
    new Set([
      ...categories.map((c) => c.denomination),
      ...products.map((p) => p.denomination),
    ])
  ).filter(Boolean);

  const filteredCodes = redeemCodes.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'ALL' ||
      c.denomination === categoryFilter ||
      `₹${c.denominationRupees}` === categoryFilter;

    const matchesSearch =
      c.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.codeMasked.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.fullCodeSecret.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.pin && c.pin.includes(searchQuery));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const toggleCodeReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);
    setAlertSuccess(null);

    const targetProd = products.find((p) => p.id === selectedProductId) || products[0];
    if (!targetProd) {
      setAlertError('Please select a valid product.');
      return;
    }

    setIsSubmitting(true);
    try {
      let codesToSave: string[] = [];

      if (bulkMode === 'generate') {
        codesToSave = Array.from({ length: quantity }).map(() => {
          const key16 = generate16CharKey();
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          return `${key16}:${pin}`;
        });
      } else {
        codesToSave = pastedCodes
          .split(/[\r\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (codesToSave.length === 0) {
          throw new Error('Please enter at least one redeem code.');
        }
      }

      const result = await addBulkRedeemCodes(targetProd.id, codesToSave.join('\n'));
      setAlertSuccess(
        `✅ Successfully added ${result.addedCount} redeem code(s) for ${targetProd.name} (${targetProd.denomination}) to the database! Stock updated.`
      );
      setIsBulkModalOpen(false);
      setPastedCodes('');
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err: any) {
      setAlertError(err.message || 'Failed to save redeem codes to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);
    setAlertSuccess(null);

    const targetProd = products.find((p) => p.id === selectedProductId) || products[0];
    if (!targetProd) {
      setAlertError('Please select a valid product.');
      return;
    }

    if (!singleCode.trim()) {
      setAlertError('Please enter a valid code key.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSingleRedeemCode(
        targetProd.id,
        singleCode.trim(),
        singlePin.trim() || undefined,
        singleStatus
      );
      setAlertSuccess(
        `✅ Added redeem code for ${targetProd.name} (${targetProd.denomination}) with status ${singleStatus} to database! Stock updated.`
      );
      setIsSingleModalOpen(false);
      setSingleCode('');
      setSinglePin('');
      setSingleStatus('AVAILABLE');
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err: any) {
      setAlertError(err.message || 'Failed to save code to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditCode = (code: AdminRedeemCode) => {
    setCodeToEdit(code);
    setEditCodeValue(code.fullCodeSecret || code.codeMasked);
    setEditPinValue(code.pin || '');
    setEditStatusValue(code.status || 'AVAILABLE');
    setEditProductIdValue(code.productId || products[0]?.id || '');
  };

  const handleEditCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeToEdit) return;
    setAlertError(null);
    setAlertSuccess(null);
    setIsSubmitting(true);

    try {
      await updateRedeemCode(codeToEdit.id, {
        code: editCodeValue.trim(),
        pin: editPinValue.trim(),
        status: editStatusValue,
        productId: editProductIdValue || undefined,
      });
      setAlertSuccess(`✅ Redeem code updated successfully in database! Status: ${editStatusValue}`);
      setCodeToEdit(null);
      await refreshData();
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err: any) {
      setAlertError(err.message || 'Failed to update code in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!codeToDelete) return;
    setAlertError(null);
    setAlertSuccess(null);
    setIsDeleting(true);

    try {
      const isForce = codeToDelete.status === 'USED';
      await deleteRedeemCode(codeToDelete.id, isForce);
      setAlertSuccess(
        `✅ Redeem code [${codeToDelete.codeMasked}] (${codeToDelete.productName} ${codeToDelete.denomination}) deleted permanently from database! Stock recalculated.`
      );
      setCodeToDelete(null);
      await refreshData();
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err: any) {
      setAlertError(err.message || 'Database deletion failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: AdminRedeemCode['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>AVAILABLE (IN STOCK)</span>
          </span>
        );
      case 'RESERVED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>RESERVED</span>
          </span>
        );
      case 'USED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>USED (SOLD)</span>
          </span>
        );
      case 'DISABLED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>DISABLED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Key className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Individual Recharge Code Management</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete database control: add single/bulk codes, change denominations, toggle status (Available, Reserved, Used, Disabled), and manage stock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (products.length > 0 && !selectedProductId) setSelectedProductId(products[0].id);
              setSingleCode(generate16CharKey());
              setSinglePin(Math.floor(1000 + Math.random() * 9000).toString());
              setSingleStatus('AVAILABLE');
              setIsSingleModalOpen(true);
            }}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Single Code</span>
          </button>

          <button
            onClick={() => {
              if (products.length > 0 && !selectedProductId) setSelectedProductId(products[0].id);
              setIsBulkModalOpen(true);
            }}
            className="py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bulk Codes</span>
          </button>
        </div>
      </div>

      {alertSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{alertSuccess}</span>
        </div>
      )}

      {alertError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{alertError}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-400" />
              Status:
            </span>
            {(['ALL', 'AVAILABLE', 'RESERVED', 'USED', 'DISABLED'] as const).map((st) => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? st === 'AVAILABLE'
                        ? 'bg-emerald-400 text-slate-950 shadow'
                        : st === 'RESERVED'
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : st === 'USED'
                        ? 'bg-blue-400 text-slate-950 shadow'
                        : st === 'DISABLED'
                        ? 'bg-rose-400 text-slate-950 shadow'
                        : 'bg-emerald-400 text-slate-950 shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code keys, PINs, products..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Category / Denomination Quick Filter */}
        {uniqueDenominations.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Denomination:</span>
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-md transition-all cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ALL ({redeemCodes.length})
            </button>
            {uniqueDenominations.map((denom) => {
              const count = redeemCodes.filter(
                (c) => c.denomination === denom || `₹${c.denominationRupees}` === denom
              ).length;
              return (
                <button
                  key={denom}
                  onClick={() => setCategoryFilter(denom)}
                  className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-md transition-all cursor-pointer ${
                    categoryFilter === denom
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {denom} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Codes Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredCodes.length} code(s)</span>
          <button
            onClick={() => refreshData()}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Table</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Code Key</th>
                <th className="py-3 px-4">Denomination</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    No recharge codes match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((item) => {
                  const isRevealed = revealedIds[item.id];

                  return (
                    <tr key={item.id} className="hover:bg-slate-950/50 transition-colors font-mono">
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {item.productName}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-300 font-bold tracking-wider">
                        {isRevealed ? item.fullCodeSecret : item.codeMasked}
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold">
                        {item.denomination || `₹${item.denominationRupees}`}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{item.createdAt}</td>
                      <td className="py-3.5 px-4 text-right space-x-2 shrink-0">
                        {/* Mask / Reveal Toggle */}
                        <button
                          onClick={() => toggleCodeReveal(item.id)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                          title={isRevealed ? 'Mask Code Key' : 'Reveal Secret Code Key'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Edit Code Button */}
                        <button
                          onClick={() => handleOpenEditCode(item)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors cursor-pointer"
                          title="Edit Code, PIN, Denomination, or Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Code Button */}
                        <button
                          onClick={() => setCodeToDelete(item)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
                          title="Delete Code from Database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Generator Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>Bulk Code Inventory Ingestion</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Product & Denomination
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.denomination}) — Stock: {p.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkMode('generate')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    bulkMode === 'generate'
                      ? 'bg-emerald-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Auto-Generate Keys
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('paste')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    bulkMode === 'paste'
                      ? 'bg-emerald-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste Existing Keys
                </button>
              </div>

              {bulkMode === 'generate' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity of 16-Char Keys to Generate
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generates cryptographic 16-character alphanumeric keys formatted with individual 4-digit PINs.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Paste Redeem Codes (One per line)
                  </label>
                  <textarea
                    rows={5}
                    value={pastedCodes}
                    onChange={(e) => setPastedCodes(e.target.value)}
                    placeholder="ABCD-EFGH-IJKL-MNOP&#10;QWRE-TYUI-OPAS-DFGH&#10;ZXCV-BNMK-JHGF-DSAQ"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter one valid redeem code per line. Redeem codes are stored securely and delivered after successful purchase.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Save to Database</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Code Modal */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <span>Add Single Redeem Code</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsSingleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Product & Denomination
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.denomination}) — Stock: {p.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Secret Code Key (16 Characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSingleCode(generate16CharKey())}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <Dices className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={singleCode}
                  onChange={(e) => setSingleCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ZRHS 35AC 7KLM 92PQ"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['AVAILABLE', 'RESERVED', 'USED', 'DISABLED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSingleStatus(st)}
                      className={`py-2 px-3 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                        singleStatus === st
                          ? st === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : st === 'RESERVED'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : st === 'USED'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {st === 'AVAILABLE' ? '🟢 AVAILABLE' : st === 'RESERVED' ? '🟡 RESERVED' : st === 'USED' ? '🔵 USED' : '🔴 DISABLED'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Save Code to Database</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Code Modal */}
      {codeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <span>Edit Recharge Code</span>
              </h2>
              <button
                type="button"
                onClick={() => setCodeToEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product / Category Denomination
                </label>
                <select
                  value={editProductIdValue}
                  onChange={(e) => setEditProductIdValue(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400 font-sans"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.denomination}) — Stock: {p.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Secret Code Key (16 Characters)
                </label>
                <input
                  type="text"
                  value={editCodeValue}
                  onChange={(e) => setEditCodeValue(e.target.value.toUpperCase())}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 font-bold focus:outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status in Database
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['AVAILABLE', 'RESERVED', 'USED', 'DISABLED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatusValue(st)}
                      className={`py-2 px-3 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                        editStatusValue === st
                          ? st === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : st === 'RESERVED'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : st === 'USED'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {st === 'AVAILABLE' ? '🟢 AVAILABLE' : st === 'RESERVED' ? '🟡 RESERVED' : st === 'USED' ? '🔵 USED' : '🔴 DISABLED'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCodeToEdit(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Update Code</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Code Confirmation Modal */}
      {codeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Confirm Code Deletion</span>
              </h2>
              <button
                type="button"
                onClick={() => setCodeToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this redeem code from the database?
            </p>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Product:</span>
                <strong className="text-white">{codeToDelete.productName}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Denomination:</span>
                <strong className="text-white">{codeToDelete.denomination || `₹${codeToDelete.denominationRupees}`}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Masked Key:</span>
                <strong className="text-emerald-400 font-bold tracking-wider">{codeToDelete.codeMasked}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Database Status:</span>
                {getStatusBadge(codeToDelete.status)}
              </div>
            </div>

            {codeToDelete.status === 'USED' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> This code is already marked as SOLD. Deleting it will permanently remove it from database records.
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCodeToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Delete from Database</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
