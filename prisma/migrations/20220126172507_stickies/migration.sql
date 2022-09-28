-- CreateTable
CREATE TABLE "Sticky" (
    "id" SERIAL NOT NULL,
    "lastMessageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageContent" TEXT NOT NULL,

    CONSTRAINT "Sticky_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sticky_lastMessageId_key" ON "Sticky"("lastMessageId");
