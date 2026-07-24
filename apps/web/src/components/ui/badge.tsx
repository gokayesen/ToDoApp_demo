import * as React from 'react';

import { cn } from '@/lib/utils';

// Small unread/count indicator per the design handoff's Badge spec — a
// coloured dot (bell/notification-row unread marker) or a numeric pill
// (bell unread count).
function Badge({
  variant = 'dot',
  tone = 'accent',
  className,
  ...props
}: React.ComponentProps<'span'> & {
  variant?: 'dot' | 'count';
  tone?: 'accent' | 'danger';
}) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold leading-none',
        variant === 'dot' && 'size-2',
        variant === 'count' && 'h-[18px] min-w-[18px] px-1 text-[11px]',
        tone === 'accent' && 'bg-primary text-primary-foreground',
        tone === 'danger' && 'bg-destructive text-white',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
