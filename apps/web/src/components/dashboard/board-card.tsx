import type { Board } from '@todoapp/shared';

const FALLBACK_BACKGROUND = 'var(--muted)';

function isImageBackground(value: string) {
  return /^https?:\/\//.test(value);
}

// No Board View page exists yet (Epic 3), so this isn't a link — just a
// preview tile. It becomes a Link to /boards/[id] once that route exists.
export function BoardCard({ board }: { board: Board }) {
  const background = board.background;
  const style = background
    ? isImageBackground(background)
      ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background }
    : { backgroundColor: FALLBACK_BACKGROUND };

  return (
    <div
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
    </div>
  );
}
