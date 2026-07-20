'use client';

import type { Card, List } from '@todoapp/shared';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Story 4.1 (UX §4.3): the Card Detail shell only — title + List/Board
// breadcrumb + close button. Metadata row, description, checklists,
// attachments, and the comment/activity feed are separate Epic 4 stories
// layered into the body below the header.
//
// UX §7: full-screen sheet by default (mobile), centered modal from `sm:` up
// (desktop) — one Popup with responsive classes rather than two components,
// matching dialog.tsx's single-DialogContent approach.
export function CardDetail({
  card,
  list,
  boardName,
  open,
  onOpenChange,
}: {
  card: Card | null;
  list: List | null;
  boardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {boardName}
                  {list ? ` / ${list.name}` : ''}
                </p>
                <DialogPrimitive.Title className="truncate font-heading text-lg font-medium text-foreground">
                  {card.title}
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close
                data-slot="dialog-close"
                render={<Button variant="ghost" size="icon-sm" aria-label="Close card" />}
              >
                <XIcon />
              </DialogPrimitive.Close>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
