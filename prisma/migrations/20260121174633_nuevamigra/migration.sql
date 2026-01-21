/*
  Warnings:

  - You are about to drop the column `createdAt` on the `programa` table. All the data in the column will be lost.
  - You are about to drop the column `tieneSedes` on the `programa` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sedeprograma` table. All the data in the column will be lost.
  - You are about to drop the column `sedeProgramaId` on the `votacion` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `votacion` DROP FOREIGN KEY `Votacion_sedeProgramaId_fkey`;

-- AlterTable
ALTER TABLE `programa` DROP COLUMN `createdAt`,
    DROP COLUMN `tieneSedes`;

-- AlterTable
ALTER TABLE `sedeprograma` DROP COLUMN `createdAt`;

-- AlterTable
ALTER TABLE `votacion` DROP COLUMN `sedeProgramaId`,
    ADD COLUMN `sedeId` VARCHAR(191) NULL,
    ADD COLUMN `tipoId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TipoVinculacion` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TipoVinculacion_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `SedePrograma`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_tipoId_fkey` FOREIGN KEY (`tipoId`) REFERENCES `TipoVinculacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
