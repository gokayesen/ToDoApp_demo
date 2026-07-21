import { describe, expect, it } from 'vitest';

import { computePosition } from './position.service.js';

describe('computePosition', () => {
  it('returns the base gap when inserting into an empty list', () => {
    expect(computePosition(null, null)).toBe(1024);
  });

  it('halves the next position when inserting at the start', () => {
    expect(computePosition(null, 1024)).toBe(512);
  });

  it('adds the gap past the previous position when inserting at the end', () => {
    expect(computePosition(1024, null)).toBe(2048);
  });

  it('takes the midpoint when inserting between two neighbors', () => {
    expect(computePosition(1024, 2048)).toBe(1536);
  });

  it('keeps narrowing between tightly packed neighbors instead of colliding', () => {
    const a = computePosition(1024, 1024.5);
    expect(a).toBeGreaterThan(1024);
    expect(a).toBeLessThan(1024.5);
  });
});
