import type { BoardRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

export const ROLE_RANK: Record<BoardRole, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };

// Must run after loadBoardContext, which sets req.boardRole. Compares the
// effective role it resolved against the route's declared minimum — the only
// place role comparisons happen, per Architecture §5.
export function requireRole(minRole: BoardRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.boardRole || ROLE_RANK[req.boardRole] < ROLE_RANK[minRole]) {
      res.status(403).json({ error: 'You do not have permission to do that' });
      return;
    }
    next();
  };
}
