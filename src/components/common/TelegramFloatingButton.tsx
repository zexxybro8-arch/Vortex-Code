import React, { useState, useEffect } from 'react';

interface ContactConfig {
  enabled: boolean;
  platform: 'telegram' | 'whatsapp' | 'custom';
  url: string;
  iconUrl: string;
  label: string;
  widgetSize: number;
  widgetRight: number;
  widgetBottom: number;
  widgetMobileSize: number;
  widgetMobileRight: number;
  widgetMobileBottom: number;
}

export const TelegramFloatingButton: React.FC = () => {
  const [config, setConfig] = useState<ContactConfig>({
    enabled: true,
    platform: 'telegram',
    url: 'https://t.me/VortexCodeSupport',
    iconUrl: '',
    label: 'Contact Support',
    widgetSize: 60,
    widgetRight: 30,
    widgetBottom: 30,
    widgetMobileSize: 55,
    widgetMobileRight: 35,
    widgetMobileBottom: 110,
  });
  const [iconError, setIconError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = () => {
      fetch('/api/settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.settings) {
            const s = data.settings;
            const isEnabled =
              s.contactEnabled !== undefined
                ? Boolean(s.contactEnabled)
                : s.telegramEnabled !== undefined
                ? Boolean(s.telegramEnabled)
                : true;

            const platform = (s.contactPlatform || 'telegram').toLowerCase();
            const url = s.contactUrl || s.telegramUrl || 'https://t.me/VortexCodeSupport';
            const iconUrl = s.contactIconUrl || '';
            const label =
              s.contactLabel ||
              (platform === 'whatsapp'
                ? 'WhatsApp Support'
                : platform === 'telegram'
                ? 'Telegram Support'
                : 'Contact Support');

            setConfig({
              enabled: isEnabled,
              platform: platform === 'whatsapp' || platform === 'custom' ? platform : 'telegram',
              url,
              iconUrl,
              label,
              widgetSize: Number(s.contactWidgetSize) || 60,
              widgetRight: Number(s.contactWidgetRight) !== undefined && !isNaN(Number(s.contactWidgetRight)) ? Number(s.contactWidgetRight) : 30,
              widgetBottom: Number(s.contactWidgetBottom) !== undefined && !isNaN(Number(s.contactWidgetBottom)) ? Number(s.contactWidgetBottom) : 30,
              widgetMobileSize: Number(s.contactWidgetMobileSize) || 55,
              widgetMobileRight: Number(s.contactWidgetMobileRight) !== undefined && !isNaN(Number(s.contactWidgetMobileRight)) ? Number(s.contactWidgetMobileRight) : 35,
              widgetMobileBottom: Number(s.contactWidgetMobileBottom) !== undefined && !isNaN(Number(s.contactWidgetMobileBottom)) ? Number(s.contactWidgetMobileBottom) : 110,
            });
          }
        })
        .catch(() => {});
    };

    loadConfig();
    const interval = setInterval(loadConfig, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Reset icon error if iconUrl changed
  useEffect(() => {
    setIconError(false);
  }, [config.iconUrl]);

  if (!config.enabled) {
    return null;
  }

  // Format effective destination URL
  const rawUrl = config.url.trim();
  let effectiveUrl = rawUrl;

  if (config.platform === 'telegram') {
    if (rawUrl.startsWith('@')) {
      effectiveUrl = `https://t.me/${rawUrl.substring(1)}`;
    } else if (rawUrl.startsWith('t.me/')) {
      effectiveUrl = `https://${rawUrl}`;
    } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      effectiveUrl = `https://t.me/${rawUrl}`;
    }
  } else if (config.platform === 'whatsapp') {
    const digits = rawUrl.replace(/[\s\-\+\(\)]/g, '');
    if (/^\d{7,15}$/.test(digits)) {
      effectiveUrl = `https://wa.me/${digits}`;
    } else if (rawUrl.startsWith('wa.me/')) {
      effectiveUrl = `https://${rawUrl}`;
    } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      effectiveUrl = `https://wa.me/${digits || rawUrl}`;
    }
  } else {
    if (!effectiveUrl.startsWith('http://') && !effectiveUrl.startsWith('https://')) {
      effectiveUrl = `https://${effectiveUrl}`;
    }
  }

  // Platform styling
  const isWhatsApp = config.platform === 'whatsapp';
  const isTelegram = config.platform === 'telegram';

  const bgGradient = isWhatsApp
    ? 'from-emerald-600 via-emerald-500 to-green-400 border-emerald-300/50 shadow-emerald-950/60 ring-emerald-400/50'
    : isTelegram
    ? 'from-sky-600 via-sky-500 to-sky-400 border-sky-300/40 shadow-sky-950/60 ring-sky-400/50'
    : 'from-emerald-600 via-teal-500 to-cyan-400 border-teal-300/40 shadow-cyan-950/60 ring-teal-400/50';

  const auraColor = isWhatsApp
    ? 'bg-emerald-400/30 group-hover:bg-emerald-400/50'
    : isTelegram
    ? 'bg-sky-400/30 group-hover:bg-sky-400/50'
    : 'bg-teal-400/30 group-hover:bg-teal-400/50';

  const hasCustomIcon = Boolean(config.iconUrl && !iconError);

  return (
    <>
      <style>{`
        :root {
          --contact-size-mobile: ${config.widgetMobileSize}px;
          --contact-right-mobile: ${config.widgetMobileRight}px;
          --contact-bottom-mobile: ${config.widgetMobileBottom}px;
          --contact-size-desktop: ${config.widgetSize}px;
          --contact-right-desktop: ${config.widgetRight}px;
          --contact-bottom-desktop: ${config.widgetBottom}px;
        }
        .contact-floating-widget-wrapper {
          position: fixed;
          z-index: 35;
          right: var(--contact-right-mobile);
          bottom: calc(var(--contact-bottom-mobile) + env(safe-area-inset-bottom, 0px));
          width: var(--contact-size-mobile);
          height: var(--contact-size-mobile);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (min-width: 640px) {
          .contact-floating-widget-wrapper {
            right: var(--contact-right-desktop);
            bottom: calc(var(--contact-bottom-desktop) + env(safe-area-inset-bottom, 0px));
            width: var(--contact-size-desktop);
            height: var(--contact-size-desktop);
          }
        }
      `}</style>

      <div className="contact-floating-widget-wrapper print:hidden select-none">
        <a
          href={effectiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-tr ${bgGradient} text-white shadow-xl border-2 hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2`}
          aria-label={config.label}
          title={config.label}
        >
          {/* Subtle glow aura */}
          <div className={`absolute inset-0 rounded-full ${auraColor} blur-md transition-all pointer-events-none`}></div>

          {/* Icon Rendering: Custom Icon URL or Platform Default SVG with proportional scaling */}
          {hasCustomIcon ? (
            <img
              src={config.iconUrl}
              alt={config.label}
              onError={() => setIconError(true)}
              className="w-[55%] h-[55%] object-contain drop-shadow-md rounded-full relative z-10"
            />
          ) : isWhatsApp ? (
            <svg className="w-[55%] h-[55%] fill-current text-white drop-shadow-md relative z-10" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          ) : isTelegram ? (
            <svg className="w-[55%] h-[55%] text-white fill-current transform -translate-x-0.5 translate-y-0.5 drop-shadow-md relative z-10" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          ) : (
            <svg className="w-[55%] h-[55%] text-white fill-none stroke-current stroke-2 drop-shadow-md relative z-10" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}

          {/* Pulsing online status indicator proportionally positioned */}
          <span className="absolute top-0 right-0 flex w-[22%] h-[22%] max-w-[14px] max-h-[14px] min-w-[8px] min-h-[8px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border-2 border-slate-950"></span>
          </span>

          {/* Hover Tooltip (Desktop) */}
          <span className="hidden md:group-hover:block absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-bold whitespace-nowrap shadow-2xl animate-in fade-in duration-150 z-20">
            {config.label}
          </span>
        </a>
      </div>
    </>
  );
};

export const FloatingContactButton = TelegramFloatingButton;
