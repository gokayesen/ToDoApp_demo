-- AlterTable
-- Backfills existing rows with the current time via a column default; Prisma's
-- @updatedAt only manages the value at the application layer going forward
-- (every write goes through Prisma client in this codebase, so the default
-- only needs to satisfy this one-time backfill of pre-existing rows).
ALTER TABLE "Card" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
