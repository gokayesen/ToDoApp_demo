-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "dueSoonNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "overdueNotifiedAt" TIMESTAMP(3);
