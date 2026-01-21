/*
  Warnings:

  - You are about to drop the column `duplicatedFromId` on the `votacion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cedula,leaderId]` on the table `Votacion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `votacion` DROP FOREIGN KEY `Votacion_duplicatedFromId_fkey`;

-- AlterTable
ALTER TABLE `votacion` DROP COLUMN `duplicatedFromId`,
    ADD COLUMN `duplicatedFrom` VARCHAR(191) NULL,
    ADD COLUMN `isDuplicate` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `Votacion_cedula_leaderId_key` ON `Votacion`(`cedula`, `leaderId`);

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_duplicatedFrom_fkey` FOREIGN KEY (`duplicatedFrom`) REFERENCES `Votacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
