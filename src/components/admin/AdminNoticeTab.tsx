import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminNotice } from '../../types/admin';
import { Logo } from '../common/Logo';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Save,
  AlertCircle
} from 'lucide-react';

export const AdminNoticeTab: React.FC = () => {
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [buttonText, setButtonText] = useState('VIEW STORE →');
  const [buttonUrl, setButtonUrl] = useState('/');
  const [displayFrequency, setDisplayFrequency] = useState<'EVERY_LOAD' | 'ONCE_SESSION' | 'ONCE_USER'>('EVERY_LOAD');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [priority, setPriority] = useState(0);

  // Load notices
  const loadNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotices();
      setNotices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  // Set form to edit existing notice
  const handleEdit = (notice: AdminNotice) => {
    setEditingId(notice.id || null);
    setEnabled(notice.enabled);
    setTitle(notice.title);
    setMessage(notice.message);
    setImageUrl(notice.imageUrl || '');
    setButtonEnabled(notice.buttonEnabled);
    setButtonText(notice.buttonText || 'VIEW STORE →');
    setButtonUrl(notice.buttonUrl || '/');
    setDisplayFrequency(notice.displayFrequency);
    setStartAt(notice.startAt ? notice.startAt.substring(0, 16) : '');
    setEndAt(notice.endAt ? notice.endAt.substring(0, 16) : '');
    setPriority(notice.priority || 0);
    setSuccessMessage(null);
    setError(null);
  };

  // Reset form
  const handleResetForm = () => {
    setEditingId(null);
    setEnabled(false);
    setTitle('');
    setMessage('');
    setImageUrl('');
    setButtonEnabled(false);
    setButtonText('VIEW STORE →');
    setButtonUrl('/');
    setDisplayFrequency('EVERY_LOAD');
    setStartAt('');
    setEndAt('');
    setPriority(0);
    setSuccessMessage(null);
    setError(null);
  };

  // Submit Notice
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setError('Notice Title is required');
      return;
    }
    if (!message.trim()) {
      setError('Notice Message is required');
      return;
    }

    const payload = {
      enabled,
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl.trim() || null,
      buttonEnabled,
      buttonText: buttonEnabled ? buttonText.trim() : null,
      buttonUrl: buttonEnabled ? buttonUrl.trim() : null,
      displayFrequency,
      startAt: startAt || null,
      endAt: endAt || null,
      priority: Number(priority || 0),
    };

    try {
      if (editingId) {
        await api.updateNotice(editingId, payload);
        setSuccessMessage('Website notice updated successfully!');
      } else {
        await api.createNotice(payload);
        setSuccessMessage('New website notice created successfully!');
      }
      handleResetForm();
      await loadNotices();
    } catch (err: any) {
      setError(err.message || 'Failed to save website notice');
    }
  };

  // Delete Notice
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this notice?')) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    try {
      await api.deleteNotice(id);
      setSuccessMessage('Notice deleted successfully!');
      await loadNotices();
      if (editingId === id) {
        handleResetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete notice');
    }
  };

  // Toggle Enable status directly
  const handleToggleStatus = async (notice: AdminNotice) => {
    if (!notice.id) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await api.updateNotice(notice.id, { enabled: !notice.enabled });
      setSuccessMessage(`Notice is now ${!notice.enabled ? 'Enabled' : 'Disabled'}`);
      await loadNotices();
    } catch (err: any) {
      setError(err.message || 'Failed to update notice status');
    }
  };

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-400" />
          <span>Website Announcement Notices</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Create and manage custom announcement popups overlays on the customer storefront.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form and Preview Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Management Form (7 columns) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"></div>
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {editingId ? 'Edit Notice' : 'Create New Announcement Notice'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold font-mono transition-colors"
              >
                CANCEL EDIT
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Enabled / Disabled Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-200">Enable Notice Popup</div>
                <div className="text-[10px] text-slate-500">Toggle whether this notice is active and ready to be displayed.</div>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer ${
                  enabled ? 'bg-emerald-400' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform duration-300 ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Notice Title */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider">
                Notice Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. IMPORTANT ANNOUNCEMENT"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                required
              />
            </div>

            {/* Notice Message */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider">
                Announcement Message <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your markdown or text announcement here..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans leading-relaxed"
                required
              />
            </div>

            {/* Optional Image URL */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider">
                Optional Banner/Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/banner.png"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500 block">Provide an image URL to show inside the announcement popup.</span>
            </div>

            {/* Action Button Toggle & Configurations */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-200">Include Action Button</div>
                  <div className="text-[10px] text-slate-500">Provide an interactive button to redirect users inside or outside the store.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setButtonEnabled(!buttonEnabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer ${
                    buttonEnabled ? 'bg-emerald-400' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform duration-300 ${
                      buttonEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {buttonEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-400 uppercase tracking-widest text-[10px]">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g. VIEW STORE →"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-400 uppercase tracking-widest text-[10px]">
                      Button Destination URL
                    </label>
                    <input
                      type="text"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="e.g. / or https://t.me/channel"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Display Frequency Selector */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider">
                Display Frequency
              </label>
              <select
                value={displayFrequency}
                onChange={(e: any) => setDisplayFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              >
                <option value="EVERY_LOAD">Every page load</option>
                <option value="ONCE_SESSION">Once per browser session</option>
                <option value="ONCE_USER">Once per authenticated user</option>
              </select>
            </div>

            {/* Schedule and Priority Block */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300 uppercase tracking-widest text-[10px]">
                  Start Date/Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300 uppercase tracking-widest text-[10px]">
                  End Date/Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300 uppercase tracking-widest text-[10px]">
                  Priority (Order)
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-center"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase font-mono"
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Save & Update Announcement' : 'Publish / Save New Notice'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h2 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>LIVE INTERACTIVE PREVIEW</span>
            </h2>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
              Updates immediately as you edit the fields above. Shows the exact storefront notice layout.
            </p>
          </div>

          {/* Rendering the Mock Popup Layout Exactly as in Storefront */}
          <div className="border border-slate-800 rounded-3xl bg-slate-950/90 p-6 relative shadow-2xl flex flex-col justify-center items-center text-center space-y-5 min-h-[400px] overflow-hidden">
            {/* Absolute Ambient Neon Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>
            
            {/* Close Button Mock */}
            <button className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-default" title="Mock close button">
              <X className="w-4 h-4" />
            </button>

            {/* Website Dynamic Logo */}
            <div className="pt-2 z-10 scale-90 sm:scale-100">
              <Logo size="sm" showSubtitle={true} />
            </div>

            {/* Notice Title */}
            <div className="space-y-2 z-10 w-full px-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 py-1 px-4 rounded-xl inline-block">
                {title || 'IMPORTANT UPDATE'}
              </h3>
              
              {/* Notice Message with wrapping and scroll */}
              <div className="text-xs text-slate-300 font-sans leading-relaxed max-h-[120px] overflow-y-auto pr-1 whitespace-pre-wrap">
                {message || 'Your main announcement or informative message details will appear right here dynamically from admin settings.'}
              </div>
            </div>

            {/* Notice Custom Image */}
            {imageUrl && (
              <div className="w-full max-h-[140px] rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 z-10 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Announcement Banner"
                  className="max-w-full max-h-[140px] object-cover"
                  onError={(e) => {
                    (e.target as any).src = 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png';
                  }}
                />
              </div>
            )}

            {/* Action Button */}
            {buttonEnabled && (
              <div className="w-full pt-1 z-10">
                <button className="w-full py-3 px-4 bg-emerald-400 text-slate-950 font-black text-xs rounded-xl tracking-wider hover:bg-emerald-300 transition-colors uppercase font-mono shadow-md cursor-default">
                  {buttonText || 'VIEW STORE →'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* List of Existing Notices */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-3">
          Stored Announcement Notices ({notices.length})
        </h2>

        {loading && notices.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Loading website notices...
          </div>
        ) : notices.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 leading-relaxed bg-slate-950 rounded-xl border border-slate-800/80">
            No announcement notices found in the database. Use the form above to publish your first update.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Notice Info</th>
                  <th className="py-3 px-3">Trigger Frequency</th>
                  <th className="py-3 px-3">Schedule Active</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {notices.map((n) => {
                  const isScheduled = n.startAt || n.endAt;
                  return (
                    <tr key={n.id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-white">{n.priority}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-100">{n.title}</div>
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-[200px] mt-0.5">
                          {n.message}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                        {n.displayFrequency === 'EVERY_LOAD' && 'Every Load'}
                        {n.displayFrequency === 'ONCE_SESSION' && 'Once per Session'}
                        {n.displayFrequency === 'ONCE_USER' && 'Once per User'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                        {isScheduled ? (
                          <div className="space-y-0.5">
                            {n.startAt && <div className="text-emerald-400">From: {n.startAt.substring(0, 16)}</div>}
                            {n.endAt && <div className="text-rose-400">Till: {n.endAt.substring(0, 16)}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Always Active</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => handleToggleStatus(n)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                            n.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                        >
                          {n.enabled ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(n)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-950 border border-slate-800 rounded-lg hover:border-emerald-500/20 transition-all cursor-pointer"
                            title="Edit Notice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(n.id!)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 rounded-lg hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Delete Notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
