/**
 * Shown where an artifact has no image (Wikidata P18) yet, with a way to add one.
 * `className` sets the box height (default `h-64`, as in the detail pane).
 */
export default function ImagePlaceholder({ qid, className = 'h-64' }: { qid: string; className?: string }) {
  return (
    <div className={`flex ${className} flex-col items-center justify-center gap-2 rounded border border-navy-border bg-navy px-4 text-center`}>
      <p className="text-base text-parchment-dim">No image on Wikidata yet.</p>
      <a
        href={`https://www.wikidata.org/wiki/${qid}#P18`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base text-gold hover:underline"
      >
        Add one on Wikidata ↗
      </a>
    </div>
  );
}
