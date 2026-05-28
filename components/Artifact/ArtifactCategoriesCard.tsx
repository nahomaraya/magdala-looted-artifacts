'use client';

type Category = { name: string; qid?: string | null };

export default function ArtifactCategoriesCard({ categories }: { categories: Category[] }) {
  return (
    <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim sm:col-span-2">
      <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Categories</span>
      <span className="mt-1 block text-parchment">
        {categories.length > 0
          ? categories.map((category) => (category.qid ? `${category.name} (${category.qid})` : category.name)).join(', ')
          : 'None'}
      </span>
    </p>
  );
}
