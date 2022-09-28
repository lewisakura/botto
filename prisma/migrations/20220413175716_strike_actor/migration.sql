/*
  Warnings:

  - Added the required column `actor` to the `Strike` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Strike" ADD COLUMN     "actor" TEXT NOT NULL;
