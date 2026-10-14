import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Sparkles, Plus, Edit2, Trash2 } from 'lucide-react';

export const AdminDiamondsTab: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>({});
  
  React.useEffect(() => {
    if (editingProduct) {
      const rawBadge = editingProduct.cardBadgeText ?? editingProduct.card_badge_text;
      const safeBadge = rawBadge && rawBadge !== 'null' && rawBadge !== 'undefined' ? String(rawBadge).trim() : '';
      setPreviewData({
        ...editingProduct,
        name: editingProduct.name || editingProduct.displayName || '',
        displayName: editingProduct.displayName || editingProduct.name || '',
        cardBadgeText: safeBadge,
        rewardValueRupees: editingProduct.rewardValueRupees || editingProduct.rewardValue || 0,
        priceRupees: editingProduct.priceRupees || editingProduct.price || 0,
      });
    } else {
      setPreviewData({
        name: '',
        displayName: '',
        rewardValueRupees: 100,
        priceRupees: 80,
        cardBadgeText: '',
        enabled: true,
        image: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
        glowSettings: {
          glowColor: '#10B981',
          borderColor: '#10B981',
          badgeBgColor: '#155e75',
          badgeTextColor: '#bae6fd',
          buttonBgColor: '#38bdf8',
          imageBorderColor: '#06b6d4',
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
        }
      });
    }
  }, [editingProduct]);
  
  const diamondProducts = products.filter(p => p.category === 'DIAMONDS');

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const quantity = (formData.get('quantity') as string || '').trim();
    const displayName = (formData.get('displayName') as string || '').trim();
    const cardBadgeText = (formData.get('cardBadgeText') as string || '').trim();
    const price = Number(formData.get('price'));
    const image = (formData.get('image') as string || '').trim();

    const productName = displayName || (quantity ? `${quantity} Diamonds` : 'Diamond Package');

    const prodData = {
      name: productName,
      displayName: displayName,
      cardBadgeText: cardBadgeText,
      priceRupees: price,
      rewardValueRupees: Number(quantity) || 0,
      denomination: `${quantity} Diamonds`,
      category: 'DIAMONDS' as any,
      description: (formData.get('description') as string || '').trim(),
      image: image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      enabled: formData.get('status') === 'enabled',
      sortOrder: Number(formData.get('sortOrder') || 0),
      stockStatus: 'AVAILABLE' as const,
      deliveryInfo: 'Instant Delivery',
      glowSettings: {
        glowColor: formData.get('glowColor'),
        borderColor: formData.get('borderColor'),
        badgeBgColor: formData.get('badgeBgColor'),
        badgeTextColor: formData.get('badgeTextColor'),
        buttonBgColor: formData.get('buttonBgColor'),
        imageBorderColor: formData.get('imageBorderColor'),
        labelBorderColor: formData.get('labelBorderColor'),
        outerBorderThickness: formData.get('outerBorderThickness'),
        imageBorderThickness: formData.get('imageBorderThickness'),
        labelBorderThickness: formData.get('labelBorderThickness'),
        outerGlowEnabled: formData.get('outerGlowEnabled') === 'on',
        outerGlowIntensity: formData.get('outerGlowIntensity'),
        outerGlowBlur: formData.get('outerGlowBlur'),
        imageGlowEnabled: formData.get('imageGlowEnabled') === 'on',
        imageGlowIntensity: formData.get('imageGlowIntensity'),
        imageGlowBlur: formData.get('imageGlowBlur'),
        labelGlowEnabled: formData.get('labelGlowEnabled') === 'on',
        labelGlowIntensity: formData.get('labelGlowIntensity'),
        labelGlowBlur: formData.get('labelGlowBlur'),
        labelInnerGlowIntensity: formData.get('labelInnerGlowIntensity'),
        labelInnerGlowBlur: formData.get('labelInnerGlowBlur'),
      },
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        ...prodData,
        glowSettings: prodData.glowSettings
      });
    } else {
      await addProduct(prodData);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const updatePreview = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const quantity = (formData.get('quantity') as string || '').trim();
    const displayName = (formData.get('displayName') as string || '').trim();
    const cardBadgeText = (formData.get('cardBadgeText') as string || '').trim();
    const price = Number(formData.get('price'));
    const image = (formData.get('image') as string || '').trim();

    setPreviewData({
      ...previewData,
      name: displayName || (quantity ? `${quantity} Diamonds` : 'Diamond Package'),
      displayName: displayName,
      rewardValueRupees: Number(quantity) || 0,
      priceRupees: price,
      image: image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
      cardBadgeText: cardBadgeText,
      enabled: formData.get('status') === 'enabled',
      glowSettings: {
        glowColor: formData.get('glowColor'),
        borderColor: formData.get('borderColor'),
        badgeBgColor: formData.get('badgeBgColor'),
        badgeTextColor: formData.get('badgeTextColor'),
        buttonBgColor: formData.get('buttonBgColor'),
        imageBorderColor: formData.get('imageBorderColor'),
        labelBorderColor: formData.get('labelBorderColor'),
        outerBorderThickness: formData.get('outerBorderThickness'),
        imageBorderThickness: formData.get('imageBorderThickness'),
        labelBorderThickness: formData.get('labelBorderThickness'),
        outerGlowEnabled: formData.get('outerGlowEnabled') === 'on',
        outerGlowIntensity: formData.get('outerGlowIntensity'),
        outerGlowBlur: formData.get('outerGlowBlur'),
        imageGlowEnabled: formData.get('imageGlowEnabled') === 'on',
        imageGlowIntensity: formData.get('imageGlowIntensity'),
        imageGlowBlur: formData.get('imageGlowBlur'),
        labelGlowEnabled: formData.get('labelGlowEnabled') === 'on',
        labelGlowIntensity: formData.get('labelGlowIntensity'),
        labelGlowBlur: formData.get('labelGlowBlur'),
        labelInnerGlowIntensity: formData.get('labelInnerGlowIntensity'),
        labelInnerGlowBlur: formData.get('labelInnerGlowBlur'),
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Diamonds Management</h1>
          <p className="text-xs text-slate-400">Manage Free Fire diamond top-up products.</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setPreviewData({}); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition"
        >
          <Plus size={14} /> Add Diamonds Product
        </button>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
         <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Card Badge</th>
              <th className="py-3 px-3">Quantity</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
             {diamondProducts.map(p => (
               <tr key={p.id} className="hover:bg-slate-950/50">
                 <td className="py-3 px-3 font-bold text-white">{p.name}</td>
                 <td className="py-3 px-3">
                   {p.cardBadgeText ? (
                     <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800 font-mono text-[10px]">
                       {p.cardBadgeText}
                     </span>
                   ) : (
                     <span className="text-slate-500 italic text-[11px]">—</span>
                   )}
                 </td>
                 <td className="py-3 px-3 font-mono">{p.rewardValueRupees || (p as any).rewardValue || 0} Diamonds</td>
                 <td className="py-3 px-3 font-mono font-bold text-emerald-400">₹{p.priceRupees}</td>
                 <td className="py-3 px-3">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${p.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                     {p.enabled ? 'Enabled' : 'Disabled'}
                   </span>
                 </td>
                 <td className="py-3 px-3 text-right">
                    <button onClick={() => { setEditingProduct(p); setPreviewData(p); setIsModalOpen(true); }} className="text-slate-400 hover:text-white mr-2 cursor-pointer"><Edit2 size={14}/></button>
                     <button onClick={() => {
                        if (window.confirm('Are you sure you want to delete this Diamond product?')) {
                            deleteProduct(p.id).then(() => alert('Product deleted successfully')).catch((e) => alert('Failed to delete product: ' + (e.message || 'Unknown error')));
                        }
                     }} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={14}/></button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6">
            <form onChange={updatePreview} onSubmit={handleSave} className="flex-1 space-y-3.5">
              <h2 className="text-lg font-bold text-white">{editingProduct ? 'Edit' : 'Add'} Diamond Product</h2>
              
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">1. Diamond Quantity</label>
                <input 
                  name="quantity" 
                  type="number" 
                  defaultValue={editingProduct ? (editingProduct.rewardValueRupees ?? editingProduct.rewardValue ?? '') : ''} 
                  placeholder="Diamond Quantity (e.g. 18000)" 
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">2. Diamond Product Name</label>
                <input 
                  name="displayName" 
                  type="text" 
                  defaultValue={editingProduct ? (editingProduct.name || editingProduct.displayName || '') : ''} 
                  placeholder="Diamond Product Name (e.g. 100 Diamonds)" 
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">3. Card Badge Text</label>
                <input 
                  name="cardBadgeText" 
                  type="text" 
                  defaultValue={editingProduct?.cardBadgeText !== undefined ? editingProduct.cardBadgeText : ''} 
                  placeholder="Card Badge Text (e.g. SPECIAL OFFER)" 
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">4. Price (INR)</label>
                <input 
                  name="price" 
                  type="number" 
                  defaultValue={editingProduct ? (editingProduct.priceRupees ?? editingProduct.price ?? '') : ''} 
                  placeholder="Price (INR) (e.g. 2)" 
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">5. Image URL</label>
                <input 
                  name="image" 
                  defaultValue={editingProduct?.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'} 
                  placeholder="Image URL" 
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Sort Order</label>
                <input name="sortOrder" type="number" defaultValue={editingProduct?.sortOrder || 0} placeholder="Sort Order" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono" />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Status</label>
                <select name="status" value={previewData.enabled ? 'enabled' : 'disabled'} onChange={(e) => setPreviewData({...previewData, enabled: e.target.value === 'enabled'})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono">
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <input name="glowColor" type="color" defaultValue={editingProduct?.glowSettings?.glowColor || '#10B981'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Glow Color" />
                <input name="borderColor" type="color" defaultValue={editingProduct?.glowSettings?.borderColor || '#10B981'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Border Color" />
                <input name="badgeBgColor" type="color" defaultValue={editingProduct?.glowSettings?.badgeBgColor || '#155e75'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Badge Background Color" />
                <input name="badgeTextColor" type="color" defaultValue={editingProduct?.glowSettings?.badgeTextColor || '#bae6fd'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Badge Text Color" />
                <input name="buttonBgColor" type="color" defaultValue={editingProduct?.glowSettings?.buttonBgColor || '#38bdf8'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Button Background Color" />
                <input name="imageBorderColor" type="color" defaultValue={editingProduct?.glowSettings?.imageBorderColor || '#06b6d4'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Image Border Color" />
                <input name="labelBorderColor" type="color" defaultValue={editingProduct?.glowSettings?.labelBorderColor || '#06b6d4'} className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800" title="Label Border Color" />
              </div>
               
              <div className="text-white text-xs space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <h3 className="font-bold border-b border-slate-800 pb-1">Border Thickness (px)</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                      { name: 'outerBorderThickness', label: 'Outer', min: 0, max: 10 },
                      { name: 'imageBorderThickness', label: 'Image', min: 0, max: 10 },
                      { name: 'labelBorderThickness', label: 'Label', min: 0, max: 10 }
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                        <span className="w-12 text-[11px]">{item.label}:</span>
                        <input name={item.name} type="range" min={item.min} max={item.max} defaultValue={previewData.glowSettings?.[item.name] || 2} className="accent-cyan-500 w-full" />
                        <span className="w-8 text-right font-mono text-[11px]">{previewData.glowSettings?.[item.name] || 2}</span>
                    </div>
                  ))}
                </div>
                
                <h3 className="font-bold border-b border-slate-800 pb-1 mt-2">Glow Intensities & Blur</h3>
                <div className="space-y-2">
                  {[
                      { name: 'outerGlow', label: 'Outer', enabled: 'outerGlowEnabled', intensity: 'outerGlowIntensity', blur: 'outerGlowBlur' },
                      { name: 'imageGlow', label: 'Image', enabled: 'imageGlowEnabled', intensity: 'imageGlowIntensity', blur: 'imageGlowBlur' },
                      { name: 'labelGlow', label: 'Label Outer', enabled: 'labelGlowEnabled', intensity: 'labelGlowIntensity', blur: 'labelGlowBlur' },
                      { name: 'labelInnerGlow', label: 'Label Inner', enabled: 'labelGlowEnabled', intensity: 'labelInnerGlowIntensity', blur: 'labelInnerGlowBlur' }
                  ].map(item => (
                    <div key={item.name} className="space-y-1">
                        <div className="flex items-center gap-2">
                            {item.name !== 'labelInnerGlow' && <input name={item.enabled} type="checkbox" defaultChecked={previewData.glowSettings?.[item.enabled] ?? true} />}
                            <span className="w-20 text-[10px]">{item.label}:</span>
                            <div className="flex-1 flex flex-col gap-1">
                                <input name={item.intensity} type="range" min="0" max="150" defaultValue={previewData.glowSettings?.[item.intensity] || 50} className="accent-cyan-500 w-full" title="Intensity" />
                                <input name={item.blur} type="range" min="0" max="40" defaultValue={previewData.glowSettings?.[item.blur] || 25} className="accent-cyan-500 w-full" title="Blur" />
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
               
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer">Save Product</button>
              </div>
            </form>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-4 font-mono">LIVE CARD PREVIEW</h3>
                <div 
                      className="bg-slate-950/90 border rounded-3xl p-4 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl w-64"
                      style={{
                        borderColor: previewData.glowSettings?.borderColor || '#06b6d4',
                        borderWidth: `${previewData.glowSettings?.outerBorderThickness || 2}px`,
                        boxShadow: previewData.glowSettings?.outerGlowEnabled 
                            ? `0 0 ${previewData.glowSettings.outerGlowBlur || 25}px ${previewData.glowSettings.borderColor || '#06b6d4'}${(previewData.glowSettings.outerGlowIntensity || 50) > 50 ? 'FF' : '80'}`
                            : 'none'
                      }}
                    >
                      {/* Badge (Card Badge Text) */}
                      {previewData.cardBadgeText && previewData.cardBadgeText.trim() ? (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl border font-black text-[11px] tracking-wider mb-2.5"
                             style={{ 
                                  borderColor: previewData.glowSettings?.labelBorderColor || '#06b6d4',
                                  borderWidth: `${previewData.glowSettings?.labelBorderThickness || 1}px`,
                                  backgroundColor: previewData.glowSettings?.badgeBgColor || '#155e75',
                                  color: previewData.glowSettings?.badgeTextColor || '#bae6fd',
                                  boxShadow: previewData.glowSettings?.labelGlowEnabled 
                                      ? `0 0 ${previewData.glowSettings.labelGlowBlur || 10}px ${previewData.glowSettings.labelBorderColor || '#06b6d4'}${(previewData.glowSettings.labelGlowIntensity || 50) > 50 ? 'FF' : '80'}, 
                                         inset 0 0 ${previewData.glowSettings.labelInnerGlowBlur || 10}px ${previewData.glowSettings.labelBorderColor || '#06b6d4'}${(previewData.glowSettings.labelInnerGlowIntensity || 50) > 50 ? 'FF' : '80'}` 
                                      : 'none'
                             }}>
                          <Sparkles className="w-3.5 h-3.5" style={{ color: previewData.glowSettings?.badgeTextColor || previewData.glowSettings?.labelBorderColor || '#06b6d4' }} />
                          <span>{previewData.cardBadgeText}</span>
                        </div>
                      ) : (
                        <div className="h-2" />
                      )}

                      {/* Image */}
                      <img 
                        src={previewData.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'} 
                        alt="Product"
                        className="w-32 h-32 object-contain rounded-2xl" 
                        style={{ 
                          borderColor: previewData.glowSettings?.imageBorderColor || '#06b6d4',
                          borderWidth: `${previewData.glowSettings?.imageBorderThickness || 2}px`,
                          borderStyle: 'solid',
                          boxShadow: previewData.glowSettings?.imageGlowEnabled ? `0 0 ${previewData.glowSettings.imageGlowBlur || 15}px ${previewData.glowSettings.imageBorderColor || '#06b6d4'}` : 'none'
                        }}
                      />

                      {/* Product Name & Diamond Quantity */}
                      <div className="mt-2.5 space-y-0.5 w-full text-center">
                        <div className="font-extrabold text-white text-sm tracking-wide truncate">
                          {previewData.name || previewData.displayName || '100 Diamonds'}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-300 font-bold flex items-center justify-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{previewData.rewardValueRupees || 0} Diamonds</span>
                        </div>
                      </div>

                      {/* Price Button */}
                      <div 
                        className="mt-3 w-full border rounded-2xl p-1.5 flex items-center justify-between transition-all duration-300"
                        style={{
                          backgroundColor: previewData.glowSettings?.buttonBgColor || '#38BDF8',
                          borderColor: previewData.glowSettings?.borderColor || '#06b6d4',
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
    </div>
  );
};
