'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';

const DURATION_MS = 220;

// UX §6 "when another user moves a card, it animates to its new position
// (not a hard re-render)". Classic FLIP, generic over anything under
// `containerRef` carrying a stable `data-flip-id` — used for both List
// columns and Cards from a single call in board-lists.tsx, since a Card
// crossing Lists needs its start position measured across the *whole*
// board, not just within the List column it lands in (the old and new DOM
// nodes belong to two different parents; React mounts a fresh node in the
// destination rather than moving the existing one).
//
// `enabled` gates the animation, not the measurement — measurement keeps
// running every render so the next real change always has a fresh
// baseline, but this client's own active drag is skipped from animating
// (dnd-kit already gives that its own live per-frame transform; layering
// FLIP on top of it fights that instead of complementing it). Remote
// updates and this client's own drops happen while `enabled` is true.
export function useFlipAnimation(
  containerRef: RefObject<HTMLElement | null>,
  flipKey: string,
  enabled: boolean,
): void {
  const prevRects = useRef(new Map<string, DOMRect>());
  const prevKey = useRef(flipKey);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll<HTMLElement>('[data-flip-id]');

    if (enabled && prevKey.current !== flipKey) {
      elements.forEach((element) => {
        const id = element.dataset.flipId;
        const prev = id ? prevRects.current.get(id) : undefined;
        if (!prev) return;

        const next = element.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

        element.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration: DURATION_MS, easing: 'ease-out' },
        );
      });
    }

    const rects = new Map<string, DOMRect>();
    elements.forEach((element) => {
      const id = element.dataset.flipId;
      if (id) rects.set(id, element.getBoundingClientRect());
    });
    prevRects.current = rects;
    prevKey.current = flipKey;
  });
}
