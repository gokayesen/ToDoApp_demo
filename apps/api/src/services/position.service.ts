// Fractional-index position engine (Architecture §4 "Ordering strategy"),
// shared by both List and Card ordering. Deliberately data-agnostic: it knows
// nothing about Prisma or which table a row lives in — callers resolve the
// two neighboring rows' current positions in their own scope (per Board for
// Lists, per List for Cards) and pass them in here. The client never submits
// a raw position; every insert/move computes it server-side, in the same
// transaction as the write, from the neighbors' current positions at write
// time — this is what closes the concurrency gap where two clients could
// otherwise compute overlapping positions from stale neighbor data.
//
// The List/Card reorder endpoints that call this with a live afterId/beforeId
// pair (rather than just appending) land in Stories 3.5/3.6.

const POSITION_GAP = 1024;

export function computePosition(prevPosition: number | null, nextPosition: number | null): number {
  if (prevPosition === null && nextPosition === null) return POSITION_GAP;
  if (prevPosition === null) return nextPosition! / 2;
  if (nextPosition === null) return prevPosition + POSITION_GAP;
  return (prevPosition + nextPosition) / 2;
}
