-- CreateTable
CREATE TABLE `VotacionConsulta` (
    `id` VARCHAR(191) NOT NULL,
    `votacionId` VARCHAR(191) NOT NULL,
    `fuente` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL,
    `observacion` VARCHAR(191) NULL,
    `consultadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `VotacionConsulta_votacionId_idx`(`votacionId`),
    INDEX `VotacionConsulta_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VotacionConsulta` ADD CONSTRAINT `VotacionConsulta_votacionId_fkey` FOREIGN KEY (`votacionId`) REFERENCES `Votacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VotacionConsulta` ADD CONSTRAINT `VotacionConsulta_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
