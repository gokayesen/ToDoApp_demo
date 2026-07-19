import type { Board } from '@todoapp/shared';
import Link from 'next/link';

const FALLBACK_BACKGROUND = 'var(--muted)';

function isImageBackground(value: string) {
  return /^https?:\/\//.test(value);
}

export function BoardCard({ board }: { board: Board }) {
  const background = board.background;
  const style = background
    ? isImageBackground(background)
      ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background }
    : { backgroundColor: FALLBACK_BACKGROUND };

  return (
    <Link
      href={`/boards/${board.id}`}
      className="flex h-24 flex-col justify-end rounded-lg p-3 ring-1 ring-foreground/10"
      style={style}
    >
      <span
        className={
          background
            ? 'truncate text-sm font-medium text-white drop-shadow-sm'
            : 'truncate text-sm font-medium text-foreground'
        }
      >
        {board.name}
      </span>
    </Link>
  );
}
