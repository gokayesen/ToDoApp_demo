'use client';

import type { Card, Label, LabelColor } from '@todoapp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import {
  attachCardLabel,
  createLabel,
  deleteLabel,
  detachCardLabel,
  listLabels,
  updateLabel,
} from '@/lib/board-api';
import { LABEL_COLOR_HEX, LABEL_COLOR_TEXT, LABEL_COLORS } from '@/lib/label-colors';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

// Story 4.3 (FR24): per-board Label CRUD + attach/remove on a Card, both in
// one popover (matches Trello's own placement) — a checkable row per Board
// Label toggles it on this Card; the form below creates a new Label or, when
// `editingId` is set, edits the one that row's pencil icon was clicked on.
export function LabelPicker({ card, boardId, listId }: { card: Card; boardId: string; listId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>(LABEL_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: labels } = useQuery({
    queryKey: ['labels', boardId],
    queryFn: () => listLabels(boardId),
  });

  function invalidateLabels() {
    queryClient.invalidateQueries({ queryKey: ['labels', boardId] });
  }

  function invalidateCard() {
    queryClient.invalidateQueries({ queryKey: ['cards', listId] });
  }

  const attachMutation = useMutation({
    mutationFn: (labelId: string) => attachCardLabel(card.id, { labelId }),
    onSuccess: invalidateCard,
  });
  const detachMutation = useMutation({
    mutationFn: (labelId: string) => detachCardLabel(card.id, labelId),
    onSuccess: invalidateCard,
  });
  const createMutation = useMutation({
    mutationFn: () => createLabel(boardId, { name: name.trim(), color }),
    onSuccess: () => {
      resetForm();
      invalidateLabels();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (id: string) => updateLabel(id, { name: name.trim(), color }),
    onSuccess: () => {
      resetForm();
      invalidateLabels();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLabel(id),
    onSuccess: () => {
      invalidateLabels();
      invalidateCard();
    },
  });

  function resetForm() {
    setEditingId(null);
    setName('');
    setColor(LABEL_COLORS[0]);
  }

  function startEditing(label: Label) {
    setEditingId(label.id);
    setName(label.name);
    setColor(label.color);
  }

  function toggleAttached(label: Label) {
    const attached = card.labels.some((l) => l.id === label.id);
    if (attached) detachMutation.mutate(label.id);
    else attachMutation.mutate(label.id);
  }

  function submitForm() {
    if (!name.trim()) return;
    if (editingId) updateMutation.mutate(editingId);
    else createMutation.mutate();
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) resetForm(); }}>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <PlusIcon /> Labels
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        {labels?.length === 0 && (
          <p className="px-1.5 py-1 text-xs text-muted-foreground">No labels on this board yet.</p>
        )}
        {labels?.map((label) => {
          const attached = card.labels.some((l) => l.id === label.id);
          return (
            <div
              key={label.id}
              className="group/label-row flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent"
            >
              <button
                type="button"
                onClick={() => toggleAttached(label)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none"
              >
                <span
                  className="h-5 w-8 shrink-0 rounded"
                  style={{ backgroundColor: LABEL_COLOR_HEX[label.color] }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{label.name}</span>
                {attached && <CheckIcon className="size-4 shrink-0" />}
              </button>
              <button
                type="button"
                aria-label={`Edit ${label.name}`}
                onClick={() => startEditing(label)}
                className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/label-row:opacity-100"
              >
                <PencilIcon className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${label.name}`}
                onClick={() => deleteMutation.mutate(label.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/label-row:opacity-100"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          );
        })}

        <DropdownMenuSeparator />

        {/* Stops keystrokes (typing the name, arrow keys) from reaching
            the Menu's own roving-focus/typeahead keydown handling, which
            would otherwise steal them instead of the Input. */}
        <div className="flex flex-col gap-1.5 px-1.5 py-1" onKeyDown={(e) => e.stopPropagation()}>
          <span className="text-xs font-medium text-muted-foreground">
            {editingId ? 'Edit label' : 'Create a label'}
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitForm();
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className="flex size-6 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: LABEL_COLOR_HEX[c],
                  boxShadow: color === c ? '0 0 0 2px var(--color-ring)' : 'none',
                }}
              >
                {color === c && (
                  <CheckIcon
                    className="size-3.5"
                    color={LABEL_COLOR_TEXT[c] === 'white' ? '#ffffff' : '#0b0b0b'}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={submitForm}
              disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Save' : 'Create label'}
            </Button>
            {editingId && (
              <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
