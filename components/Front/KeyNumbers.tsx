import type { KeyNumbers as Numbers } from '@/lib/frontPageStats';

/** The four headline counts under the hero. */
export default function KeyNumbers({ numbers }: { numbers: Numbers }) {
  const figures: [string, number][] = [
    ['Artifacts', numbers.artifacts],
    ['Holders', numbers.holders],
    ['Returned', numbers.returned],
    ['Countries', numbers.countries],
  ];
  return (
    <section aria-labelledby="key-numbers-title">
      <h2 id="key-numbers-title" className="sr-only">
        Key numbers
      </h2>
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {figures.map(([label, value]) => (
          // Label after the figure visually; dt stays first for assistive tech.
          <div key={label} className="flex flex-col-reverse items-center gap-2 text-center">
            <dt className="text-base text-parchment-dim">{label}</dt>
            <dd className="font-heading text-5xl leading-none text-gold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
