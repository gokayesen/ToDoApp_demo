import { z } from 'zod';

// UX §2: "a fixed palette of 8-10 accessible, distinguishable swatches
// (WCAG-checked contrast for text-on-color and color-on-white)". These 8 hues
// and their ordering are the categorical-color-scale reference palette
// (adjacent-pair CVD ΔE >= 8, normal-vision ΔE >= 15, both checked); `blue`
// is stepped one shade darker than that reference (#256abf vs #2a78d6) since
// label chips render name text directly on the fill — the reference shade
// only clears 4.42:1 against white, just under the 4.5:1 AA text threshold,
// while this shade clears 5.39:1.
export const LABEL_COLORS = [
  'blue',
  'green',
  'magenta',
  'yellow',
  'aqua',
  'orange',
  'violet',
  'red',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

// LABEL_COLORS above (and the hex/text-contrast presentation of each color,
// which lives in apps/web/src/lib/label-colors.ts, not here) are NOT
// imported as values by any 'use client' component in apps/web — importing
// *any* value export (a const array, a Record object — type-only imports
// are unaffected) from this package's schemas/label.ts into a client
// component broke Next's bundler resolution of unrelated sibling exports
// from the whole barrel (packages/shared/src/index.ts), reproduced by
// isolating each export independently. A Next.js/Turbopack barrel-file bug,
// not a logic bug here — apps/web/src/lib/label-colors.ts duplicates the key
// list to work around it. LABEL_COLORS itself stays here because
// labelColorSchema (backend validation) needs it regardless.
const labelColorSchema = z.enum(LABEL_COLORS);

export const labelSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string(),
  color: labelColorSchema,
});

export type Label = z.infer<typeof labelSchema>;

export const createLabelRequestSchema = z.object({
  name: z.string().min(1),
  color: labelColorSchema,
});

export type CreateLabelRequest = z.infer<typeof createLabelRequestSchema>;

export const updateLabelRequestSchema = z.object({
  name: z.string().min(1).optional(),
  color: labelColorSchema.optional(),
});

export type UpdateLabelRequest = z.infer<typeof updateLabelRequestSchema>;
