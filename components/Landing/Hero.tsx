import Figure from './Figure';
import { hero } from './content';

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pt-24 pb-16"
    >
      {/* Background portrait */}
      <div className="absolute inset-0">
        {hero.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.image} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_70%_30%,rgba(218,165,32,0.12),transparent_55%)]" />
        )}
        {/* legibility scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/60" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 md:grid-cols-[1.2fr_1fr] md:px-8">
        <div className="max-w-xl">
          <p className="font-body text-xs uppercase tracking-[0.35em] text-gold">{hero.kicker}</p>
          <h1 className="mt-4 font-heading text-5xl leading-[1.05] text-parchment md:text-7xl">
            {hero.title}
          </h1>
          <p className="mt-3 font-body text-lg tracking-[0.2em] text-parchment-dim">
            {hero.lifespan}
          </p>
          <p className="mt-6 max-w-prose font-body text-base leading-relaxed text-parchment/90 md:text-lg">
            {hero.lead}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#story"
              className="rounded-full bg-gold px-6 py-2.5 font-body text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5 hover:bg-gold-dim"
            >
              Read his story
            </a>
            <a
              href="#timeline"
              className="rounded-full border border-parchment-dim/40 px-6 py-2.5 font-body text-sm text-parchment transition-colors hover:border-gold hover:text-gold"
            >
              The Battle of Magdala
            </a>
          </div>
        </div>

        {/* Foreground framed portrait */}
        <div className="hidden md:block">
          <div className="relative">
            <div className="absolute -inset-3 rounded-xl border border-gold/25" />
            <Figure alt={hero.imageAlt} src={hero.image} ratio="3 / 4" />
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <a
        href="#story"
        aria-label="Scroll down"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-parchment-dim transition-colors hover:text-gold"
      >
        <span className="block animate-bounce text-2xl leading-none">↓</span>
      </a>
    </section>
  );
}
