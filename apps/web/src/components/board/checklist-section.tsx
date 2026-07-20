'use client';

import type { Card, Checklist, ChecklistItem } from '@todoapp/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import {
  createChecklist,
  createChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  moveChecklistItem,
  updateChecklistItem,
} from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Story 4.6 (FR27): one or more Checklists per Card, each with a progress bar
// + checkable items and inline add-item, per UX §4.3 section 4. Reordering
// items uses simple up/down controls (fully keyboard-operable) rather than
// drag-and-drop — UX §5's drag-and-drop pattern is explicitly scoped to
// Lists/Cards (FR15/FR19), not checklist items, so a third independent
// dnd-kit sortable context here would be scope beyond what FR27 asks for.
export function ChecklistSection({ card, listId }: { card: Card; listId: string }) {
  const queryClient = useQueryClient();
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState('');

  function patchCard(updated: Card) {
    queryClient.setQueryData(['cards', listId], (old: Card[] | undefined) =>
      old?.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  const createChecklistMutation = useMutation({
    mutationFn: (title: string) => createChecklist(card.id, { title }),
    onSuccess: (updated) => {
      patchCard(updated);
      setChecklistTitle('');
      setAddingChecklist(false);
    },
  });

  // UX §5 explicitly names "check a checklist item" as an optimistic-update
  // example: the checkbox AND the progress bar/count must move the instant
  // it's clicked, not after the PATCH round-trip resolves. Writing straight
  // into the ['cards', listId] cache (with a snapshot to roll back to on
  // failure) is what makes both update together, rather than each item row
  // tracking its own local optimistic state independently of the progress
  // bar that reads from the same card.
  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) =>
      updateChecklistItem(itemId, { isChecked }),
    onMutate: async ({ itemId, isChecked }) => {
      await queryClient.cancelQueries({ queryKey: ['cards', listId] });
      const previous = queryClient.getQueryData<Card[]>(['cards', listId]);
      queryClient.setQueryData<Card[]>(['cards', listId], (old) =>
        old?.map((c) =>
          c.id !== card.id
            ? c
            : {
                ...c,
                checklists: c.checklists.map((checklist) => ({
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId ? { ...item, isChecked } : item,
                  ),
                })),
              },
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['cards', listId], context.previous);
    },
    onSuccess: patchCard,
  });

  function submitNewChecklist() {
    const value = checklistTitle.trim();
    if (!value) return;
    createChecklistMutation.mutate(value);
  }

  return (
    <div className="flex flex-col gap-3">
      {card.checklists.map((checklist) => (
        <ChecklistCard
          key={checklist.id}
          checklist={checklist}
          onUpdated={patchCard}
          onToggleItem={(itemId, isChecked) => toggleItemMutation.mutate({ itemId, isChecked })}
        />
      ))}

      {addingChecklist ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={checklistTitle}
            onChange={(e) => setChecklistTitle(e.target.value)}
            placeholder="Checklist title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewChecklist();
              else if (e.key === 'Escape') {
                setAddingChecklist(false);
                setChecklistTitle('');
              }
            }}
          />
          <Button type="button" size="sm" onClick={submitNewChecklist} disabled={!checklistTitle.trim()}>
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAddingChecklist(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setAddingChecklist(true)}
        >
          <PlusIcon /> Add checklist
        </Button>
      )}
    </div>
  );
}

function ChecklistCard({
  checklist,
  onUpdated,
  onToggleItem,
}: {
  checklist: Checklist;
  onUpdated: (card: Card) => void;
  onToggleItem: (itemId: string, isChecked: boolean) => void;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [itemText, setItemText] = useState('');

  const createItemMutation = useMutation({
    mutationFn: (text: string) => createChecklistItem(checklist.id, { text }),
    onSuccess: (updated) => {
      onUpdated(updated);
      setItemText('');
    },
  });
  const deleteChecklistMutation = useMutation({
    mutationFn: () => deleteChecklist(checklist.id),
    onSuccess: onUpdated,
  });

  const total = checklist.items.length;
  const checked = checklist.items.filter((item) => item.isChecked).length;
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

  function submitNewItem(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const value = itemText.trim();
    if (!value) return;
    // Clear synchronously so a fast second Enter doesn't append onto the
    // still-pending first item's text (same rationale as QuickAddCardForm).
    setItemText('');
    createItemMutation.mutate(value);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{checklist.title}</span>
        <button
          type="button"
          aria-label={`Delete checklist ${checklist.title}`}
          onClick={() => deleteChecklistMutation.mutate()}
          className="shrink-0 rounded p-0.5 text-muted-foreground outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {checked}/{total}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {checklist.items.map((item, index) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            checklist={checklist}
            index={index}
            itemCount={checklist.items.length}
            onUpdated={onUpdated}
            onToggle={onToggleItem}
          />
        ))}
      </div>

      {addingItem ? (
        <Input
          autoFocus
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
          placeholder="Add an item"
          onKeyDown={submitNewItem}
          onBlur={() => {
            if (!itemText) setAddingItem(false);
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit justify-start text-muted-foreground"
          onClick={() => setAddingItem(true)}
        >
          <PlusIcon /> Add an item
        </Button>
      )}
    </div>
  );
}

function ChecklistItemRow({
  item,
  checklist,
  index,
  itemCount,
  onUpdated,
  onToggle,
}: {
  item: ChecklistItem;
  checklist: Checklist;
  index: number;
  itemCount: number;
  onUpdated: (card: Card) => void;
  onToggle: (itemId: string, isChecked: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  const renameMutation = useMutation({
    mutationFn: (value: string) => updateChecklistItem(item.id, { text: value }),
    onSuccess: onUpdated,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteChecklistItem(item.id),
    onSuccess: onUpdated,
  });
  const moveMutation = useMutation({
    mutationFn: (input: { afterItemId: string | null; beforeItemId: string | null }) =>
      moveChecklistItem(item.id, input),
    onSuccess: onUpdated,
  });

  function saveRename() {
    setEditing(false);
    const value = text.trim();
    if (!value || value === item.text) {
      setText(item.text);
      return;
    }
    renameMutation.mutate(value);
  }

  function moveUp() {
    if (index === 0) return;
    const items = checklist.items;
    moveMutation.mutate({ afterItemId: items[index - 2]?.id ?? null, beforeItemId: items[index - 1]!.id });
  }

  function moveDown() {
    if (index === itemCount - 1) return;
    const items = checklist.items;
    moveMutation.mutate({ afterItemId: items[index + 1]!.id, beforeItemId: items[index + 2]?.id ?? null });
  }

  return (
    <div className="group flex items-center gap-1.5">
      <input
        type="checkbox"
        checked={item.isChecked}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
      {editing ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={saveRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRename();
            else if (e.key === 'Escape') {
              setText(item.text);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
            item.isChecked && 'text-muted-foreground line-through',
          )}
        >
          {item.text}
        </button>
      )}
      <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          aria-label="Move item up"
          disabled={index === 0}
          onClick={moveUp}
          className="rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUpIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Move item down"
          disabled={index === itemCount - 1}
          onClick={moveDown}
          className="rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDownIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete item ${item.text}`}
          onClick={() => deleteMutation.mutate()}
          className="rounded p-0.5 text-muted-foreground outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
