'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'story', label: 'The Story' },
  { id: 'timeline', label: 'Magdala 1868' },
  { id: 'explore', label: 'Explore' },
];

export default function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('story');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-navy-border bg-navy/85 backdrop-blur-md'
          : 'border-b border-transparent bg-gradient-to-b from-black/50 to-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <Link href="#top" className="group flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/60 text-gold">
            <span className="font-heading text-sm leading-none">α</span>
          </span>
          <span className="font-heading text-sm tracking-wide text-parchment md:text-base">
            The Prince <span className="text-gold">&amp;</span> The Plunder
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`relative font-body text-sm transition-colors ${
                active === s.id ? 'text-gold' : 'text-parchment-dim hover:text-parchment'
              }`}
            >
              {s.label}
              <span
                className={`absolute -bottom-1.5 left-0 h-px bg-gold transition-all duration-300 ${
                  active === s.id ? 'w-full' : 'w-0'
                }`}
              />
            </a>
          ))}
          <Link
            href="/review"
            className="rounded-full border border-gold/70 bg-gold/10 px-4 py-1.5 font-body text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-navy"
          >
            Open the map
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
          className="text-parchment md:hidden"
        >
          <span className="text-2xl leading-none">{open ? '×' : '≡'}</span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-navy-border bg-navy/95 px-5 py-3 backdrop-blur-md md:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
              className={`block py-2 font-body text-sm ${
                active === s.id ? 'text-gold' : 'text-parchment'
              }`}
            >
              {s.label}
            </a>
          ))}
          <Link
            href="/review"
            onClick={() => setOpen(false)}
            className="mt-2 inline-block rounded-full border border-gold/70 bg-gold/10 px-4 py-1.5 font-body text-sm font-medium text-gold"
          >
            Open the map
          </Link>
        </div>
      )}
    </header>
  );
}
