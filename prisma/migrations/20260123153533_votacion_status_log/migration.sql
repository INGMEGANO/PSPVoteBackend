-- CreateTable
CREATE TABLE `VotacionStatusLog` (
    `id` VARCHAR(191) NOT NULL,
    `votacionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `observation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VotacionStatusLog` ADD CONSTRAINT `VotacionStatusLog_votacionId_fkey` FOREIGN KEY (`votacionId`) REFERENCES `Votacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VotacionStatusLog` ADD CONSTRAINT `VotacionStatusLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
