-- CreateTable
CREATE TABLE "Strike" (
    "id" SERIAL NOT NULL,
    "reason" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discordUserId" TEXT NOT NULL,

    CONSTRAINT "Strike_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Strike" ADD CONSTRAINT "Strike_discordUserId_fkey" FOREIGN KEY ("discordUserId") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
