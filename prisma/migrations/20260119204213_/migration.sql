-- CreateTable
CREATE TABLE `PuestoVotacion` (
    `id` VARCHAR(191) NOT NULL,
    `codUnic` VARCHAR(191) NOT NULL,
    `departamento` VARCHAR(191) NOT NULL,
    `municipio` VARCHAR(191) NOT NULL,
    `puesto` VARCHAR(191) NOT NULL,
    `mujeres` INTEGER NOT NULL,
    `hombres` INTEGER NOT NULL,
    `total` INTEGER NOT NULL,
    `mesas` INTEGER NOT NULL,
    `comuna` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `latitud` DECIMAL(10, 7) NOT NULL,
    `longitud` DECIMAL(10, 7) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PuestoVotacion_codUnic_key`(`codUnic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
