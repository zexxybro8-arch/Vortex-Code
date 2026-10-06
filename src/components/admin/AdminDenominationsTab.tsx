import React, { useState } from 'react';
import { Layers, Plus, Check } from 'lucide-react';

interface DenominationItem {
  id: string;
  label: string; // e.g. "₹100"
  valueRupees: number;
  status: 'ACTIVE' | 'DISABLED';
}

export const AdminDenominationsTab: React.FC = () => {
  const [denominations, setDenominations] = useState<DenominationItem[]>([
    { id: 'den_100', label: '₹100', valueRupees: 100, status: 'ACTIVE' },
    { id: 'den_120', label: '₹120', valueRupees: 120, status: 'ACTIVE' },
    { id: 'den_150', label: '₹150', valueRupees: 150, status: 'ACTIVE' },
    { id: 'den_200', label: '₹200', valueRupees: 200, status: 'ACTIVE' },
    { id: 'den_300', label: '₹300', valueRupees: 300, status: 'ACTIVE' },
    { id: 'den_500', label: '₹500', valueRupees: 500, status: 'ACTIVE' },
    { id: 'den_700', label: '₹700', valueRupees: 700, status: 'ACTIVE' },
    { id: 'den_900', label: '₹900', valueRupees: 900, status: 'ACTIVE' },
  ]);

  const [newValue, setNewValue] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddDenomination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue || newValue <= 0) return;

    const newDenom: DenominationItem = {
      id: `den_${newValue}`,
      label: `₹${newValue}`,
      valueRupees: Number(newValue),
      status: 'ACTIVE',
    };

    setDenominations((prev) => [...prev, newDenom].sort((a, b) => a.valueRupees - b.valueRupees));
    setIsModalOpen(false);
  };

  const toggleDenomination = (id: string) => {
    setDenominations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: d.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } : d))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Recharge Denominations Management</h1>
          <p className="text-xs text-slate-400">Configure active recharge amount filter values for customers.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Denomination</span>
        </button>
      </div>

      {/* Grid of Denomination Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {denominations.map((denom) => (
          <div
            key={denom.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                ₹
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                  denom.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {denom.status}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-white font-mono">{denom.label}</div>
              <div className="text-[10px] text-slate-400 font-mono">₹{denom.valueRupees} INR Value</div>
            </div>

            <button
              onClick={() => toggleDenomination(denom.id)}
              className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${
                denom.status === 'ACTIVE'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {denom.status === 'ACTIVE' ? 'Disable Value' : 'Enable Value'}
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add New Denomination</h2>
            <form onSubmit={handleAddDenomination} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Recharge Amount (₹)</label>
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(Number(e.target.value))}
                  placeholder="e.g. 250"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
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
                  Add Denomination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
