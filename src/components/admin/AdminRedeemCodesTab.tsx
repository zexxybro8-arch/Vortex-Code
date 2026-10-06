import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Key, Plus, Eye, EyeOff, Search, ShieldCheck, Check, Sparkles, Filter, Trash2, AlertCircle } from 'lucide-react';
import { generate16CharKey, formatFullCode, formatMaskedCode } from '../../utils/codeFormat';

export const AdminRedeemCodesTab: React.FC = () => {
  const { products, redeemCodes, addSingleRedeemCode, addBulkRedeemCodes, deleteRedeemCode } = useAdmin();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'USED' | 'RESERVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Modals & form state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  // Bulk Generator State
  const [bulkMode, setBulkMode] = useState<'generate' | 'paste'>('generate');
  const [quantity, setQuantity] = useState(5);
  const [pastedCodes, setPastedCodes] = useState('');

  // Single Code State
  const [singleCode, setSingleCode] = useState('');
  const [singlePin, setSinglePin] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const filteredCodes = redeemCodes.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch =
      c.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.codeMasked.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.fullCodeSecret.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
      setAlertSuccess(`✅ Successfully added ${result.addedCount} redeem code(s) for ${targetProd.name} (${targetProd.denomination}) to the database! Stock updated.`);
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
      await addSingleRedeemCode(targetProd.id, singleCode.trim(), singlePin.trim() || undefined);
      setAlertSuccess(`✅ Added redeem code for ${targetProd.name} (${targetProd.denomination}) to database! Stock updated.`);
      setIsSingleModalOpen(false);
      setSingleCode('');
      setSinglePin('');
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err: any) {
      setAlertError(err.message || 'Failed to save code to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this redeem code from the database?')) return;
    try {
      await deleteRedeemCode(id);
      setAlertSuccess('Code removed from database. Stock recalculated.');
      setTimeout(() => setAlertSuccess(null), 3000);
    } catch (err: any) {
      alert(`Error deleting code: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Redeem Code Inventory Management</h1>
          <p className="text-xs text-slate-400">Database source of truth: available stock is strictly calculated from UNUSED codes.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (products.length > 0 && !selectedProductId) setSelectedProductId(products[0].id);
              setIsSingleModalOpen(true);
            }}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
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
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <span>{alertSuccess}</span>
        </div>
      )}

      {alertError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{alertError}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'AVAILABLE', 'USED', 'RESERVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code keys..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

      </div>

      {/* Codes Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Masked Code Key</th>
              <th className="py-3 px-3">PIN</th>
              <th className="py-3 px-3">Denomination</th>
              <th className="py-3 px-3">Database Status</th>
              <th className="py-3 px-3">Created</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredCodes.map((item) => {
              const isRevealed = revealedIds[item.id];

              return (
                <tr key={item.id} className="hover:bg-slate-950/50 transition-colors font-mono">
                  <td className="py-3.5 px-3 font-sans font-bold text-white">{item.productName}</td>
                  <td className="py-3.5 px-3 text-emerald-300 font-bold tracking-wider">
                    {isRevealed ? item.fullCodeSecret : item.codeMasked}
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">{item.pin}</td>
                  <td className="py-3.5 px-3 text-white font-bold">{item.denomination || `₹${item.denominationRupees}`}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.status === 'USED'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.status === 'AVAILABLE' ? 'UNUSED (IN STOCK)' : item.status === 'USED' ? 'SOLD' : item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 text-[11px]">{item.createdAt}</td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => toggleCodeReveal(item.id)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                      title={isRevealed ? 'Mask Code Key' : 'Reveal Secret Code Key'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
                      title="Delete Code"
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

      {/* Bulk Generator Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Bulk Code Inventory Ingestion</span>
            </h2>

            <div className="flex gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setBulkMode('generate')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg ${
                  bulkMode === 'generate' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto Generate Unique Codes
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('paste')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg ${
                  bulkMode === 'paste' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Paste Custom Code List
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Product Catalog</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.denomination}) — Current Stock: {p.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              {bulkMode === 'generate' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity of Codes to Generate</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Codes will be generated with 16-digit encrypted keys and security PINs.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Paste Codes (One per line, optional CODE:PIN format)</label>
                  <textarea
                    rows={5}
                    value={pastedCodes}
                    onChange={(e) => setPastedCodes(e.target.value)}
                    placeholder="ZRHS 35AC 7KLM 92PQ:1234&#10;QYU1 BXE8 7ZGK 1011:5678"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              <span>Add Single Redeem Code</span>
            </h2>

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Product</label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Secret Code Key (16 Characters)</label>
                <input
                  type="text"
                  value={singleCode}
                  onChange={(e) => setSingleCode(e.target.value)}
                  placeholder="e.g. ZRHS 35AC 7KLM 92PQ"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PIN (Optional, 4 Digits)</label>
                <input
                  type="text"
                  value={singlePin}
                  onChange={(e) => setSinglePin(e.target.value)}
                  placeholder="e.g. 9842"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                />
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

    </div>
  );
};

