import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift, Megaphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'redeem-code' | 'diamonds';
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, type }) => {
  const [notice, setNotice] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchNotice = async () => {
        try {
          const res = await fetch(`/api/notices/active?type=${type}`);
          const data = await res.json();
          if (data.success && data.notice) {
            setNotice(data.notice);
          }
        } catch (err) {
          console.error(`Failed to load ${type} notice`, err);
        }
      };
      fetchNotice();
    }
  }, [isOpen, type]);

  if (!isOpen || !notice) return null;

  const isDiamonds = type === 'diamonds';
  const colorClass = isDiamonds ? 'cyan' : 'emerald';
  const bgColor = isDiamonds ? 'bg-cyan-400' : 'bg-emerald-400';
  const hoverBgColor = isDiamonds ? 'hover:bg-cyan-300' : 'hover:bg-emerald-300';
  const borderColor = isDiamonds ? 'border-cyan-500/30' : 'border-emerald-500/30';
  const borderGradientColor = isDiamonds ? 'border-cyan-500/20' : 'border-emerald-500/20';
  const bgGradientColor = isDiamonds ? 'bg-cyan-500/10' : 'bg-emerald-500/10';
  const gradFrom = isDiamonds ? 'from-cyan-500/0' : 'from-emerald-500/0';
  const gradVia = isDiamonds ? 'via-cyan-400' : 'via-emerald-400';
  const gradTo = isDiamonds ? 'to-cyan-500/0' : 'to-emerald-500/0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className={`bg-slate-900 border ${borderColor} rounded-3xl p-6 shadow-2xl relative max-w-sm w-full space-y-5 animate-in fade-in zoom-in duration-300`}>
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradFrom} ${gradVia} ${gradTo}`}></div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="text-center space-y-2">
            <h3 className={`text-sm font-black tracking-tight text-white font-mono uppercase ${bgGradientColor} border ${borderGradientColor} py-1.5 px-4 rounded-xl inline-block`}>
                {notice.title}
            </h3>
        </div>

        <div className="text-xs text-slate-300 font-sans leading-relaxed prose prose-invert max-w-none text-center">
            <ReactMarkdown>{notice.message}</ReactMarkdown>
        </div>

        {notice.imageUrl && (
            <div className="w-full rounded-2xl overflow-hidden border border-slate-700">
                <img src={notice.imageUrl} alt="Announcement" className="w-full h-32 object-cover" />
            </div>
        )}

        {notice.buttonEnabled && (
            <a 
                href={notice.buttonUrl || '#'}
                className={`w-full py-3 px-4 ${bgColor} text-slate-950 font-black text-xs rounded-xl tracking-wider ${hoverBgColor} transition-colors uppercase font-mono shadow-md flex items-center justify-center gap-2`}
            >
                {isDiamonds ? <Sparkles className="w-3.5 h-3.5" /> : <Megaphone className="w-3.5 h-3.5" />}
                {notice.buttonText || 'VIEW MORE →'}
            </a>
        )}
      </div>
    </div>
  );
};
