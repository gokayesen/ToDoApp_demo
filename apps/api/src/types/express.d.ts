import type { Board, BoardRole } from '@prisma/client';

export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      // Set by loadBoardContext — the requester's effective role on req.board,
      // resolved per Architecture §7.4 (implicit Workspace-Owner Admin, else
      // explicit BoardMember row).
      board?: Board;
      boardRole?: BoardRole;
    }
  }
}
