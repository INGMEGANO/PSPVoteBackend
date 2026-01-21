-- AlterTable
ALTER TABLE `votacion` ADD COLUMN `recommendedById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_recommendedById_fkey` FOREIGN KEY (`recommendedById`) REFERENCES `Leader`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
