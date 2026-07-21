import { describe, expect, it } from 'vitest';

import { getDueStatus } from './due-date-status.js';

describe('getDueStatus', () => {
  it('returns null when there is no due date', () => {
    expect(getDueStatus(null)).toBeNull();
    expect(getDueStatus(undefined)).toBeNull();
  });

  it('returns overdue for a date in the past', () => {
    expect(getDueStatus(new Date(Date.now() - 60_000))).toBe('overdue');
  });

  it('returns due-soon for a date within the next 24h', () => {
    expect(getDueStatus(new Date(Date.now() + 60 * 60 * 1000))).toBe('due-soon');
  });

  it('returns on-track for a date further than 24h out', () => {
    expect(getDueStatus(new Date(Date.now() + 48 * 60 * 60 * 1000))).toBe('on-track');
  });
});
