import { XIcon } from 'lucide-react';

import type { BoardToast } from '@/hooks/use-out-of-view-toasts';

// UX §6 "small non-blocking toast ... dismissible or auto-fading" for a
// change on a board section currently scrolled out of view (Story 5.7).
export function BoardToasts({ toasts, onDismiss }: { toasts: BoardToast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm text-background shadow-lg"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded p-0.5 text-background/70 outline-none hover:text-background focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
