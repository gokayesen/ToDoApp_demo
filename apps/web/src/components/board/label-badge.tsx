import type { Label } from '@todoapp/shared';

import { LABEL_COLOR_HEX, LABEL_COLOR_TEXT } from '@/lib/label-colors';

// UX §4.2: "label chips (color swatches, no text by default — text on
// hover/expand)" — the board face (card-item.tsx) uses LabelDot, Card Detail
// and the label picker (an already-"expanded" context) use LabelChip.
export function LabelDot({ label }: { label: Label }) {
  return (
    <span
      className="h-2.5 w-6 shrink-0 rounded-full"
      style={{ backgroundColor: LABEL_COLOR_HEX[label.color] }}
      title={label.name}
    />
  );
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-md px-2 text-xs font-medium"
      style={{
        backgroundColor: LABEL_COLOR_HEX[label.color],
        color: LABEL_COLOR_TEXT[label.color] === 'white' ? '#ffffff' : '#0b0b0b',
      }}
    >
      {label.name}
    </span>
  );
}
