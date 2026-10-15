import React, { useState } from 'react';
import { Palette, Save, Trash2, Copy, Gift, ArrowRight, X } from 'lucide-react';
import { StoreProduct } from '../../types';

export const defaultRedeemGlowSettings = {
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

interface RedeemCardDesignSectionProps {
  targetProduct?: StoreProduct;
  glowSettings: any;
  onChange: (newSettings: any) => void;
  designPresets: any[];
  saveDesignPreset: (name: string, settings: any, id?: string, category?: string) => Promise<void>;
  deleteDesignPreset: (id: string) => Promise<void>;
}

export const RedeemCardDesignSection: React.FC<RedeemCardDesignSectionProps> = ({
  targetProduct,
  glowSettings = {},
  onChange,
  designPresets = [],
  saveDesignPreset,
  deleteDesignPreset,
}) => {
  const currentGlow = { ...defaultRedeemGlowSettings, ...glowSettings };

  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetStatus, setPresetStatus] = useState<string | null>(null);

  const redeemPresets = designPresets.filter(
    (p: any) => p.category === 'REDEEM_CODE' || p.category === 'ALL'
  );

  const updateField = (field: string, value: any) => {
    onChange({
      ...currentGlow,
      [field]: value,
    });
  };

  const handleApplyPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = redeemPresets.find((p: any) => p.id === presetId);
    if (preset && preset.settings) {
      setSelectedPresetId(presetId);
      onChange({ ...defaultRedeemGlowSettings, ...preset.settings });
      setPresetStatus(`Applied preset "${preset.name}"`);
      setTimeout(() => setPresetStatus(null), 3000);
    }
  };

  const handleSavePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = presetNameInput.trim();
    if (!cleanName) return;

    const existing = redeemPresets.find((p: any) => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      const confirmOverwrite = window.confirm(
        `Preset "${existing.name}" already exists. Overwrite it with current card design settings?`
      );
      if (!confirmOverwrite) return;
    }

    try {
      await saveDesignPreset(cleanName, currentGlow, existing?.id, 'REDEEM_CODE');
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

  return (
    <div className="space-y-4 pt-2">
      {/* Design Presets Dropdown & Save */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>Card Design Presets</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPresetNameInput('');
              setIsSavePresetModalOpen(true);
            }}
            className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Save size={12} /> <span>Save Preset</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Controls */}
        <div className="space-y-4">
          {/* Color Pickers */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">Card Color Palette</h4>
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
                    onChange={(e) => updateField(item.key, e.target.value)}
                    className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                    title={item.label}
                  />
                  <span className="text-[10px] text-slate-300 font-medium truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Border Thickness & Glow Sliders */}
          <div className="text-white text-xs space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <h5 className="font-bold border-b border-slate-800 pb-1 text-slate-300 text-[11px]">Border Thickness (px)</h5>
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
                      onChange={(e) => updateField(item.name, Number(e.target.value))}
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
              <h5 className="font-bold border-b border-slate-800 pb-1 text-slate-300 text-[11px]">Glow Intensities & Blur</h5>
              <div className="space-y-2 mt-2">
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
                          onChange={(e) => updateField(item.enabled, e.target.checked)}
                          className="accent-emerald-500 rounded"
                        />
                      )}
                      <span className="w-20 text-[10px] text-slate-400">{item.label}:</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-7">Int:</span>
                          <input
                            type="range"
                            min="0"
                            max="150"
                            value={currentGlow[item.intensity] ?? 50}
                            onChange={(e) => updateField(item.intensity, Number(e.target.value))}
                            className="accent-emerald-500 flex-1 h-1 bg-slate-800 rounded"
                          />
                          <span className="w-5 text-right font-mono text-[9px] text-emerald-400">
                            {currentGlow[item.intensity] ?? 50}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-7">Blur:</span>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={currentGlow[item.blur] ?? 25}
                            onChange={(e) => updateField(item.blur, Number(e.target.value))}
                            className="accent-emerald-500 flex-1 h-1 bg-slate-800 rounded"
                          />
                          <span className="w-5 text-right font-mono text-[9px] text-emerald-400">
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
        </div>

        {/* Right Column: Live Card Preview */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span>LIVE CARD PREVIEW</span>
            {targetProduct && (
              <span className="text-emerald-400 font-mono">({targetProduct.denomination})</span>
            )}
          </div>

          <div
            className="border rounded-3xl p-4 transition-all duration-300 flex flex-col justify-between space-y-3.5 relative w-full max-w-[240px] sm:max-w-[270px] shadow-xl float-animation"
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
            {/* Top Area */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl bg-slate-950 border flex items-center justify-center shrink-0 p-1.5 overflow-hidden"
                style={{
                  borderColor: currentGlow.imageBorderColor || '#059669',
                  borderWidth: `${currentGlow.imageBorderThickness || 2}px`,
                  boxShadow: currentGlow.imageGlowEnabled
                    ? `0 0 ${currentGlow.imageGlowBlur || 15}px ${currentGlow.imageBorderColor || '#059669'}`
                    : 'none',
                }}
              >
                <img
                  src={targetProduct?.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'}
                  alt="Product Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="text-xs font-extrabold text-white tracking-tight truncate">
                  {targetProduct?.name || 'Google Play Code'}
                </h3>
                <div className="text-[10px] font-mono font-bold text-emerald-400">
                  Pay ₹{targetProduct?.priceRupees || 100} & Get ₹{targetProduct?.rewardValueRupees || 1500}
                </div>
              </div>
            </div>

            {/* Price & Redeem Value */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-2 rounded-xl border font-mono bg-slate-950/90"
                style={{
                  borderColor: currentGlow.labelBorderColor || '#059669',
                  borderWidth: `${currentGlow.labelBorderThickness || 1}px`,
                  backgroundColor: 'rgba(2, 6, 23, 0.9)',
                  boxShadow: currentGlow.labelGlowEnabled
                    ? `0 0 ${currentGlow.labelGlowBlur || 10}px ${currentGlow.labelBorderColor || '#059669'}${
                        (currentGlow.labelGlowIntensity || 50) > 50 ? 'FF' : '80'
                      }`
                    : 'none',
                  color: currentGlow.badgeTextColor || '#a7f3d0',
                }}
              >
                <div className="text-[8px] font-extrabold uppercase opacity-80">PRICE</div>
                <div className="text-xs font-black" style={{ color: currentGlow.badgeTextColor || '#ffffff' }}>
                  ₹{targetProduct?.priceRupees || 100}
                </div>
              </div>
              <div
                className="p-2 rounded-xl border font-mono bg-slate-950/90"
                style={{
                  borderColor: currentGlow.labelBorderColor || '#059669',
                  borderWidth: `${currentGlow.labelBorderThickness || 1}px`,
                  backgroundColor: 'rgba(2, 6, 23, 0.9)',
                  boxShadow: currentGlow.labelGlowEnabled
                    ? `0 0 ${currentGlow.labelGlowBlur || 10}px ${currentGlow.labelBorderColor || '#059669'}${
                        (currentGlow.labelGlowIntensity || 50) > 50 ? 'FF' : '80'
                      }`
                    : 'none',
                  color: currentGlow.badgeTextColor || '#a7f3d0',
                }}
              >
                <div className="text-[8px] font-extrabold uppercase opacity-80">REDEEM VALUE</div>
                <div className="text-xs font-black" style={{ color: currentGlow.badgeTextColor || '#10B981' }}>
                  ₹{targetProduct?.rewardValueRupees || 1500}
                </div>
              </div>
            </div>

            {/* Masked Code Preview */}
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
              <div className="text-[11px] font-bold text-slate-300">
                XXXX-XXXX-XXXX-XXXX
              </div>
              <Copy className="w-3 h-3 text-emerald-400" />
            </div>

            {/* Redeem Now Button */}
            <div
              className="w-full py-2 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md"
              style={{
                backgroundColor: currentGlow.buttonBgColor || '#34d399',
                color: '#020617',
              }}
            >
              <Gift className="w-3 h-3" />
              <span>REDEEM NOW</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Save Preset Name Sub-Modal */}
      {isSavePresetModalOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[70] p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm space-y-3.5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>Save Design Preset</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Save current card colors, borders, and glow effects as a reusable preset for Redeem Code cards.
            </p>

            <form onSubmit={handleSavePresetSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Preset Name</label>
                <input
                  type="text"
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  placeholder="e.g. Cyber Jade, Royal Obsidian, Amber Blaze"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSavePresetModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-300 transition cursor-pointer"
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
