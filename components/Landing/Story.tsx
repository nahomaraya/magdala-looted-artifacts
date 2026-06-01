import Figure from './Figure';
import Reveal from './Reveal';
import { story } from './content';

export default function Story() {
  return (
    <section id="story" className="scroll-mt-20 border-t border-navy-border/60 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-start md:px-8">
        <Reveal className="md:sticky md:top-28">
          <Figure alt={story.imageAlt} src={story.image} ratio="3 / 4" />
        </Reveal>

        <div>
          <Reveal>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-gold">Who he was</p>
            <h2 className="mt-3 font-heading text-3xl text-parchment md:text-4xl">
              {story.heading}
            </h2>
            <p className="mt-5 border-l-2 border-gold/60 pl-4 font-heading text-lg italic leading-relaxed text-parchment-dim">
              {story.intro}
            </p>
          </Reveal>

          <div className="mt-7 space-y-5">
            {story.paragraphs.map((p, i) => (
              <Reveal key={i} delay={i * 60}>
                <p className="font-body text-base leading-relaxed text-parchment/90">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
