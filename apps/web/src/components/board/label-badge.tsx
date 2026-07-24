import type { Label } from '@todoapp/shared';

import { LABEL_COLOR_HEX, LABEL_COLOR_TEXT } from '@/lib/label-colors';

// UX §4.2: "label chips (color swatches, no text by default — text on
// hover/expand)" — the board face (card-item.tsx) uses LabelDot, Card Detail
// and the label picker (an already-"expanded" context) use LabelChip. Sizing
// matches the Sprint 14 design handoff's LabelChip (40×16 dot / height-20
// text chip, radius-xs, accessible name via title+role="img").
export function LabelDot({ label }: { label: Label }) {
  return (
    <span
      role="img"
      aria-label={label.name}
      className="h-4 w-10 shrink-0 rounded-xs"
      style={{ backgroundColor: LABEL_COLOR_HEX[label.color] }}
      title={label.name}
    />
  );
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <span
      className="inline-flex h-5 items-center rounded-xs px-2 text-xs font-semibold"
      style={{
        backgroundColor: LABEL_COLOR_HEX[label.color],
        color: LABEL_COLOR_TEXT[label.color] === 'white' ? '#ffffff' : '#0b0b0b',
      }}
    >
      {label.name}
    </span>
  );
}
