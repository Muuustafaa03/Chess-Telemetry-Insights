-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "player" TEXT;

-- CreateIndex
CREATE INDEX "Event_player_idx" ON "Event"("player");
