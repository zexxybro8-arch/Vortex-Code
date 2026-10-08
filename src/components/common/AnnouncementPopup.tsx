import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Logo } from './Logo';
import { X, ArrowRight } from 'lucide-react';

export const AnnouncementPopup: React.FC = () => {
  const { user, setCurrentView } = useAuth();
  const [notice, setNotice] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Fetch active notice from backend
    api.getActiveNotice()
      .then((activeNotice) => {
        if (!isMounted || !activeNotice) return;

        // Check scheduling (handled on backend too, but double check on client)
        const now = new Date();
        if (activeNotice.startAt && new Date(activeNotice.startAt) > now) return;
        if (activeNotice.endAt && new Date(activeNotice.endAt) < now) return;

        // Display Frequency logic
        const freq = activeNotice.displayFrequency || 'EVERY_LOAD';
        const noticeId = activeNotice.id;
        
        let shouldShow = true;
        if (freq === 'ONCE_SESSION') {
          const sessionDismissed = sessionStorage.getItem(`dismissed_notice_session_${noticeId}`);
          if (sessionDismissed === 'true') {
            shouldShow = false;
          }
        } else if (freq === 'ONCE_USER') {
          const dismissedKey = user 
            ? `dismissed_notice_usr_${user.id}_${noticeId}` 
            : `dismissed_notice_guest_${noticeId}`;
          const userDismissed = localStorage.getItem(dismissedKey);
          if (userDismissed === 'true') {
            shouldShow = false;
          }
        }

        if (shouldShow) {
          setNotice(activeNotice);
          // Small delay for smooth entry animation trigger
          setVisible(true);
          setTimeout(() => {
            setAnimate(true);
          }, 50);
        }
      })
      .catch((err) => {
        console.warn('Silent announcement load check exception:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle escape key to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, notice]);

  // Lock background scroll when modal is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  const handleClose = () => {
    if (!notice) return;
    setAnimate(false);
    
    // Save dismissal state according to frequency setting
    const freq = notice.displayFrequency || 'EVERY_LOAD';
    const noticeId = notice.id;

    if (freq === 'ONCE_SESSION') {
      sessionStorage.setItem(`dismissed_notice_session_${noticeId}`, 'true');
    } else if (freq === 'ONCE_USER') {
      const dismissedKey = user 
        ? `dismissed_notice_usr_${user.id}_${noticeId}` 
        : `dismissed_notice_guest_${noticeId}`;
      localStorage.setItem(dismissedKey, 'true');
    }

    // Delay unmounting to let exit transition finish
    setTimeout(() => {
      setVisible(false);
      setNotice(null);
    }, 300);
  };

  const handleButtonClick = () => {
    if (!notice) return;
    
    // Fallback/standard dismiss if button disabled or has no url
    if (!notice.buttonEnabled || !notice.buttonUrl) {
      handleClose();
      return;
    }

    const url = notice.buttonUrl.trim();

    // Prevent dangerous javascript: URLs
    if (url.toLowerCase().startsWith('javascript:')) {
      console.warn('Blocked dangerous URL execution: javascript:');
      return;
    }

    handleClose();

    if (url.startsWith('/')) {
      // Internal route logic
      if (url === '/lookup' || url.includes('lookup')) {
        setCurrentView('order-lookup');
      } else if (url === '/vault' || url.includes('vault')) {
        setCurrentView('vault');
      } else if (url === '/login' || url.includes('login')) {
        setCurrentView('login');
      } else {
        setCurrentView('dashboard');
      }
    } else {
      // Secure external HTTPS redirect
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!visible || !notice) return null;

  const isCustomButton = notice.buttonEnabled && notice.buttonText;
  const buttonText = isCustomButton ? notice.buttonText : 'CONTINUE →';
  const buttonAction = isCustomButton ? handleButtonClick : handleClose;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
      animate ? 'bg-slate-950/85 backdrop-blur-md' : 'bg-slate-950/0 backdrop-blur-none pointer-events-none'
    }`}>
      
      {/* Centered Modal Card */}
      <div 
        className={`w-full max-w-[560px] max-h-[calc(100dvh-24px)] md:max-h-[calc(100dvh-32px)] bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col transition-all duration-300 transform overflow-hidden neon-glow select-none relative ${
          animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
      >
        {/* Absolute Neon Lighting Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* HEADER AREA */}
        <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3 shrink-0 z-10">
          <Logo size="sm" showSubtitle={true} />
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/30 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400"
            aria-label="Close Announcement Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NOTICE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-4 pr-1 z-10 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Optional Custom Notice Image banner */}
          {notice.imageUrl && (
            <div className="w-full max-h-[180px] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 flex items-center justify-center shrink-0">
              <img
                src={notice.imageUrl}
                alt="Announcement banner"
                className="max-w-full max-h-[180px] object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Title and Message */}
          <div className="flex flex-col items-center text-center w-full px-3 sm:px-4 space-y-3">
            <h2 
              id="announcement-title"
              className="text-base sm:text-lg font-black tracking-tight text-white font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-4 rounded-xl inline-block text-center"
            >
              {notice.title}
            </h2>
            
            <div 
              className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-wrap text-center select-text w-full"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
              {notice.message}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION AREA */}
        <div className="pt-4 pb-1 shrink-0 w-full border-t border-slate-800/50 z-10">
          <button
            onClick={buttonAction}
            className="w-full py-3.5 px-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl tracking-wider hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase font-mono shadow-md"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
