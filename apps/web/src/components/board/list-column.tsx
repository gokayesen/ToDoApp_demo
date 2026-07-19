import type { List } from '@todoapp/shared';

// UX §4.2: a vertical column with a name header. Card rendering ("+ Add card"
// at bottom, card face preview) arrives with Stories 3.4/3.9 — no "list cards"
// endpoint exists yet to back it.
export function ListColumn({ list }: { list: List }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted p-2">
      <h3 className="truncate px-1 py-1 text-sm font-medium text-foreground">{list.name}</h3>
    </div>
  );
}
