-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExploitLog" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BanLog" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tempban" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExploitLog" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanLog" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
