'use client';

import type { Card, List } from '@todoapp/shared';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Markdown from 'react-markdown';

import { updateCard } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { getDueStatus } from '@/lib/due-date-status';
import { cn } from '@/lib/utils';
import { AssigneePicker } from './assignee-picker';
import { ChecklistSection } from './checklist-section';
import { LabelChip } from './label-badge';
import { LabelPicker } from './label-picker';

// FR25: dates are stored/returned as ISO strings over the wire (see
// card-item.tsx's same raw-string convention) — slicing the date part
// directly avoids a local-timezone round-trip shift that constructing a new
// Date and reading its local getMonth/getDate would introduce.
function toDateInputValue(value: string | Date | null | undefined): string {
  return value ? String(value).slice(0, 10) : '';
}

const DUE_STATUS_TEXT = {
  overdue: 'text-red-600 dark:text-red-400',
  'due-soon': 'text-amber-600 dark:text-amber-400',
  'on-track': 'text-muted-foreground',
} as const;

// Story 4.1 (UX §4.3): the Card Detail shell — title + List/Board breadcrumb
// + close button. Story 4.2 (FR18) adds inline-editable title/description;
// Story 4.3 (FR24) adds the Labels row of the metadata section. Dates,
// assignees, checklists, attachments, and the comment/activity feed are
// separate later Epic 4 stories.
//
// UX §7: full-screen sheet by default (mobile), centered modal from `sm:` up
// (desktop) — one Popup with responsive classes rather than two components,
// matching dialog.tsx's single-DialogContent approach.
export function CardDetail({
  card,
  list,
  boardId,
  boardName,
  open,
  onOpenChange,
}: {
  card: Card | null;
  list: List | null;
  boardId: string;
  boardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  // A field losing focus because Escape unmounted it (React removing a
  // still-focused node triggers a native blur) must not also save — this
  // flag lets onBlur tell that case apart from an intentional blur-to-save.
  const cancelledRef = useRef(false);

  // A newly-opened Card starts in read (rendered) mode, not mid-edit from
  // whichever Card was open before it.
  useEffect(() => {
    setEditingTitle(false);
    setEditingDescription(false);
  }, [card?.id]);

  const mutation = useMutation({
    mutationFn: (input: {
      title?: string;
      description?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
    }) => {
      if (!card) throw new Error('No card open');
      return updateCard(card.id, input);
    },
    // Patch the list's cache directly with the server's response rather than
    // invalidating — invalidate would refetch and briefly flash the
    // pre-edit title/description before the network round-trip resolves.
    onSuccess: (updated) => {
      if (!list) return;
      queryClient.setQueryData(['cards', list.id], (old: Card[] | undefined) =>
        old?.map((c) => (c.id === updated.id ? updated : c)),
      );
    },
  });

  function startEditingTitle() {
    if (!card) return;
    cancelledRef.current = false;
    setTitleDraft(card.title);
    setEditingTitle(true);
  }

  function startEditingDescription() {
    if (!card) return;
    cancelledRef.current = false;
    setDescriptionDraft(card.description ?? '');
    setEditingDescription(true);
  }

  function saveTitle() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const value = titleDraft.trim();
    setEditingTitle(false);
    if (!card || !value || value === card.title) return;
    mutation.mutate({ title: value });
  }

  function saveDescription() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const value = descriptionDraft.trim();
    setEditingDescription(false);
    if (!card || value === (card.description ?? '')) return;
    mutation.mutate({ description: value || null });
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveTitle();
    } else if (event.key === 'Escape') {
      // Without stopPropagation, Escape bubbles up to the Dialog's own
      // Escape-to-close handler and closes the whole Card Detail instead of
      // just cancelling the title edit.
      event.stopPropagation();
      cancelledRef.current = true;
      setEditingTitle(false);
    }
  }

  function handleDescriptionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      cancelledRef.current = true;
      setEditingDescription(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="card-detail-content"
          className={cn(
            'fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-popover p-4 text-sm text-popover-foreground outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(85vh,720px)] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6 sm:ring-1 sm:ring-foreground/10 sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95',
          )}
        >
          {card && (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {boardName}
                    {list ? ` / ${list.name}` : ''}
                  </p>
                  {/* Always-present accessible name for the dialog, independent of
                      whether the visible title below is mid-edit. */}
                  <DialogPrimitive.Title className="sr-only">{card.title}</DialogPrimitive.Title>
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={handleTitleKeyDown}
                      className="w-full rounded-md border border-input bg-background px-1.5 py-1 font-heading text-lg font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  ) : (
                    <h2
                      role="button"
                      tabIndex={0}
                      aria-label="Edit title"
                      onClick={startEditingTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') startEditingTitle();
                      }}
                      className="cursor-text truncate rounded-md px-1.5 py-1 -mx-1.5 font-heading text-lg font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {card.title}
                    </h2>
                  )}
                </div>
                <DialogPrimitive.Close
                  data-slot="dialog-close"
                  render={<Button variant="ghost" size="icon-sm" aria-label="Close card" />}
                >
                  <XIcon />
                </DialogPrimitive.Close>
              </div>

              {list && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Labels</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.labels.map((label) => (
                      <LabelChip key={label.id} label={label} />
                    ))}
                    <LabelPicker card={card} boardId={boardId} listId={list.id} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Dates</span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Start
                    <input
                      type="date"
                      value={toDateInputValue(card.startDate)}
                      onChange={(e) =>
                        mutation.mutate({ startDate: e.target.value ? new Date(e.target.value) : null })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Due
                    <input
                      type="date"
                      value={toDateInputValue(card.dueDate)}
                      onChange={(e) =>
                        mutation.mutate({ dueDate: e.target.value ? new Date(e.target.value) : null })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  {card.dueDate &&
                    (() => {
                      const status = getDueStatus(card.dueDate)!;
                      return (
                        <span className={cn('text-xs font-medium', DUE_STATUS_TEXT[status])}>
                          {status === 'overdue' ? 'Overdue' : status === 'due-soon' ? 'Due soon' : 'On track'}
                        </span>
                      );
                    })()}
                </div>
              </div>

              {list && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Assignees</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.assignees.map((assignee) => (
                      <PersonAvatar key={assignee.id} name={assignee.name} avatarUrl={assignee.avatarUrl} />
                    ))}
                    <AssigneePicker card={card} boardId={boardId} listId={list.id} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                {editingDescription ? (
                  <textarea
                    autoFocus
                    rows={6}
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onBlur={saveDescription}
                    onKeyDown={handleDescriptionKeyDown}
                    placeholder="Write a description in Markdown…"
                    className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Edit description"
                    onClick={startEditingDescription}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') startEditingDescription();
                    }}
                    className="min-h-16 cursor-text rounded-md px-2.5 py-1.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {card.description ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Markdown>{card.description}</Markdown>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Add a description…</span>
                    )}
                  </div>
                )}
              </div>

              {list && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Checklists</span>
                  <ChecklistSection card={card} listId={list.id} />
                </div>
              )}
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
