'use client';

import type { BoardMember, Card } from '@todoapp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';

import { createComment, deleteComment, listBoardMembers } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { useAuth } from '@/lib/auth-context';

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

// Story 4.7 (FR28): a chronological comment feed + composer with @mention
// autocomplete scoped to Board Members. No system-activity interleaving
// here (UX §4.3's "comments interleaved with system activity" is Story
// 4.9's Card Activity Log, which doesn't exist yet).
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
        {card.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
        {card.comments.map((comment) => (
          <div key={comment.id} className="group flex items-start gap-2">
            <PersonAvatar name={comment.authorNameSnapshot} avatarUrl={null} className="mt-0.5 size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-medium">{comment.authorNameSnapshot}</span>
                <span className="text-xs text-muted-foreground">
                  {timeFormatter.format(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{renderBody(comment.body, members ?? [])}</p>
            </div>
            {comment.userId === user?.id && (
              <button
                type="button"
                aria-label="Delete comment"
                onClick={() => deleteMutation.mutate(comment.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            )}
          </div>
        ))}
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
