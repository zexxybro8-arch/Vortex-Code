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

  // Frameless, direct sizing without boxes or card frames
  // Mobile ~42-50px visual height, scaled proportionally on tablet/desktop
  const logoImageClass =
    size === 'sm'
      ? 'h-10 sm:h-11 md:h-12 w-auto max-w-[120px] sm:max-w-[150px]'
      : size === 'lg'
      ? 'h-14 sm:h-16 md:h-20 w-auto max-w-[200px]'
      : 'h-11 sm:h-12 md:h-14 w-auto max-w-[160px]';

  const titleSizeClass =
    size === 'sm'
      ? 'text-sm sm:text-base md:text-lg font-black'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl font-black'
      : 'text-base sm:text-xl font-black';

  const hasCustomImage = Boolean(effectiveLogoUrl && !imageError);

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 select-none">
      {hasCustomImage ? (
        /* DIRECT LOGO IMAGE WITHOUT ANY FRAME, BORDER, BACKGROUND CARD, OR BOX */
        <img
          src={effectiveLogoUrl}
          alt={effectiveWebsiteName}
          onError={() => setImageError(true)}
          className={`${logoImageClass} object-contain shrink-0 align-middle drop-shadow-sm`}
        />
      ) : (
        /* Sleek built-in fallback voucher/shield icon without heavy border box */
        <div className="flex items-center justify-center shrink-0">
          <svg
            className={`${size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'} text-emerald-400 drop-shadow-md`}
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
        </div>
      )}

      {/* Brand Name & Tagline */}
      <div className="flex flex-col justify-center min-w-0">
        <span className={`${titleSizeClass} tracking-tight text-white font-mono uppercase truncate leading-tight`}>
          {effectiveWebsiteName}
        </span>
        {showSubtitle && effectiveTagline && (
          <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-emerald-400 uppercase truncate leading-tight mt-0.5">
            {effectiveTagline}
          </span>
        )}
      </div>
    </div>
  );
};
