import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

interface DiamondsNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiamondsNoticeModal: React.FC<DiamondsNoticeModalProps> = ({ isOpen, onClose }) => {
  const [notice, setNotice] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchNotice = async () => {
        try {
          const res = await fetch('/api/notices/active?type=diamonds');
          const data = await res.json();
          if (data.success && data.notice) {
            setNotice(data.notice);
          }
        } catch (err) {
          console.error('Failed to load diamonds notice', err);
        }
      };
      fetchNotice();
    }
  }, [isOpen]);

  if (!isOpen || !notice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative max-w-sm w-full space-y-5 animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0"></div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="text-center space-y-2">
            <h3 className="text-sm font-black tracking-tight text-white font-mono uppercase bg-cyan-500/10 border border-cyan-500/20 py-1.5 px-4 rounded-xl inline-block">
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
                className="w-full py-3 px-4 bg-cyan-400 text-slate-950 font-black text-xs rounded-xl tracking-wider hover:bg-cyan-300 transition-colors uppercase font-mono shadow-md flex items-center justify-center gap-2"
            >
                <Sparkles className="w-3.5 h-3.5" />
                {notice.buttonText || 'VIEW MORE →'}
            </a>
        )}
      </div>
    </div>
  );
};
