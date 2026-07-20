'use client';

import type { BoardMember, Card } from '@todoapp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HistoryIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';

import { createComment, deleteComment, listBoardMembers } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { useAuth } from '@/lib/auth-context';
import { describeActivity } from '@/lib/describe-activity';

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @mentions are a plain-text `@Full Name` convention (see schema.prisma's
// Comment model comment, no structured mention storage) — re-highlighted
// here by matching against the board's *current* member names, longest name
// first so e.g. "Ali" doesn't shadow a match inside "Ali Veli".
function renderBody(body: string, members: BoardMember[]): ReactNode {
  if (members.length === 0) return body;
  const names = [...members].map((m) => m.user.name).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${names.map(escapeRegExp).join('|')})`, 'g');

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(body))) {
    if (match.index > lastIndex) nodes.push(body.slice(lastIndex, match.index));
    nodes.push(
      <span key={key++} className="rounded bg-primary/10 px-1 font-medium text-primary">
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) nodes.push(body.slice(lastIndex));
  return nodes;
}

// Story 4.7 (FR28) / Story 4.9 (FR30): a chronological feed merging Comments
// with system-generated Activity Log entries (UX §4.3: "comments
// interleaved with system activity entries like 'Ayşe moved this card from
// To Do to Doing'"), plus the comment composer with @mention autocomplete.
export function CommentSection({ card, boardId, listId }: { card: Card; boardId: string; listId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: members } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => listBoardMembers(boardId),
  });

  function patchCard(updated: Card) {
    queryClient.setQueryData(['cards', listId], (old: Card[] | undefined) =>
      old?.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  const createMutation = useMutation({
    mutationFn: (value: string) => createComment(card.id, { body: value }),
    onSuccess: (updated) => {
      patchCard(updated);
      setBody('');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: patchCard,
  });

  const matches = useMemo(() => {
    if (mentionQuery === null || !members) return [];
    const query = mentionQuery.toLowerCase();
    return members.filter((m) => m.user.name.toLowerCase().includes(query)).slice(0, 5);
  }, [mentionQuery, members]);

  const feed = useMemo(() => {
    const commentItems = card.comments.map((comment) => ({
      kind: 'comment' as const,
      key: `comment-${comment.id}`,
      createdAt: new Date(comment.createdAt).getTime(),
      comment,
    }));
    const activityItems = card.activityLog.map((entry) => ({
      kind: 'activity' as const,
      key: `activity-${entry.id}`,
      createdAt: new Date(entry.createdAt).getTime(),
      entry,
    }));
    return [...commentItems, ...activityItems].sort((a, b) => a.createdAt - b.createdAt);
  }, [card.comments, card.activityLog]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    const cursor = e.target.selectionStart;
    const upToCursor = value.slice(0, cursor);
    // An "@" with no whitespace between it and the cursor is an active
    // mention query — matches greedily up to (but not including) any space.
    const match = /@([^\s@]*)$/.exec(upToCursor);
    if (match) {
      setMentionQuery(match[1]!);
      setMentionStart(cursor - match[1]!.length - 1);
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  function selectMention(member: BoardMember) {
    if (mentionStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const before = body.slice(0, mentionStart);
    const after = body.slice(cursor);
    const inserted = `@${member.user.name} `;
    setBody(`${before}${inserted}${after}`);
    setMentionQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function submit() {
    const value = body.trim();
    if (!value) return;
    createMutation.mutate(value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (matches.length > 0 && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      selectMention(matches[0]!);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {feed.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
        {feed.map((item) =>
          item.kind === 'comment' ? (
            <div key={item.key} className="group flex items-start gap-2">
              <PersonAvatar
                name={item.comment.authorNameSnapshot}
                avatarUrl={null}
                className="mt-0.5 size-6 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium">{item.comment.authorNameSnapshot}</span>
                  <span className="text-xs text-muted-foreground">
                    {timeFormatter.format(new Date(item.comment.createdAt))}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {renderBody(item.comment.body, members ?? [])}
                </p>
              </div>
              {item.comment.userId === user?.id && (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => deleteMutation.mutate(item.comment.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HistoryIcon className="size-3 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{item.entry.actorNameSnapshot}</span>{' '}
                {describeActivity(item.entry)}
              </span>
              <span className="shrink-0">{timeFormatter.format(new Date(item.entry.createdAt))}</span>
            </div>
          ),
        )}
      </div>

      <div className="relative flex flex-col gap-1.5">
        <textarea
          ref={textareaRef}
          rows={2}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment… use @ to mention a board member"
          className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {matches.length > 0 && (
          <div className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
            {matches.map((member) => (
              <button
                key={member.userId}
                type="button"
                // Prevents the textarea from losing focus on click, which
                // would otherwise close this popover before onClick fires.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectMention(member)}
                className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm outline-none hover:bg-accent"
              >
                <PersonAvatar name={member.user.name} avatarUrl={member.user.avatarUrl} className="size-5" />
                {member.user.name}
              </button>
            ))}
          </div>
        )}
        <Button
          type="button"
          size="sm"
          className="w-fit self-end"
          onClick={submit}
          disabled={!body.trim() || createMutation.isPending}
        >
          Comment
        </Button>
      </div>
    </div>
  );
}
