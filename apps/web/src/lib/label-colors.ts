import type { LabelColor } from '@todoapp/shared';

// UX §2: "a fixed palette of 8-10 accessible, distinguishable swatches
// (WCAG-checked contrast for text-on-color and color-on-white)". These 8
// hues and their ordering are the categorical-color-scale reference palette
// (adjacent-pair CVD ΔE >= 8, normal-vision ΔE >= 15, both checked); `blue`
// is stepped one shade darker than that reference (#256abf vs #2a78d6) since
// label chips render name text directly on the fill — the reference shade
// only clears 4.42:1 against white, just under the 4.5:1 AA text threshold,
// while this shade clears 5.39:1.
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
  blue: '#256abf',
  green: '#008300',
  magenta: '#e87ba4',
  yellow: '#eda100',
  aqua: '#1baf7a',
  orange: '#eb6834',
  violet: '#4a3aa7',
  red: '#e34948',
};

// Per-swatch text color that clears WCAG AA (4.5:1) against LABEL_COLOR_HEX,
// computed from each hex's relative luminance rather than eyeballed.
export const LABEL_COLOR_TEXT: Record<LabelColor, 'white' | 'black'> = {
  blue: 'white',
  green: 'white',
  magenta: 'black',
  yellow: 'black',
  aqua: 'black',
  orange: 'black',
  violet: 'white',
  red: 'black',
};
