'use client';

import type { List } from '@todoapp/shared';
import { KeyboardSensor, PointerSensor } from '@dnd-kit/dom';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { moveList } from '@/lib/board-api';
import { AddListForm } from './add-list-form';
import { ListColumn } from './list-column';

const sensors = [
  PointerSensor.configure({
    activatorElements: (source) => [source.element, source.handle],
  }),
  KeyboardSensor,
];

// UX §5: lists reorder via drag on their header (keyboard alternative via
// dnd-kit's KeyboardSensor — Space/Enter to pick up, arrow keys to move, Esc
// to cancel). Optimistic reorder with rollback on failure, per UX §5 "every
// mutation updates immediately... on failure it visibly reverts."
export function BoardLists({ boardId, lists }: { boardId: string; lists: List[] }) {
  const [ordered, setOrdered] = useState(lists);
  const queryClient = useQueryClient();

  useEffect(() => {
    setOrdered(lists);
  }, [lists]);

  const mutation = useMutation({
    mutationFn: (input: { listId: string; afterListId: string | null; beforeListId: string | null }) =>
      moveList(input.listId, { afterListId: input.afterListId, beforeListId: input.beforeListId }),
    onError: () => {
      // Server rejected the move (e.g. a stale neighbor) — revert to the last
      // known-good server state rather than trust the optimistic order.
      setOrdered(lists);
      queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return;
    const movedId = event.operation.source?.id;
    if (movedId == null) return;

    const next = move(ordered, event);
    setOrdered(next);

    const movedIndex = next.findIndex((list) => list.id === movedId);
    if (movedIndex === -1) return;
    const afterListId = next[movedIndex - 1]?.id ?? null;
    const beforeListId = next[movedIndex + 1]?.id ?? null;
    mutation.mutate({ listId: String(movedId), afterListId, beforeListId });
  }

  return (
    <DragDropProvider sensors={sensors} onDragEnd={handleDragEnd}>
      {ordered.map((list, index) => (
        <ListColumn key={list.id} list={list} index={index} />
      ))}
      <AddListForm boardId={boardId} />
    </DragDropProvider>
  );
}
