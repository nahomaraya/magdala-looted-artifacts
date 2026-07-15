import Figure from './Figure';
import Reveal from './Reveal';
import { timeline } from './content';

export default function Timeline() {
  return (
    <section
      id="timeline"
      className="scroll-mt-20 border-t border-navy-border/60 bg-navy-light/30 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-gold">
            1855 — 1868 &amp; beyond
          </p>
          <h2 className="mt-3 font-heading text-3xl text-parchment md:text-4xl">
            The Battle of Magdala
          </h2>
          <p className="mt-4 font-body text-base leading-relaxed text-parchment-dim">
            How a single unanswered letter became one of the largest looting expeditions of the
            Victorian age — told in chronological order.
          </p>
        </Reveal>

        <ol className="relative mt-16">
          {/* spine */}
          <span
            aria-hidden
            className="absolute left-[27px] top-2 bottom-2 w-px bg-navy-border md:left-1/2 md:-translate-x-1/2"
          />

          {timeline.map((event, i) => {
            const flip = i % 2 === 1;
            return (
              <li key={event.index} className="relative mb-12 last:mb-0 md:mb-16">
                {/* node */}
                <span
                  aria-hidden
                  className="absolute left-[18px] top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-gold bg-navy md:left-1/2 md:-translate-x-1/2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                </span>

                <div
                  className={`grid gap-6 pl-14 md:grid-cols-2 md:items-center md:gap-12 md:pl-0 ${
                    flip ? 'md:[direction:rtl]' : ''
                  }`}
                >
                  {/* text */}
                  <Reveal className={`md:[direction:ltr] ${flip ? 'md:pl-12' : 'md:pr-12 md:text-right'}`}>
                    <span className="font-heading text-4xl text-navy-border md:text-5xl">
                      {event.index}
                    </span>
                    <p className="mt-1 font-body text-xs uppercase tracking-[0.2em] text-gold">
                      {event.date}
                    </p>
                    <h3 className="mt-1 font-heading text-2xl text-parchment">{event.title}</h3>
                    <p className="mt-3 font-body text-sm leading-relaxed text-parchment/85 md:text-base">
                      {event.body}
                    </p>
                  </Reveal>

                  {/* image */}
                  <Reveal delay={80} className={`md:[direction:ltr] ${flip ? 'md:pr-12' : 'md:pl-12'}`}>
                    <Figure alt={event.imageAlt} src={event.image} ratio="16 / 10" />
                  </Reveal>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
