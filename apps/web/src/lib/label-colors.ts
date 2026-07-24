import type { LabelColor } from '@todoapp/shared';

// UX §2: "a fixed palette of 8-10 accessible, distinguishable swatches
// (WCAG-checked contrast for text-on-color and color-on-white)". These 8
// keys map onto the Sprint 14 design handoff's 10-swatch label palette
// (design-references design_handoff_board_view/design-system/tokens/colors.css)
// — matched by hue, not by the handoff's own "always white text" chips,
// since recomputing contrast here (same relative-luminance method as
// before) found most of that palette's swatches actually fail WCAG AA
// (4.5:1) against white text: blue 3.95:1, green 2.28:1, pink 3.53:1,
// amber 2.15:1, teal 2.49:1, orange 2.80:1, indigo 4.46:1, red 3.76:1 — all
// pass comfortably against black instead, so every swatch below uses black.
//
// Duplicates packages/shared's LABEL_COLORS key order rather than importing
// it — see the comment on LABEL_COLORS there for why: any *value* (not type)
// export from that package's schemas/label.ts, imported into a 'use client'
// component, broke Next's bundler resolution of unrelated sibling exports
// from the same barrel file (reproduced by isolating each export
// independently; a Next.js/Turbopack barrel-file bug, not a logic bug here).
export const LABEL_COLORS: readonly LabelColor[] = [
  'blue',
  'green',
  'magenta',
  'yellow',
  'aqua',
  'orange',
  'violet',
  'red',
];

export const LABEL_COLOR_HEX: Record<LabelColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  magenta: '#ec4899',
  yellow: '#f59e0b',
  aqua: '#14b8a6',
  orange: '#f97316',
  violet: '#6366f1',
  red: '#ef4444',
};

// Per-swatch text color that clears WCAG AA (4.5:1) against LABEL_COLOR_HEX,
// computed from each hex's relative luminance rather than eyeballed.
export const LABEL_COLOR_TEXT: Record<LabelColor, 'white' | 'black'> = {
  blue: 'black',
  green: 'black',
  magenta: 'black',
  yellow: 'black',
  aqua: 'black',
  orange: 'black',
  violet: 'black',
  red: 'black',
};
