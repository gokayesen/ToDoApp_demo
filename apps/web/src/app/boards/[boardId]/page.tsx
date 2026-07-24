'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { getBoard, listLists } from '@/lib/board-api';
import { EMPTY_CARD_FILTERS } from '@/lib/card-filters';
import { recordBoardVisit } from '@/lib/recent-boards';
import { useBoardRoom } from '@/hooks/use-board-room';
import { usePresence } from '@/hooks/use-presence';
import { AppShell } from '@/components/shell/app-shell';
import { BoardLists } from '@/components/board/board-lists';
import { FilterPopover } from '@/components/board/filter-popover';
import { PresenceAvatars } from '@/components/board/presence-avatars';

const FALLBACK_BACKGROUND = 'var(--muted)';

function isImageBackground(value: string) {
  return /^https?:\/\//.test(value);
}

// Story 3.3: Board View UI — horizontal-scrolling row of Lists + "+ Add list"
// (UX §4.2). Story 3.4 added quick-add cards; Story 3.5 added List
// drag-and-drop (BoardLists). Card drag-and-drop and face preview arrive with
// Stories 3.6/3.9.
export default function BoardViewPage() {
  const router = useRouter();
  const { boardId } = useParams<{ boardId: string }>();
  const { user, loading } = useAuth();
  const [filters, setFilters] = useState(EMPTY_CARD_FILTERS);

  const {
    data: board,
    isLoading: boardLoading,
    error: boardError,
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId),
    enabled: !!user,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && (error.status === 403 || error.status === 404)) && failureCount < 3,
  });

  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ['lists', boardId],
    queryFn: () => listLists(boardId),
    enabled: !!user && !boardError,
  });

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Clears a filter carried over from a previous Board (label/assignee ids
  // there wouldn't even resolve to anything meaningful on this one) whenever
  // the route's own boardId changes — Next.js reuses this component instance
  // across sibling dynamic-route navigations rather than remounting it.
  useEffect(() => {
    setFilters(EMPTY_CARD_FILTERS);
  }, [boardId]);

  useEffect(() => {
    if (board && user) {
      recordBoardVisit(user.id, { id: board.id, name: board.name, workspaceId: board.workspaceId });
    }
  }, [board, user]);

  // Story 5.1: join the board's realtime room while this page is open.
  // Story 5.2 adds the live presence avatar stack below; BoardLists (Story
  // 5.4) merges Story 5.3's card/list broadcasts into the query cache.
  useBoardRoom(boardId);
  const presence = usePresence(boardId);

  if (loading || !user) return null;

  if (boardError instanceof ApiError && (boardError.status === 403 || boardError.status === 404)) {
    return (
      <AppShell user={user}>
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Board not found</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            This board doesn&apos;t exist, or you don&apos;t have access to it. If you think this is a
            mistake, ask a board Admin to invite you.
          </p>
        </div>
      </AppShell>
    );
  }

  const background = board?.background;
  const backgroundStyle = background
    ? isImageBackground(background)
      ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background }
    : { backgroundColor: FALLBACK_BACKGROUND };

  return (
    <AppShell user={user}>
      <div className="flex h-full flex-col" style={backgroundStyle}>
        <header
          className="flex h-14 shrink-0 items-center justify-between gap-4 px-6 backdrop-blur-md"
          style={{ background: 'var(--scrim-surface)' }}
        >
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
            {boardLoading ? 'Loading…' : board?.name}
          </h1>
          <div className="flex items-center gap-3">
            {presence.length > 0 && (
              <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <span className="size-2 rounded-full bg-success-fg" />
                {presence.length} viewing
              </span>
            )}
            <PresenceAvatars members={presence} />
            <div className="h-5 w-px bg-border" />
            <FilterPopover boardId={boardId} filters={filters} onChange={setFilters} />
          </div>
        </header>
        <div className="flex flex-1 items-start gap-3 overflow-x-auto px-6 pb-6">
          {listsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <BoardLists
              boardId={boardId}
              boardName={board?.name ?? ''}
              lists={lists ?? []}
              currentUserId={user.id}
              filters={filters}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
