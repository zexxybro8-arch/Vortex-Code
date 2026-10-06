import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const iconSizeClass = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const titleSizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-3 select-none group">
      {/* Icon: Rounded shield + keycard bracket with emerald glow */}
      <div className={`relative ${iconSizeClass} flex items-center justify-center shrink-0`}>
        <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-md group-hover:bg-emerald-400/50 transition-all duration-300"></div>
        <div className="relative w-full h-full bg-slate-900 border border-emerald-500/50 rounded-xl flex items-center justify-center shadow-lg overflow-hidden group-hover:border-emerald-400 transition-colors">
          <svg
            className="w-3/5 h-3/5 text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Keycard / Gift code voucher outline */}
            <rect x="2" y="5" width="20" height="14" rx="3" />
            <path d="M2 10h20" strokeWidth="1.8" strokeDasharray="2 2" />
            <path d="M6 15h4" strokeWidth="2.5" />
            <path d="M16 15h2" strokeWidth="2.5" />
          </svg>
          <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`${titleSizeClass} font-extrabold tracking-tight text-white font-mono uppercase`}>
            VORTEX<span className="text-emerald-400">CODE</span>
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-medium tracking-widest text-emerald-400/90 uppercase -mt-0.5">
            Secure Digital Store
          </span>
        )}
      </div>
    </div>
  );
};
