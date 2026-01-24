-- AlterTable
ALTER TABLE `votacion` ADD COLUMN `digitadorId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_digitadorId_fkey` FOREIGN KEY (`digitadorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
