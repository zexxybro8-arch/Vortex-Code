import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Gift } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const NoticeRenderer: React.FC<{ type: 'redeem-code' | 'diamonds' }> = ({ type }) => {
  const [notice, setNotice] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const notices = await api.getNotices();
        const activeNotice = notices.find(n => n.enabled && n.type === type && n.title && n.message);
        if (activeNotice) {
            setNotice(activeNotice);
            setVisible(true);
        }
      } catch (err) {
        console.error('Failed to load notices', err);
      }
    };
    fetchNotice();
  }, [type]);

  if (!notice || !visible) return null;

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0"></div>
        <button
            onClick={() => setVisible(false)}
            className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
        >
            <X className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-black tracking-tight text-white font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 py-1 px-3 rounded-lg inline-block mb-3">
            {notice.title}
        </h3>
        <div className="text-xs text-slate-300 font-sans leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>{notice.message}</ReactMarkdown>
        </div>
        {notice.buttonEnabled && (
            <a 
                href={notice.buttonUrl || '#'}
                className="mt-4 w-full py-2.5 px-4 bg-emerald-400 text-slate-950 font-black text-xs rounded-xl tracking-wider hover:bg-emerald-300 transition-colors uppercase font-mono shadow-md flex items-center justify-center gap-2"
            >
                <Gift className="w-3.5 h-3.5" />
                {notice.buttonText || 'VIEW MORE →'}
            </a>
        )}
    </div>
  );
};
