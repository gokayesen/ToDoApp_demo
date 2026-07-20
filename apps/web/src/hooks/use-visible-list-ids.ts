'use client';

import { useEffect, useRef, type RefObject } from 'react';

// Story 5.7 (UX §6 "toast for board sections currently out of view"):
// tracks which List columns (marked `data-list-id`) currently intersect the
// viewport. A ref, not state — this is read at the moment a live update
// decides whether it needs a toast, not something that should itself
// trigger a re-render on every scroll. Default root (the browser viewport)
// is enough: intersection accounts for clipping by the board's own
// `overflow-x-auto` scroll ancestor too, not just the immediate parent.
export function useVisibleListIds(containerRef: RefObject<HTMLElement | null>): RefObject<Set<string>> {
  const visibleRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.listId;
          if (!id) return;
          if (entry.isIntersecting) visibleRef.current.add(id);
          else visibleRef.current.delete(id);
        });
      },
      { threshold: 0.1 },
    );

    container.querySelectorAll<HTMLElement>('[data-list-id]').forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  });

  return visibleRef;
}
