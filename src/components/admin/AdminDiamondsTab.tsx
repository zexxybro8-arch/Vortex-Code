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
      setPreviewData(editingProduct);
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
    const quantity = formData.get('quantity') as string;
    const prodData = {
      name: `${quantity} Diamonds`,
      displayName: formData.get('displayName') as string,
      cardBadgeText: formData.get('cardBadgeText') as string,
      priceRupees: Number(formData.get('price')),
      rewardValueRupees: Number(quantity),
      denomination: `${quantity} Diamonds`,
      category: 'DIAMONDS' as any,
      description: formData.get('description') as string,
      image: formData.get('image') as string,
      enabled: formData.get('status') === 'enabled',
      sortOrder: Number(formData.get('sortOrder') || 0),
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
    const quantity = formData.get('quantity') as string;
    setPreviewData({
      ...previewData,
      rewardValueRupees: Number(quantity),
      priceRupees: Number(formData.get('price')),
      image: formData.get('image'),
      cardBadgeText: formData.get('cardBadgeText'),
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
              <th className="py-3 px-3">Quantity</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
             {diamondProducts.map(p => (
               <tr key={p.id} className="hover:bg-slate-950/50">
                 <td className="py-3 px-3">{p.rewardValueRupees} Diamonds</td>
                 <td className="py-3 px-3">₹{p.priceRupees}</td>
                 <td className="py-3 px-3">{p.enabled ? 'Enabled' : 'Disabled'}</td>
                 <td className="py-3 px-3 text-right">
                    <button onClick={() => { setEditingProduct(p); setPreviewData(p); setIsModalOpen(true); }} className="text-slate-400 hover:text-white mr-2"><Edit2 size={14}/></button>
                     <button onClick={() => {
                        if (window.confirm('Are you sure you want to delete this Diamond product?')) {
                            deleteProduct(p.id).then(() => alert('Product deleted successfully')).catch((e) => alert('Failed to delete product: ' + (e.message || 'Unknown error')));
                        }
                     }} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6">
            <form onChange={updatePreview} onSubmit={handleSave} className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-white">{editingProduct ? 'Edit' : 'Add'} Diamond Product</h2>
              <input name="quantity" type="number" defaultValue={editingProduct?.rewardValueRupees} placeholder="Diamond Quantity" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" required />
              <input name="displayName" type="text" defaultValue={editingProduct?.displayName} placeholder="Diamond Product Name" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" />
              <input name="cardBadgeText" type="text" defaultValue={editingProduct?.cardBadgeText || 'DIAMONDS'} placeholder="Card Badge Text" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" />
              <input name="price" type="number" defaultValue={editingProduct?.priceRupees} placeholder="Price (INR)" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" required />
              <input name="image" defaultValue={editingProduct?.image} placeholder="Image URL" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" required />
              <input name="sortOrder" type="number" defaultValue={editingProduct?.sortOrder || 0} placeholder="Sort Order" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white" />
              <select name="status" value={previewData.enabled ? 'enabled' : 'disabled'} onChange={(e) => setPreviewData({...previewData, enabled: e.target.value === 'enabled'})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white">
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input name="glowColor" type="color" defaultValue={editingProduct?.glowSettings?.glowColor || '#10B981'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Glow Color" />
                <input name="borderColor" type="color" defaultValue={editingProduct?.glowSettings?.borderColor || '#10B981'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Border Color" />
                <input name="badgeBgColor" type="color" defaultValue={editingProduct?.glowSettings?.badgeBgColor || '#155e75'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Badge Background Color" />
                <input name="badgeTextColor" type="color" defaultValue={editingProduct?.glowSettings?.badgeTextColor || '#bae6fd'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Badge Text Color" />
                <input name="buttonBgColor" type="color" defaultValue={editingProduct?.glowSettings?.buttonBgColor || '#38bdf8'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Button Background Color" />
                <input name="imageBorderColor" type="color" defaultValue={editingProduct?.glowSettings?.imageBorderColor || '#06b6d4'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Image Border Color" />
                <input name="labelBorderColor" type="color" defaultValue={editingProduct?.glowSettings?.labelBorderColor || '#06b6d4'} className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800" title="Label Border Color" />
              </div>
               
               <div className="text-white text-xs space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <h3 className="font-bold border-b border-slate-800 pb-1">Border Thickness (px)</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                      { name: 'outerBorderThickness', label: 'Outer', min: 0, max: 10 },
                      { name: 'imageBorderThickness', label: 'Image', min: 0, max: 10 },
                      { name: 'labelBorderThickness', label: 'Label', min: 0, max: 10 }
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                        <span className="w-12">{item.label}:</span>
                        <input name={item.name} type="range" min={item.min} max={item.max} defaultValue={previewData.glowSettings?.[item.name] || 2} className="accent-cyan-500 w-full" />
                        <span className="w-8 text-right">{previewData.glowSettings?.[item.name] || 2}</span>
                    </div>
                  ))}
                </div>
                
                <h3 className="font-bold border-b border-slate-800 pb-1 mt-2">Glow Intensities & Blur</h3>
                <div className="space-y-3">
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
               
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl">Save</button>
              </div>
            </form>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-4">LIVE CARD PREVIEW</h3>
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
                      <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl border font-black text-[11px] tracking-wider mb-3"
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
                        <Sparkles className="w-3.5 h-3.5" style={{ color: previewData.glowSettings?.labelBorderColor || '#06b6d4' }} />
                        <span>{previewData.cardBadgeText || 'DIAMONDS'}</span>
                      </div>
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
