'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { groupSearchResultsByBoard } from '@/lib/group-search-results-by-board';
import { searchCards } from '@/lib/search-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

// FR37/UX §3: top-bar entry point for cross-board keyword search. A centered
// modal (base-ui Dialog Root/Portal/Backdrop/Popup used directly, same as
// NotificationCenter's own right-edge slide-over) rather than the ui/dialog.tsx
// wrapper, since this needs its own "input pinned at top, scrollable results
// below" layout instead of a generic content area.
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchCards(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const groups = groupSearchResultsByBoard(results ?? []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  }

  // Click-through only reaches the Board, not the Card directly — same
  // deep-link gap NotificationCenter's own click-through already documents
  // (board-lists.tsx has no open-card-by-id mechanism to attach to yet).
  function handleSelectCard(boardId: string) {
    handleOpenChange(false);
    router.push(`/boards/${boardId}`);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger
        render={
          <Button variant="ghost" size="icon-sm" title="Search">
            <SearchIcon />
            <span className="sr-only">Search</span>
          </Button>
        }
      />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="global-search-content"
          className="fixed top-24 left-1/2 z-50 flex max-h-[70vh] w-full max-w-lg -translate-x-1/2 flex-col gap-3 overflow-hidden rounded-xl bg-popover p-3 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">Search cards</DialogPrimitive.Title>
          <Input
            autoFocus
            placeholder="Search cards by title or description…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="flex-1 overflow-y-auto">
            {debouncedQuery.length === 0 ? (
              <p className="mt-6 text-center text-muted-foreground">Start typing to search.</p>
            ) : isFetching && !results ? (
              <p className="mt-6 text-center text-muted-foreground">Searching…</p>
            ) : groups.length === 0 ? (
              <p className="mt-6 text-center text-muted-foreground">No matching cards.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <div key={group.boardId} className="flex flex-col gap-0.5">
                    <p className="px-1 text-xs font-medium text-muted-foreground">
                      {group.workspaceName} / {group.boardName}
                    </p>
                    {group.cards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => handleSelectCard(card.boardId)}
                        className="flex flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-muted"
                      >
                        <span className="text-foreground">{card.title}</span>
                        <span className="text-xs text-muted-foreground">{card.listName}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
