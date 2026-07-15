import type { CSSProperties } from 'react';

/**
 * Image with a graceful sepia placeholder.
 *
 * Pass `src` to show a real image (drop files into `public/images/...`).
 * With no `src`, a framed placeholder is rendered using `alt` as its caption,
 * so the layout is complete before any artwork exists.
 */
export default function Figure({
  src,
  alt,
  className = '',
  ratio = '4 / 3',
  rounded = true,
}: {
  src?: string;
  alt: string;
  className?: string;
  ratio?: string;
  rounded?: boolean;
}) {
  const style: CSSProperties = { aspectRatio: ratio };
  const radius = rounded ? 'rounded-lg' : '';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={style}
        className={`w-full object-cover ${radius} border border-navy-border shadow-lg shadow-black/40 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      style={style}
      className={`relative w-full overflow-hidden border border-navy-border bg-navy-light ${radius} ${className}`}
    >
      {/* sepia wash + faint grid so empty frames still read as "image" */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(218,165,32,0.10),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(244,234,213,1) 1px, transparent 1px), linear-gradient(90deg, rgba(244,234,213,1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-8 w-8 text-gold/50"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 16l-5-5L7 20" />
        </svg>
        <span className="font-body text-xs uppercase tracking-[0.2em] text-parchment-dim/70">
          Image to come
        </span>
        <span className="max-w-[24ch] font-body text-[11px] leading-snug text-parchment-dim/50">
          {alt}
        </span>
      </div>
    </div>
  );
}
