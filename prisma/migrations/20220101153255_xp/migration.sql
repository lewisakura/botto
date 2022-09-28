-- CreateTable
CREATE TABLE "DiscordUser" (
    "id" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiscordUser_pkey" PRIMARY KEY ("id")
);
