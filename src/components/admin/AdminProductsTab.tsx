import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { StoreProduct } from '../../types';
import {
  Plus,
  Edit2,
  Power,
  X,
  Palette,
  Save,
  Trash2,
  Gift,
  Copy,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const AdminProductsTab: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    designPresets = [],
    saveDesignPreset,
    deleteDesignPreset,
  } = useAdmin();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Preview Data
  const [previewData, setPreviewData] = useState<any>({});

  // Preset States
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetStatus, setPresetStatus] = useState<string | null>(null);

  const defaultGlow = {
    glowColor: '#10B981',
    borderColor: '#10B981',
    cardBgColor: '#090d16',
    badgeBgColor: '#064e3b',
    badgeTextColor: '#a7f3d0',
    buttonBgColor: '#34d399',
    imageBorderColor: '#059669',
    labelBorderColor: '#059669',
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
  };

  const redeemPresets = designPresets.filter(
    (p: any) => p.category === 'REDEEM_CODE' || p.category === 'ALL'
  );

  useEffect(() => {
    if (editingProduct) {
      const parsedGlow =
        typeof editingProduct.glowSettings === 'string'
          ? JSON.parse(editingProduct.glowSettings)
          : editingProduct.glowSettings || {};

      setPreviewData({
        ...editingProduct,
        glowSettings: { ...defaultGlow, ...parsedGlow },
      });
    } else {
      setPreviewData({
        name: 'Google Play Recharge Code',
        priceRupees: 100,
        rewardValueRupees: 1500,
        denomination: '₹100',
        category: 'DIGITAL REWARDS',
        stockStatus: 'AVAILABLE',
        description: 'Instant digital delivery with secure code',
        enabled: true,
        image: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
        glowSettings: { ...defaultGlow },
      });
    }
    setSelectedPresetId('');
    setPresetStatus(null);
  }, [editingProduct, isModalOpen]);

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

  // Preset Handlers
  const handleApplyPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = redeemPresets.find((p: any) => p.id === presetId);
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
    const existing = redeemPresets.find((p: any) => p.name.toLowerCase() === cleanName.toLowerCase());

    if (existing) {
      const confirmOverwrite = window.confirm(
        `Preset "${existing.name}" already exists. Overwrite it with current card design settings?`
      );
      if (!confirmOverwrite) return;
    }

    try {
      await saveDesignPreset(cleanName, currentGlowSettings, existing?.id, 'REDEEM_CODE');
      setIsSavePresetModalOpen(false);
      setPresetNameInput('');
      setPresetStatus(`Preset "${cleanName}" saved successfully!`);
      setTimeout(() => setPresetStatus(null), 3000);
    } catch (err: any) {
      alert('Failed to save preset: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeletePresetClick = async (presetId: string) => {
    const preset = redeemPresets.find((p: any) => p.id === presetId);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData.name || !previewData.name.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: previewData.name.trim(),
      priceRupees: Number(previewData.priceRupees),
      rewardValueRupees: Number(previewData.rewardValueRupees),
      denomination: previewData.denomination || `₹${previewData.priceRupees}`,
      category: previewData.category || 'DIGITAL REWARDS',
      stockStatus: previewData.stockStatus || 'AVAILABLE',
      enabled: previewData.enabled !== false,
      description: previewData.description || '',
      image: previewData.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      glowSettings: previewData.glowSettings || {},
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

  const currentGlow = previewData.glowSettings || {};

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Redeem Code Products & Pricing</h1>
          <p className="text-xs text-slate-400">
            Configure prices, reward values, real-time inventory, and custom card visual styling.
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
            {products.map((prod) => {
              const isAvailable = prod.enabled !== false && (prod.stock ?? 0) > 0 && prod.stockStatus !== 'OUT OF STOCK';

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
                      title="Edit Product & Design"
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

      {/* Add / Edit Modal with Live Card Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row gap-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Form Column */}
            <form onSubmit={handleFormSubmit} className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                {editingProduct ? 'Edit Redeem Code Product' : 'Add New Redeem Code Product'}
              </h2>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              {/* Basic Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={previewData.name || ''}
                    onChange={(e) => updatePreviewField('name', e.target.value)}
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
                      value={previewData.priceRupees ?? ''}
                      onChange={(e) => updatePreviewField('priceRupees', Number(e.target.value))}
                      className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reward Value (₹)</label>
                    <input
                      type="number"
                      value={previewData.rewardValueRupees ?? ''}
                      onChange={(e) => updatePreviewField('rewardValueRupees', Number(e.target.value))}
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
                      value={previewData.denomination || ''}
                      onChange={(e) => updatePreviewField('denomination', e.target.value)}
                      placeholder="e.g. ₹100"
                      className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Availability</label>
                    <select
                      value={previewData.stockStatus || 'AVAILABLE'}
                      onChange={(e) => updatePreviewField('stockStatus', e.target.value)}
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
                    value={previewData.image || ''}
                    onChange={(e) => updatePreviewField('image', e.target.value)}
                    placeholder="Image URL"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* DESIGN PRESET MANAGEMENT SECTION */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>Design Presets</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPresetNameInput('');
                      setIsSavePresetModalOpen(true);
                    }}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Save size={12} /> Save Preset
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="">-- Apply a Saved Design Preset --</option>
                    {redeemPresets.map((preset: any) => (
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
                <h3 className="text-xs font-bold text-slate-300">Card Color Palette Settings</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'glowColor', label: 'Glow Color', default: '#10B981' },
                    { key: 'borderColor', label: 'Outer Card Border', default: '#10B981' },
                    { key: 'cardBgColor', label: 'Card Background', default: '#090d16' },
                    { key: 'badgeBgColor', label: 'Label Background', default: '#064e3b' },
                    { key: 'badgeTextColor', label: 'Label Text Color', default: '#a7f3d0' },
                    { key: 'buttonBgColor', label: 'Button Background', default: '#34d399' },
                    { key: 'imageBorderColor', label: 'Image Border Color', default: '#059669' },
                    { key: 'labelBorderColor', label: 'Label Border Color', default: '#059669' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <input
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
                          type="range"
                          min={item.min}
                          max={item.max}
                          value={currentGlow[item.name] ?? 2}
                          onChange={(e) => updateGlowSettingField(item.name, Number(e.target.value))}
                          className="accent-emerald-500 flex-1 h-1 bg-slate-800 rounded"
                        />
                        <span className="w-6 text-right font-mono text-[10px] text-emerald-400">
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
                              type="checkbox"
                              checked={Boolean(currentGlow[item.enabled] ?? true)}
                              onChange={(e) => updateGlowSettingField(item.enabled, e.target.checked)}
                              className="accent-emerald-500 rounded"
                            />
                          )}
                          <span className="w-20 text-[10px] text-slate-400">{item.label}:</span>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 w-10">Int:</span>
                              <input
                                type="range"
                                min="0"
                                max="150"
                                value={currentGlow[item.intensity] ?? 50}
                                onChange={(e) => updateGlowSettingField(item.intensity, Number(e.target.value))}
                                className="accent-emerald-500 flex-1 h-1 bg-slate-800 rounded"
                              />
                              <span className="w-6 text-right font-mono text-[9px] text-emerald-400">
                                {currentGlow[item.intensity] ?? 50}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 w-10">Blur:</span>
                              <input
                                type="range"
                                min="0"
                                max="40"
                                value={currentGlow[item.blur] ?? 25}
                                onChange={(e) => updateGlowSettingField(item.blur, Number(e.target.value))}
                                className="accent-emerald-500 flex-1 h-1 bg-slate-800 rounded"
                              />
                              <span className="w-6 text-right font-mono text-[9px] text-emerald-400">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </form>

            {/* Live Card Preview Column */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 min-w-[280px]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                LIVE CARD PREVIEW
              </h3>

              <div
                className="border rounded-3xl p-5 transition-all duration-300 flex flex-col justify-between space-y-4 relative w-full max-w-xs shadow-xl"
                style={{
                  backgroundColor: currentGlow.cardBgColor || '#090d16',
                  borderColor: currentGlow.borderColor || '#10B981',
                  borderWidth: `${currentGlow.outerBorderThickness || 2}px`,
                  boxShadow: currentGlow.outerGlowEnabled
                    ? `0 0 ${currentGlow.outerGlowBlur || 25}px ${currentGlow.glowColor || currentGlow.borderColor || '#10B981'}${
                        (currentGlow.outerGlowIntensity || 50) > 50 ? 'FF' : '80'
                      }`
                    : 'none',
                }}
              >
                {/* 1. TOP AREA */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl bg-slate-950 border flex items-center justify-center shrink-0 p-1.5 overflow-hidden"
                    style={{
                      borderColor: currentGlow.imageBorderColor || '#059669',
                      borderWidth: `${currentGlow.imageBorderThickness || 2}px`,
                      boxShadow: currentGlow.imageGlowEnabled
                        ? `0 0 ${currentGlow.imageGlowBlur || 15}px ${currentGlow.imageBorderColor || '#059669'}`
                        : 'none',
                    }}
                  >
                    <img
                      src={previewData.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'}
                      alt="Product Logo"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-extrabold text-white tracking-tight truncate">
                      {previewData.name || 'Google Play Code'}
                    </h3>
                    <div className="text-[11px] font-mono font-bold text-emerald-400">
                      Pay ₹{previewData.priceRupees || 0} & Get ₹{previewData.rewardValueRupees || 0}
                    </div>
                  </div>
                </div>

                {/* 2. PRICE & REDEEM VALUE */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="p-2.5 rounded-xl border font-mono"
                    style={{
                      borderColor: currentGlow.labelBorderColor || '#059669',
                      borderWidth: `${currentGlow.labelBorderThickness || 1}px`,
                      backgroundColor: currentGlow.badgeBgColor || '#064e3b',
                      color: currentGlow.badgeTextColor || '#a7f3d0',
                    }}
                  >
                    <div className="text-[9px] font-extrabold uppercase opacity-80">PRICE</div>
                    <div className="text-sm font-black" style={{ color: currentGlow.badgeTextColor || '#ffffff' }}>₹{previewData.priceRupees || 0}</div>
                  </div>
                  <div
                    className="p-2.5 rounded-xl border font-mono"
                    style={{
                      borderColor: currentGlow.labelBorderColor || '#059669',
                      borderWidth: `${currentGlow.labelBorderThickness || 1}px`,
                      backgroundColor: currentGlow.badgeBgColor || '#064e3b',
                      color: currentGlow.badgeTextColor || '#a7f3d0',
                    }}
                  >
                    <div className="text-[9px] font-extrabold uppercase opacity-80">REDEEM VALUE</div>
                    <div className="text-sm font-black" style={{ color: currentGlow.badgeTextColor || '#10B981' }}>₹{previewData.rewardValueRupees || 0}</div>
                  </div>
                </div>

                {/* 3. CODE PREVIEW BOX */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
                  <div className="text-xs font-bold text-slate-300">
                    {previewData.stockStatus === 'OUT OF STOCK' ? (
                      <span className="text-rose-400 italic">SOLD OUT</span>
                    ) : (
                      'XXXX-XXXX-XXXX-XXXX'
                    )}
                  </div>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                {/* 4. REDEEM BUTTON */}
                <div
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: previewData.stockStatus === 'OUT OF STOCK' ? '#1e293b' : currentGlow.buttonBgColor || '#34d399',
                    color: previewData.stockStatus === 'OUT OF STOCK' ? '#64748b' : '#020617',
                  }}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{previewData.stockStatus === 'OUT OF STOCK' ? 'SOLD OUT' : 'REDEEM NOW'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
                <Palette className="w-4 h-4 text-emerald-400" />
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
                  placeholder="e.g. Emerald Vault, Cyber Gold, Royal Violet"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
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
                  className="flex-1 py-2.5 bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-300 transition cursor-pointer"
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
