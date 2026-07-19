'use client';

import { useEffect, useState } from 'react';

import { getRecentBoards, type RecentBoard } from '@/lib/recent-boards';

// Hidden entirely until Board View (Epic 3) starts calling recordBoardVisit —
// there's nothing to show before that exists.
export function RecentBoardsRow() {
  const [recent, setRecent] = useState<RecentBoard[]>([]);

  useEffect(() => {
    setRecent(getRecentBoards());
  }, []);

  if (recent.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {recent.map((board) => (
          <div
            key={board.id}
            className="flex h-24 flex-col justify-end rounded-lg bg-muted p-3 ring-1 ring-foreground/10"
          >
            <span className="truncate text-sm font-medium text-foreground">{board.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
