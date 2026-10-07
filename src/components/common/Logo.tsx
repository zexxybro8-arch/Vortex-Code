import React, { useState, useEffect } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  logoUrl?: string;
  websiteName?: string;
  tagline?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  logoUrl: propLogoUrl,
  websiteName: propWebsiteName,
  tagline: propTagline,
}) => {
  const [serverBranding, setServerBranding] = useState<{
    logoUrl?: string;
    websiteName?: string;
    tagline?: string;
  }>({});
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // If not passed via props, dynamically load saved admin branding from backend
    if (!propLogoUrl && !propWebsiteName) {
      let isMounted = true;
      fetch('/api/settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.settings) {
            setServerBranding({
              logoUrl: data.settings.logoUrl || '',
              websiteName: data.settings.websiteName || data.settings.storeName || 'VORTEX CODE',
              tagline: data.settings.tagline || data.settings.subtitle || 'SECURE DIGITAL STORE',
            });
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [propLogoUrl, propWebsiteName]);

  const effectiveLogoUrl = (propLogoUrl !== undefined ? propLogoUrl : serverBranding.logoUrl || '').trim();
  const effectiveWebsiteName = (propWebsiteName || serverBranding.websiteName || 'VORTEX CODE').trim();
  const effectiveTagline = (propTagline || serverBranding.tagline || 'SECURE DIGITAL STORE').trim();

  // Reset image error if logo URL changed
  useEffect(() => {
    setImageError(false);
  }, [effectiveLogoUrl]);

  const iconSizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const titleSizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  const hasCustomImage = Boolean(effectiveLogoUrl && !imageError);

  return (
    <div className="flex items-center gap-3 select-none group">
      {hasCustomImage ? (
        <div className={`relative ${iconSizeClass} flex items-center justify-center shrink-0`}>
          <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md group-hover:bg-emerald-400/40 transition-all duration-300"></div>
          <img
            src={effectiveLogoUrl}
            alt={effectiveWebsiteName}
            onError={() => setImageError(true)}
            className="relative w-full h-full object-contain rounded-xl bg-slate-900 border border-emerald-500/50 p-1 shadow-lg group-hover:border-emerald-400 transition-colors"
          />
        </div>
      ) : (
        /* Default Brand Icon: Rounded shield + gift card voucher with emerald glow */
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
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <path d="M2 10h20" strokeWidth="1.8" strokeDasharray="2 2" />
              <path d="M6 15h4" strokeWidth="2.5" />
              <path d="M16 15h2" strokeWidth="2.5" />
            </svg>
            <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`${titleSizeClass} font-extrabold tracking-tight text-white font-mono uppercase`}>
            {effectiveWebsiteName}
          </span>
        </div>
        {showSubtitle && effectiveTagline && (
          <span className="text-[10px] font-medium tracking-widest text-emerald-400/90 uppercase -mt-0.5">
            {effectiveTagline}
          </span>
        )}
      </div>
    </div>
  );
};
