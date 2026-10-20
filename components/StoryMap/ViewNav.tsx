import Link from 'next/link';
import { VIEWS, VIEW_LABELS, type ViewId } from './views';

interface ViewProps {
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
}

/** Desktop sidebar: a fixed column with the site link and one button per View. */
export default function ViewNav({ activeView, onSelectView }: ViewProps) {
  return (
    <nav
      aria-label="Views"
      className="hidden md:flex fixed inset-y-0 left-0 z-20 w-52 flex-col border-r border-navy-border bg-navy-light"
    >
      <Link
        href="/"
        className="font-heading text-lg leading-tight text-parchment px-4 py-5 border-b border-navy-border hover:text-gold"
      >
        Looted from Maqdala
      </Link>
      <div className="flex flex-col py-2">
        {VIEWS.map((id) => {
          const active = id === activeView;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectView(id)}
              aria-current={active ? 'page' : undefined}
              className={`text-left px-4 py-2 text-sm border-l-2 transition-colors ${
                active
                  ? 'border-gold text-gold bg-navy/40'
                  : 'border-transparent text-parchment hover:bg-navy/40'
              }`}
            >
              {VIEW_LABELS[id]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Mobile View switcher: a row of buttons, used in the holder menu and above the Library. */
export function ViewTabs({ activeView, onSelectView }: ViewProps) {
  return (
    <div role="group" aria-label="Views" className="flex gap-2">
      {VIEWS.map((id) => {
        const active = id === activeView;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectView(id)}
            aria-pressed={active}
            className={`flex-1 rounded border px-3 py-2 text-sm ${
              active
                ? 'border-gold/60 bg-gold/15 text-gold'
                : 'border-navy-border/70 bg-navy/30 text-parchment'
            }`}
          >
            {VIEW_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
