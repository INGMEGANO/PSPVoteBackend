/*
  Warnings:

  - You are about to drop the column `direccion` on the `leader` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `leader` table. All the data in the column will be lost.
  - You are about to drop the column `recomendado` on the `leader` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `leader` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `votacion` table. All the data in the column will be lost.
  - Added the required column `name` to the `Leader` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Leader` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `leader` DROP COLUMN `direccion`,
    DROP COLUMN `nombre`,
    DROP COLUMN `recomendado`,
    DROP COLUMN `telefono`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `recommendedById` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `votacion` DROP COLUMN `createdBy`,
    MODIFY `telefono` VARCHAR(191) NULL,
    MODIFY `direccion` VARCHAR(191) NULL,
    MODIFY `barrio` VARCHAR(191) NULL,
    MODIFY `puestoVotacion` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Leader` ADD CONSTRAINT `Leader_recommendedById_fkey` FOREIGN KEY (`recommendedById`) REFERENCES `Leader`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
