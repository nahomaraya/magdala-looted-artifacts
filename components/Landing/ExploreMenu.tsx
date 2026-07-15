import Link from 'next/link';
import Reveal from './Reveal';
import { menu, type MenuItem } from './content';

/** Pre-declared so Tailwind keeps these classes; no dynamic concatenation. */
const ACCENT: Record<
  MenuItem['accent'],
  { dot: string; hoverBorder: string; text: string }
> = {
  gold: { dot: 'bg-gold', hoverBorder: 'hover:border-gold', text: 'text-gold' },
  looting: { dot: 'bg-looting', hoverBorder: 'hover:border-looting', text: 'text-looting' },
  location: { dot: 'bg-location', hoverBorder: 'hover:border-location', text: 'text-location' },
  parchment: {
    dot: 'bg-parchment-dim',
    hoverBorder: 'hover:border-parchment',
    text: 'text-parchment',
  },
};

export default function ExploreMenu() {
  return (
    <section id="explore" className="scroll-mt-20 border-t border-navy-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold">Explore</p>
          <h2 className="mt-3 font-heading text-3xl text-parchment md:text-4xl">
            Four Ways into the Story
          </h2>
          <p className="mt-4 font-body text-base leading-relaxed text-parchment-dim">
            The artifacts, the manuscripts, the journey and the stage — choose a path through the
            history of Magdala and its prince.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {menu.map((item, i) => {
            const a = ACCENT[item.accent];
            return (
              <Reveal key={item.href} delay={i * 70}>
                <Link
                  href={item.href}
                  className={`group flex h-full flex-col rounded-xl border border-navy-border bg-navy-light/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-navy-light ${a.hoverBorder}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                    <h3 className="font-heading text-xl text-parchment">{item.title}</h3>
                    {item.comingSoon && (
                      <span className="ml-auto rounded-full border border-navy-border px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-parchment-dim">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-4 font-body text-sm leading-relaxed text-parchment/80">
                    {item.blurb}
                  </p>
                  <span
                    className={`mt-6 inline-flex items-center gap-2 font-body text-sm font-medium ${a.text}`}
                  >
                    {item.cta}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
