import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Sparkles, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, Palette, X } from 'lucide-react';

export const AdminDiamondsTab: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    reorderProducts,
    designPresets = [],
    saveDesignPreset,
    deleteDesignPreset,
  } = useAdmin();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>({});
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Design Preset States
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetStatus, setPresetStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (editingProduct) {
      setPreviewData({
        ...editingProduct,
        displayName: editingProduct.displayName || editingProduct.name,
        glowSettings: typeof editingProduct.glowSettings === 'string'
          ? JSON.parse(editingProduct.glowSettings)
          : editingProduct.glowSettings || {},
      });
    } else {
      setPreviewData({
        rewardValueRupees: 100,
        priceRupees: 80,
        cardBadgeText: 'DIAMONDS',
        enabled: true,
        glowSettings: {
          glowColor: '#10B981',
          borderColor: '#10B981',
          badgeBgColor: '#155e75',
          badgeTextColor: '#bae6fd',
          buttonBgColor: '#38bdf8',
          imageBorderColor: '#06b6d4',
          labelBorderColor: '#06b6d4',
          outerBorderThickness: 2,
          imageBorderThickness: 2,
          labelBorderThickness: 1,
          outerGlowEnabled: true,
          outerGlowIntensity: 50,
          outerGlowBlur: 25,
          imageGlowEnabled: true,
          imageGlowIntensity: 30,
          imageGlowBlur: 15,
          labelGlowEnabled: true,
          labelGlowIntensity: 20,
          labelGlowBlur: 10,
          labelInnerGlowIntensity: 20,
          labelInnerGlowBlur: 10,
        },
      });
    }
    setSelectedPresetId('');
    setPresetStatus(null);
  }, [editingProduct, isModalOpen]);

  const diamondProducts = products
    .filter((p) => p.category === 'DIAMONDS')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.priceRupees - b.priceRupees);

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= diamondProducts.length) return;

    const newItems = [...diamondProducts];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, movedItem);

    const reorderedPayload = newItems.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1,
    }));

    try {
      setIsSavingOrder(true);
      await reorderProducts(reorderedPayload);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 2500);
    } catch (err: any) {
      alert('Failed to reorder products: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handlePositionChange = async (productId: string, newPosition: number) => {
    if (isNaN(newPosition) || newPosition < 1) return;
    const currentList = [...diamondProducts];
    const currentIndex = currentList.findIndex((p) => p.id === productId);
    if (currentIndex === -1) return;

    const targetIndex = Math.min(Math.max(newPosition - 1, 0), currentList.length - 1);
    const [movedItem] = currentList.splice(currentIndex, 1);
    currentList.splice(targetIndex, 0, movedItem);

    const reorderedPayload = currentList.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1,
    }));

    try {
      setIsSavingOrder(true);
      await reorderProducts(reorderedPayload);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 2500);
    } catch (err: any) {
      alert('Failed to update product position: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const quantity = formData.get('quantity') as string;
    const nameInput = ((formData.get('displayName') as string) || (formData.get('name') as string))?.trim();
    const productName = nameInput || `${quantity} Diamonds`;

    const currentGlowSettings = previewData.glowSettings || {};
    const selectedStatus = formData.get('status') as string;
    const isAvailable = selectedStatus === 'AVAILABLE' || selectedStatus === 'enabled';

    const prodData = {
      name: productName,
      displayName: productName,
      cardBadgeText: (formData.get('cardBadgeText') as string) || 'DIAMONDS',
      priceRupees: Number(formData.get('price')),
      rewardValueRupees: Number(quantity),
      denomination: `${quantity} Diamonds`,
      category: 'DIAMONDS' as const,
      description: (formData.get('description') as string) || '',
      image: (formData.get('image') as string) || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      enabled: true,
      sortOrder: Number(formData.get('sortOrder') || 0),
      stockStatus: (isAvailable ? 'AVAILABLE' : 'OUT OF STOCK') as any,
      deliveryInfo: 'Instant Delivery',
      glowSettings: currentGlowSettings,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        ...prodData,
        glowSettings: prodData.glowSettings,
      });
    } else {
      await addProduct(prodData);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const updatePreviewField = (field: string, value: any) => {
    setPreviewData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateGlowSettingField = (field: string, value: any) => {
    setPreviewData((prev: any) => ({
      ...prev,
      glowSettings: {
        ...(prev.glowSettings || {}),
        [field]: value,
      },
    }));
  };

  // Preset Handlers
  const handleApplyPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = designPresets.find((p: any) => p.id === presetId);
    if (preset && preset.settings) {
      setSelectedPresetId(presetId);
      setPreviewData((prev: any) => ({
        ...prev,
        glowSettings: { ...preset.settings },
      }));
      setPresetStatus(`Applied preset "${preset.name}"`);
      setTimeout(() => setPresetStatus(null), 3000);
    }
  };

  const handleSavePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = presetNameInput.trim();
    if (!cleanName) return;

    const currentGlowSettings = previewData.glowSettings || {};
    const existing = designPresets.find((p: any) => p.name.toLowerCase() === cleanName.toLowerCase());

    if (existing) {
      const confirmOverwrite = window.confirm(
        `Preset "${existing.name}" already exists. Overwrite it with current card design settings?`
      );
      if (!confirmOverwrite) return;
    }

    try {
      await saveDesignPreset(cleanName, currentGlowSettings, existing?.id);
      setIsSavePresetModalOpen(false);
      setPresetNameInput('');
      setPresetStatus(`Preset "${cleanName}" saved successfully!`);
      setTimeout(() => setPresetStatus(null), 3000);
    } catch (err: any) {
      alert('Failed to save preset: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeletePresetClick = async (presetId: string) => {
    const preset = designPresets.find((p: any) => p.id === presetId);
    if (!preset) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete preset "${preset.name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDesignPreset(presetId);
      if (selectedPresetId === presetId) {
        setSelectedPresetId('');
      }
      setPresetStatus(`Preset "${preset.name}" deleted`);
      setTimeout(() => setPresetStatus(null), 3000);
    } catch (err: any) {
      alert('Failed to delete preset: ' + (err.message || 'Unknown error'));
    }
  };

  const currentGlow = previewData.glowSettings || {};

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Diamonds Management</h1>
          <p className="text-xs text-slate-400">Manage Free Fire diamond top-up products, card order, and design presets.</p>
        </div>
        <div className="flex items-center gap-2">
          {orderSuccess && <span className="text-xs text-emerald-400 font-semibold animate-fade-in">✓ Order Saved</span>}
          <button
            onClick={async () => {
              const payload = diamondProducts.map((p, idx) => ({ id: p.id, sortOrder: idx + 1 }));
              setIsSavingOrder(true);
              try {
                await reorderProducts(payload);
                setOrderSuccess(true);
                setTimeout(() => setOrderSuccess(false), 2500);
              } catch (e: any) {
                alert('Error saving order: ' + (e.message || 'Unknown error'));
              } finally {
                setIsSavingOrder(false);
              }
            }}
            disabled={isSavingOrder}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 text-cyan-300 font-bold rounded-xl text-xs hover:bg-slate-700 transition cursor-pointer"
          >
            <Save size={14} /> Save Order
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition cursor-pointer"
          >
            <Plus size={14} /> Add Diamonds Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Position</th>
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Quantity</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {diamondProducts.map((p, idx) => (
              <tr key={p.id} className="hover:bg-slate-950/50">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold text-xs w-6 text-center">#{idx + 1}</span>
                    <input
                      type="number"
                      min="1"
                      max={diamondProducts.length}
                      defaultValue={idx + 1}
                      key={`${p.id}-${p.sortOrder}-${idx}`}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== idx + 1) {
                          handlePositionChange(p.id, val);
                        }
                      }}
                      className="w-12 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-center text-white text-xs font-mono focus:border-cyan-400"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0 || isSavingOrder}
                        onClick={() => handleMove(idx, 'up')}
                        className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white"
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === diamondProducts.length - 1 || isSavingOrder}
                        onClick={() => handleMove(idx, 'down')}
                        className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white"
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 font-semibold text-white">{p.displayName || p.name}</td>
                <td className="py-3 px-3">{p.rewardValueRupees} Diamonds</td>
                <td className="py-3 px-3">₹{p.priceRupees}</td>
                <td className="py-3 px-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const isCurrentlySoldOut = p.stockStatus === 'OUT OF STOCK' || p.stockStatus === 'SOLD OUT' || p.stockStatus === 'SOLD_OUT';
                      const nextStatus = isCurrentlySoldOut ? 'AVAILABLE' : 'OUT OF STOCK';
                      try {
                        await updateProduct(p.id, {
                          enabled: true,
                          stockStatus: nextStatus,
                        });
                      } catch (err: any) {
                        alert('Failed to update status: ' + err.message);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                      p.stockStatus !== 'OUT OF STOCK' && p.stockStatus !== 'SOLD OUT' && p.stockStatus !== 'SOLD_OUT'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                    title="Click to toggle AVAILABLE / SOLD OUT"
                  >
                    {p.stockStatus !== 'OUT OF STOCK' && p.stockStatus !== 'SOLD OUT' && p.stockStatus !== 'SOLD_OUT' ? 'AVAILABLE' : 'SOLD OUT'}
                  </button>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setIsModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-white mr-2.5 p-1 hover:bg-slate-800 rounded transition"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this Diamond product?')) {
                        deleteProduct(p.id)
                          .then(() => alert('Product deleted successfully'))
                          .catch((e) => alert('Failed to delete product: ' + (e.message || 'Unknown error')));
                      }
                    }}
                    className="text-red-400 hover:text-red-300 p-1 hover:bg-slate-800 rounded transition"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Main Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6 shadow-2xl">
            {/* Form Controls Column */}
            <form onSubmit={handleSave} className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white">{editingProduct ? 'Edit' : 'Add'} Diamond Product</h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Basic Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Diamond Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    value={previewData.rewardValueRupees ?? ''}
                    onChange={(e) => updatePreviewField('rewardValueRupees', Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Diamond Product Name</label>
                  <input
                    name="displayName"
                    type="text"
                    value={previewData.displayName ?? ''}
                    onChange={(e) => updatePreviewField('displayName', e.target.value)}
                    placeholder="e.g. SPECIAL DIAMOND"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Card Badge Text</label>
                  <input
                    name="cardBadgeText"
                    type="text"
                    value={previewData.cardBadgeText ?? 'DIAMONDS'}
                    onChange={(e) => updatePreviewField('cardBadgeText', e.target.value)}
                    placeholder="e.g. DIAMONDS"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Price (INR)</label>
                    <input
                      name="price"
                      type="number"
                      value={previewData.priceRupees ?? ''}
                      onChange={(e) => updatePreviewField('priceRupees', Number(e.target.value))}
                      placeholder="Price"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Availability Status</label>
                    <select
                      name="status"
                      value={previewData.stockStatus === 'OUT OF STOCK' || previewData.stockStatus === 'SOLD OUT' || previewData.stockStatus === 'SOLD_OUT' ? 'SOLD OUT' : 'AVAILABLE'}
                      onChange={(e) => {
                        const isAvail = e.target.value === 'AVAILABLE';
                        updatePreviewField('enabled', true);
                        updatePreviewField('stockStatus', isAvail ? 'AVAILABLE' : 'OUT OF STOCK');
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="SOLD OUT">SOLD OUT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Image URL</label>
                  <input
                    name="image"
                    value={previewData.image ?? ''}
                    onChange={(e) => updatePreviewField('image', e.target.value)}
                    placeholder="Image URL"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Display Position / Sort Order</label>
                  <input
                    name="sortOrder"
                    type="number"
                    value={previewData.sortOrder ?? 0}
                    onChange={(e) => updatePreviewField('sortOrder', Number(e.target.value))}
                    placeholder="Sort Order"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* DESIGN PRESET MANAGEMENT SECTION */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span>Design Presets</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPresetNameInput('');
                      setIsSavePresetModalOpen(true);
                    }}
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Save size={12} /> Save Preset
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="">-- Apply a Saved Design Preset --</option>
                    {designPresets.map((preset: any) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>

                  {selectedPresetId && (
                    <button
                      type="button"
                      onClick={() => handleDeletePresetClick(selectedPresetId)}
                      className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs transition cursor-pointer"
                      title="Delete Selected Preset"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {presetStatus && (
                  <div className="text-[11px] text-emerald-400 font-semibold px-1">
                    ✓ {presetStatus}
                  </div>
                )}
              </div>

              {/* COLOR CONTROLS */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300">Color Palette Settings</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'glowColor', label: 'Glow Color', default: '#10B981' },
                    { key: 'borderColor', label: 'Border Color', default: '#10B981' },
                    { key: 'badgeBgColor', label: 'Badge Background', default: '#155e75' },
                    { key: 'badgeTextColor', label: 'Badge Text', default: '#bae6fd' },
                    { key: 'buttonBgColor', label: 'Button Background', default: '#38bdf8' },
                    { key: 'imageBorderColor', label: 'Image Border Color', default: '#06b6d4' },
                    { key: 'labelBorderColor', label: 'Label Border Color', default: '#06b6d4' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <input
                        name={item.key}
                        type="color"
                        value={currentGlow[item.key] || item.default}
                        onChange={(e) => updateGlowSettingField(item.key, e.target.value)}
                        className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                        title={item.label}
                      />
                      <span className="text-[10px] text-slate-300 font-medium truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BORDER THICKNESS & GLOW PARAMETERS */}
              <div className="text-white text-xs space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <h3 className="font-bold border-b border-slate-800 pb-1 text-slate-300">Border Thickness (px)</h3>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {[
                      { name: 'outerBorderThickness', label: 'Outer', min: 0, max: 10 },
                      { name: 'imageBorderThickness', label: 'Image', min: 0, max: 10 },
                      { name: 'labelBorderThickness', label: 'Label', min: 0, max: 10 },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="w-12 text-[10px] text-slate-400">{item.label}:</span>
                        <input
                          name={item.name}
                          type="range"
                          min={item.min}
                          max={item.max}
                          value={currentGlow[item.name] ?? 2}
                          onChange={(e) => updateGlowSettingField(item.name, Number(e.target.value))}
                          className="accent-cyan-500 flex-1 h-1 bg-slate-800 rounded"
                        />
                        <span className="w-6 text-right font-mono text-[10px] text-cyan-400">
                          {currentGlow[item.name] ?? 2}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold border-b border-slate-800 pb-1 text-slate-300">Glow Intensities & Blur</h3>
                  <div className="space-y-3 mt-2">
                    {[
                      { name: 'outerGlow', label: 'Outer Glow', enabled: 'outerGlowEnabled', intensity: 'outerGlowIntensity', blur: 'outerGlowBlur' },
                      { name: 'imageGlow', label: 'Image Glow', enabled: 'imageGlowEnabled', intensity: 'imageGlowIntensity', blur: 'imageGlowBlur' },
                      { name: 'labelGlow', label: 'Label Outer', enabled: 'labelGlowEnabled', intensity: 'labelGlowIntensity', blur: 'labelGlowBlur' },
                      { name: 'labelInnerGlow', label: 'Label Inner', enabled: 'labelGlowEnabled', intensity: 'labelInnerGlowIntensity', blur: 'labelInnerGlowBlur' },
                    ].map((item) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center gap-2">
                          {item.name !== 'labelInnerGlow' && (
                            <input
                              name={item.enabled}
                              type="checkbox"
                              checked={Boolean(currentGlow[item.enabled] ?? true)}
                              onChange={(e) => updateGlowSettingField(item.enabled, e.target.checked)}
                              className="accent-cyan-500 rounded"
                            />
                          )}
                          <span className="w-20 text-[10px] text-slate-400">{item.label}:</span>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 w-10">Int:</span>
                              <input
                                name={item.intensity}
                                type="range"
                                min="0"
                                max="150"
                                value={currentGlow[item.intensity] ?? 50}
                                onChange={(e) => updateGlowSettingField(item.intensity, Number(e.target.value))}
                                className="accent-cyan-500 flex-1 h-1 bg-slate-800 rounded"
                                title="Intensity"
                              />
                              <span className="w-6 text-right font-mono text-[9px] text-cyan-400">
                                {currentGlow[item.intensity] ?? 50}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 w-10">Blur:</span>
                              <input
                                name={item.blur}
                                type="range"
                                min="0"
                                max="40"
                                value={currentGlow[item.blur] ?? 25}
                                onChange={(e) => updateGlowSettingField(item.blur, Number(e.target.value))}
                                className="accent-cyan-500 flex-1 h-1 bg-slate-800 rounded"
                                title="Blur"
                              />
                              <span className="w-6 text-right font-mono text-[9px] text-cyan-400">
                                {currentGlow[item.blur] ?? 25}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-white text-xs rounded-xl font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>

            {/* Live Card Preview Column */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 mb-4">LIVE CARD PREVIEW</h3>
              <div
                className="bg-slate-950/90 border rounded-3xl p-4 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl w-64"
                style={{
                  borderColor: currentGlow.borderColor || '#06b6d4',
                  borderWidth: `${currentGlow.outerBorderThickness || 2}px`,
                  boxShadow: currentGlow.outerGlowEnabled
                    ? `0 0 ${currentGlow.outerGlowBlur || 25}px ${currentGlow.borderColor || '#06b6d4'}${
                        (currentGlow.outerGlowIntensity || 50) > 50 ? 'FF' : '80'
                      }`
                    : 'none',
                }}
              >
                {/* 1. Card Badge Text */}
                <div
                  className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl border font-black text-[11px] tracking-wider mb-3"
                  style={{
                    borderColor: currentGlow.labelBorderColor || '#06b6d4',
                    borderWidth: `${currentGlow.labelBorderThickness || 1}px`,
                    backgroundColor: currentGlow.badgeBgColor || '#155e75',
                    color: currentGlow.badgeTextColor || '#bae6fd',
                    boxShadow: currentGlow.labelGlowEnabled
                      ? `0 0 ${currentGlow.labelGlowBlur || 10}px ${currentGlow.labelBorderColor || '#06b6d4'}${
                          (currentGlow.labelGlowIntensity || 50) > 50 ? 'FF' : '80'
                        }, inset 0 0 ${currentGlow.labelInnerGlowBlur || 10}px ${
                          currentGlow.labelBorderColor || '#06b6d4'
                        }${(currentGlow.labelInnerGlowIntensity || 50) > 50 ? 'FF' : '80'}`
                      : 'none',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: currentGlow.badgeTextColor || '#bae6fd' }} />
                  <span>{previewData.cardBadgeText || 'DIAMONDS'}</span>
                </div>

                {/* 2. Product Image */}
                <img
                  src={previewData.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'}
                  alt="Product"
                  className="w-32 h-32 object-contain rounded-2xl"
                  style={{
                    borderColor: currentGlow.imageBorderColor || '#06b6d4',
                    borderWidth: `${currentGlow.imageBorderThickness || 2}px`,
                    borderStyle: 'solid',
                    boxShadow: currentGlow.imageGlowEnabled
                      ? `0 0 ${currentGlow.imageGlowBlur || 15}px ${currentGlow.imageBorderColor || '#06b6d4'}`
                      : 'none',
                  }}
                />

                {/* 3. Product Name & 4. Diamond Quantity */}
                <div className="mt-2.5 space-y-0.5 w-full text-center">
                  {Boolean(previewData.displayName || previewData.name) && (
                    <div className="font-extrabold text-white text-sm sm:text-base tracking-wide truncate">
                      {previewData.displayName || previewData.name}
                    </div>
                  )}
                  {previewData.rewardValueRupees !== undefined &&
                    previewData.rewardValueRupees !== null &&
                    previewData.rewardValueRupees !== '' &&
                    !isNaN(Number(previewData.rewardValueRupees)) && (
                      <div className="text-[11px] font-mono text-cyan-300 font-bold flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>{previewData.rewardValueRupees} Diamonds</span>
                      </div>
                    )}
                </div>

                {/* 5. Payment Button */}
                <div
                  className="mt-3 w-full border rounded-2xl p-1.5 flex items-center justify-between transition-all duration-300"
                  style={{
                    backgroundColor: currentGlow.buttonBgColor || '#38BDF8',
                    borderColor: currentGlow.borderColor || '#06b6d4',
                  }}
                >
                  <div className="flex-1 text-center font-black text-[#06111F] text-sm tracking-wider px-1">
                    PAY ₹{previewData.priceRupees || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Preset Name Sub-Modal */}
      {isSavePresetModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Save Design Preset</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter a name for this card design preset. All current color pickers, border thicknesses, and glow parameters will be saved.
            </p>

            <form onSubmit={handleSavePresetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Preset Name</label>
                <input
                  type="text"
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  placeholder="e.g. Test Green, Test Blue, Ice Blue"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-400 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSavePresetModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-cyan-400 transition cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
