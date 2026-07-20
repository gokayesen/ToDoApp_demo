import type {
  Attachment,
  Board,
  BoardRole,
  Card,
  Checklist,
  ChecklistItem,
  Comment,
  Label,
  List,
} from '@prisma/client';

export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      // Set by load{Board,List,Card,Label,Checklist,ChecklistItem,Comment,
      // Attachment}Context — the requester's effective role on req.board,
      // resolved per Architecture §7.4 (implicit Workspace-Owner Admin, else
      // explicit BoardMember row).
      board?: Board;
      boardRole?: BoardRole;
      // Set by loadListContext/loadCardContext/loadLabelContext/
      // loadChecklistContext/loadChecklistItemContext/loadCommentContext/
      // loadAttachmentContext alongside board/boardRole above.
      list?: List;
      card?: Card;
      label?: Label;
      checklist?: Checklist;
      checklistItem?: ChecklistItem;
      comment?: Comment;
      attachment?: Attachment;
    }
  }
}
