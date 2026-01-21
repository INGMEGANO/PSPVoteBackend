-- AlterTable
ALTER TABLE `votacion` ADD COLUMN `programaId` VARCHAR(191) NULL,
    ADD COLUMN `sedeProgramaId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Programa` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `tieneSedes` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Programa_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SedePrograma` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `programaId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SedePrograma_nombre_programaId_key`(`nombre`, `programaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_programaId_fkey` FOREIGN KEY (`programaId`) REFERENCES `Programa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Votacion` ADD CONSTRAINT `Votacion_sedeProgramaId_fkey` FOREIGN KEY (`sedeProgramaId`) REFERENCES `SedePrograma`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SedePrograma` ADD CONSTRAINT `SedePrograma_programaId_fkey` FOREIGN KEY (`programaId`) REFERENCES `Programa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
