'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';
import { getBoard, listLists } from '@/lib/board-api';
import { recordBoardVisit } from '@/lib/recent-boards';
import { AppShell } from '@/components/shell/app-shell';
import { AddListForm } from '@/components/board/add-list-form';
import { ListColumn } from '@/components/board/list-column';

const FALLBACK_BACKGROUND = 'var(--muted)';

function isImageBackground(value: string) {
  return /^https?:\/\//.test(value);
}

// Story 3.3: Board View UI — horizontal-scrolling row of Lists + "+ Add list"
// (UX §4.2). Card rendering, quick-add, and drag-and-drop are later stories
// in this epic (3.4-3.6, 3.9).
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
        <header className="px-6 py-4">
          <h1 className="truncate text-lg font-semibold text-foreground drop-shadow-sm">
            {boardLoading ? 'Loading…' : board?.name}
          </h1>
        </header>
        <div className="flex flex-1 items-start gap-3 overflow-x-auto px-6 pb-6">
          {listsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            lists?.map((list) => <ListColumn key={list.id} list={list} />)
          )}
          <AddListForm boardId={boardId} />
        </div>
      </div>
    </AppShell>
  );
}
