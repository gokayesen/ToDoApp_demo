'use client';

import type { Card, List, PresenceMember } from '@todoapp/shared';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Markdown from 'react-markdown';

import { ApiError } from '@/lib/api-client';
import { updateCard } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import { AvatarStack, PersonAvatar } from '@/components/ui/person-avatar';
import { getDueStatus } from '@/lib/due-date-status';
import { cn } from '@/lib/utils';
import { useCardPresence } from '@/hooks/use-card-presence';
import { useCardRoom } from '@/hooks/use-card-room';
import { HIGHLIGHT_MS } from '@/hooks/use-board-live-updates';
import { AssigneePicker } from './assignee-picker';
import { AttachmentSection } from './attachment-section';
import { ChecklistSection } from './checklist-section';
import { CommentSection } from './comment-section';
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

// Story 5.5 (UX §6): "Ayşe is also viewing this card" — same wording the UX
// spec itself uses.
function describeViewers(viewers: PresenceMember[]): string {
  const [first, ...rest] = viewers;
  if (!first) return '';
  if (rest.length === 0) return `${first.name} is also viewing this card`;
  return `${first.name} and ${rest.length} other${rest.length > 1 ? 's' : ''} are also viewing this card`;
}

function highlightStyle(active: boolean) {
  return {
    boxShadow: active ? '0 0 0 2px var(--color-primary)' : '0 0 0 2px transparent',
    transition: 'box-shadow 1.5s ease-out',
  };
}

