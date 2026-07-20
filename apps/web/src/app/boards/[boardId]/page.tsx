'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';
import { getBoard, listLists } from '@/lib/board-api';
import { recordBoardVisit } from '@/lib/recent-boards';
import { useBoardRoom } from '@/hooks/use-board-room';
import { usePresence } from '@/hooks/use-presence';
import { AppShell } from '@/components/shell/app-shell';
import { BoardLists } from '@/components/board/board-lists';
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

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId),
    enabled: !!user,
  });

  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ['lists', boardId],
    queryFn: () => listLists(boardId),
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (board) recordBoardVisit({ id: board.id, name: board.name, workspaceId: board.workspaceId });
  }, [board]);

  // Story 5.1: join the board's realtime room while this page is open.
  // Story 5.2 adds the live presence avatar stack below; BoardLists (Story
  // 5.4) merges Story 5.3's card/list broadcasts into the query cache.
  useBoardRoom(boardId);
  const presence = usePresence(boardId);

  if (loading || !user) return null;

  const background = board?.background;
  const backgroundStyle = background
    ? isImageBackground(background)
      ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background }
    : { backgroundColor: FALLBACK_BACKGROUND };

  return (
    <AppShell user={user}>
      <div className="flex h-full flex-col" style={backgroundStyle}>
        <header className="flex items-center justify-between gap-4 px-6 py-4">
          <h1 className="truncate text-lg font-semibold text-foreground drop-shadow-sm">
            {boardLoading ? 'Loading…' : board?.name}
          </h1>
          <PresenceAvatars members={presence} />
        </header>
        <div className="flex flex-1 items-start gap-3 overflow-x-auto px-6 pb-6">
          {listsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <BoardLists boardId={boardId} lists={lists ?? []} currentUserId={user.id} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
