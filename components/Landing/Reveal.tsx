'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fades and lifts its children into view once on first scroll-intersection.
 * Respects `prefers-reduced-motion` (the reveal becomes instant).
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState({ shown: false, reduced: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState({ shown: true, reduced });
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition ease-out ${
        state.shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{
        transitionProperty: 'opacity, transform',
        transitionDuration: state.reduced ? '0ms' : '700ms',
        transitionDelay: state.reduced ? '0ms' : `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
