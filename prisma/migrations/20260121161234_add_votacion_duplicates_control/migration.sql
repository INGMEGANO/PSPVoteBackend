-- DropIndex
DROP INDEX `Votacion_cedula_key` ON `votacion`;

-- AlterTable
ALTER TABLE `votacion` ADD COLUMN `duplicatedFromId` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_duplicatedFromId_fkey` FOREIGN KEY (`duplicatedFromId`) REFERENCES `Votacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
