-- DropForeignKey
ALTER TABLE "BanLog" DROP CONSTRAINT "BanLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "ExploitLog" DROP CONSTRAINT "ExploitLog_userId_fkey";

-- AddForeignKey
ALTER TABLE "ExploitLog" ADD CONSTRAINT "ExploitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanLog" ADD CONSTRAINT "BanLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