// Story 5.5 (UX §6): "if they edit a field you're not currently focused on,
// update it live with the same brief highlight treatment" as the board face
// (card-item.tsx). There's no per-field diff on the wire (card:updated
// carries the whole Card), so this diffs the previous vs. current value of
// one field itself and flashes for HIGHLIGHT_MS on any change — including
// this client's own save, same accepted quirk useBoardLiveUpdates has for
// the board face, since card:updated carries no actorId to tell the two
// apart. `resetKey` (the open Card's id) resyncs without flashing when a
// *different* Card opens in this same, not-remounted component.
function useValueHighlight(key: string, resetKey: string): boolean {
  const [flash, setFlash] = useState(false);
  const previous = useRef({ resetKey, key });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (previous.current.resetKey !== resetKey) {
      previous.current = { resetKey, key };
      setFlash(false);
      return;
    }
    if (previous.current.key !== key) {
      previous.current = { resetKey, key };
      setFlash(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(false), HIGHLIGHT_MS);
    }
  }, [key, resetKey]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return flash;
}

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
  currentUserId,
  open,
  onOpenChange,
}: {
  card: Card | null;
  list: List | null;
  boardId: string;
  boardName: string;
  currentUserId: string;
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
  // Story 5.6 (FR33): the Card.updatedAt this edit session started from,
  // captured once at startEditingTitle/Description rather than read fresh at
  // save time — saveTitle/saveDescription are redefined every render and
  // would otherwise pick up whatever `card.updatedAt` a live update landed
  // with mid-edit, silently defeating the conflict check it's there to run.
  const expectedUpdatedAtRef = useRef<Date | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A newly-opened Card starts in read (rendered) mode, not mid-edit from
  // whichever Card was open before it.
  useEffect(() => {
    setEditingTitle(false);
    setEditingDescription(false);
    setConflictNotice(null);
    clearTimeout(conflictTimerRef.current);
  }, [card?.id]);

  useEffect(() => () => clearTimeout(conflictTimerRef.current), []);

  const cardId = card?.id ?? null;
  useCardRoom(cardId);
  const cardPresence = useCardPresence(cardId);
  const otherViewers = cardPresence.filter((member) => member.userId !== currentUserId);

  const titleHighlight = useValueHighlight(card?.title ?? '', card?.id ?? '');
  const descriptionHighlight = useValueHighlight(card?.description ?? '', card?.id ?? '');
  const datesHighlight = useValueHighlight(
    `${toDateInputValue(card?.startDate)}|${toDateInputValue(card?.dueDate)}`,
    card?.id ?? '',
  );
  const labelsHighlight = useValueHighlight(
    (card?.labels ?? [])
      .map((label) => label.id)
      .sort()
      .join(','),
    card?.id ?? '',
  );
  const assigneesHighlight = useValueHighlight(
    (card?.assignees ?? [])
      .map((assignee) => assignee.id)
      .sort()
      .join(','),
    card?.id ?? '',
  );

  const mutation = useMutation({
    mutationFn: (input: {
      title?: string;
      description?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
      expectedUpdatedAt?: Date;
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
    // FR33 (Story 5.6): the server already told us who won and the winning
    // value already reached this client's cache via the live card:updated
    // broadcast (Story 5.4/5.5) — this just surfaces the conflict inline and
    // drops back to read mode instead of leaving a now-orphaned edit open.
    onError: (error) => {
      if (!(error instanceof ApiError) || error.status !== 409) return;
      setEditingTitle(false);
      setEditingDescription(false);
      setConflictNotice(error.message);
      clearTimeout(conflictTimerRef.current);
      conflictTimerRef.current = setTimeout(() => setConflictNotice(null), 6000);
    },
  });

  function startEditingTitle() {
    if (!card) return;
    cancelledRef.current = false;
    setTitleDraft(card.title);
    expectedUpdatedAtRef.current = card.updatedAt;
    setEditingTitle(true);
  }

  function startEditingDescription() {
    if (!card) return;
    cancelledRef.current = false;
    setDescriptionDraft(card.description ?? '');
    expectedUpdatedAtRef.current = card.updatedAt;
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
    mutation.mutate({ title: value, expectedUpdatedAt: expectedUpdatedAtRef.current ?? undefined });
  }

  function saveDescription() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const value = descriptionDraft.trim();
    setEditingDescription(false);
    if (!card || value === (card.description ?? '')) return;
    mutation.mutate({
      description: value || null,
      expectedUpdatedAt: expectedUpdatedAtRef.current ?? undefined,
    });
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
                      style={highlightStyle(titleHighlight)}
                      className="cursor-text truncate rounded-md px-1.5 py-1 -mx-1.5 font-heading text-lg font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {card.title}
                    </h2>
                  )}
                  {/* FR33/Story 5.6 (UX §6): "This was just updated by X — your
                      view has been refreshed" — the losing side of a
                      concurrent edit. The refreshed value is already visible
                      above via the live card:updated merge (Story 5.4/5.5);
                      this notice just explains why the in-progress edit
                      vanished. */}
                  {conflictNotice && (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {conflictNotice}
                    </p>
                  )}
                  {/* UX §6 "Ayşe is also viewing this card" — card-level presence,
                      distinct from the board header's avatar stack (usePresence). */}
                  {otherViewers.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AvatarStack
                        people={otherViewers}
                        keyOf={(member) => member.userId}
                        max={3}
                        size="sm"
                      />
                      <span>{describeViewers(otherViewers)}</span>
                    </div>
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
                <div
                  className="flex flex-col gap-1.5 rounded-md"
                  style={highlightStyle(labelsHighlight)}
                >
                  <span className="text-xs font-medium text-muted-foreground">Labels</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.labels.map((label) => (
                      <LabelChip key={label.id} label={label} />
                    ))}
                    <LabelPicker card={card} boardId={boardId} listId={list.id} />
                  </div>
                </div>
              )}

              <div
                className="flex flex-col gap-1.5 rounded-md"
                style={highlightStyle(datesHighlight)}
              >
                <span className="text-xs font-medium text-muted-foreground">Dates</span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Start
                    <input
                      type="date"
                      value={toDateInputValue(card.startDate)}
                      onChange={(e) =>
                        mutation.mutate({
                          startDate: e.target.value ? new Date(e.target.value) : null,
                          expectedUpdatedAt: card.updatedAt,
                        })
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
                        mutation.mutate({
                          dueDate: e.target.value ? new Date(e.target.value) : null,
                          expectedUpdatedAt: card.updatedAt,
                        })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  {card.dueDate &&
                    (() => {
                      const status = getDueStatus(card.dueDate)!;
                      return (
                        <span className={cn('text-xs font-medium', DUE_STATUS_TEXT[status])}>
                          {status === 'overdue'
                            ? 'Overdue'
                            : status === 'due-soon'
                              ? 'Due soon'
                              : 'On track'}
                        </span>
                      );
                    })()}
                </div>
              </div>

              {list && (
                <div
                  className="flex flex-col gap-1.5 rounded-md"
                  style={highlightStyle(assigneesHighlight)}
                >
                  <span className="text-xs font-medium text-muted-foreground">Assignees</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.assignees.map((assignee) => (
                      <PersonAvatar
                        key={assignee.id}
                        name={assignee.name}
                        avatarUrl={assignee.avatarUrl}
                      />
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
                    style={highlightStyle(descriptionHighlight)}
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

              {list && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Attachments</span>
                  <AttachmentSection card={card} listId={list.id} />
                </div>
              )}

              {list && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Activity</span>
                  <CommentSection card={card} boardId={boardId} listId={list.id} />
                </div>
              )}
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
