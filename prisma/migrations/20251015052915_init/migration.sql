-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "route" TEXT,
    "latencyMs" INTEGER,
    "status" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
