import type { Card } from '@todoapp/shared';

// Title only for now — labels, due-date pill, assignee avatars, checklist
// progress, and comment/attachment counts arrive with Story 3.9 (FR23).
export function CardItem({ card }: { card: Card }) {
  return (
    <div className="rounded-md bg-background px-2.5 py-2 text-sm text-foreground shadow-sm ring-1 ring-foreground/10">
      {card.title}
    </div>
  );
}
