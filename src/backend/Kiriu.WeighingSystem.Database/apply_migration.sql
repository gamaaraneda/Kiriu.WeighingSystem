-- Script para aplicar las migraciones de tablas de pesaje
-- Este script debe ejecutarse en la base de datos WeighingSystem

USE WeighingSystem;
GO

-- Crear esquema weighing si no existe
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'weighing')
    EXEC('CREATE SCHEMA weighing');
GO

-- Verificar si las tablas ya existen
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations')
BEGIN
    -- Crear tabla WeighingOperations
    CREATE TABLE [weighing].[WeighingOperations] (
        [Id] uniqueidentifier NOT NULL,
        [Folio] nvarchar(50) NOT NULL,
        [UnitType] nvarchar(20) NOT NULL,
        [OperationType] nvarchar(20) NOT NULL,
        [TrailerPlate] nvarchar(20) NULL,
        [TrailerPlate2] nvarchar(20) NULL,
        [TrailerPlateContenedor] nvarchar(20) NULL,
        [RemolquePlateContenedor] nvarchar(20) NULL,
        [PlacaRemolque1] nvarchar(20) NULL,
        [PlacaRemolque2] nvarchar(20) NULL,
        [Product] nvarchar(100) NOT NULL,
        [ClientProviderName] nvarchar(200) NOT NULL,
        [ClientProviderRfc] nvarchar(50) NULL,
        [EntryWeight] decimal(18,2) NULL,
        [ExitWeight] decimal(18,2) NULL,
        [NetWeight] decimal(18,2) NULL,
        [Status] nvarchar(30) NOT NULL,
        [TipoUnidad] nvarchar(30) NOT NULL,
        [CreatedAt] DATETIME NOT NULL,
        [UpdatedAt] DATETIME NOT NULL,
        [EntryDate] DATETIME NULL,
        [ExitDate] DATETIME NULL,
        CONSTRAINT [PK_WeighingOperations] PRIMARY KEY ([Id])
    );

    -- Crear índices para WeighingOperations
    CREATE UNIQUE INDEX [IX_WeighingOperations_Folio] ON [weighing].[WeighingOperations] ([Folio]);
    CREATE INDEX [IX_WeighingOperations_Status] ON [weighing].[WeighingOperations] ([Status]);
    CREATE INDEX [IX_WeighingOperations_TrailerPlate] ON [weighing].[WeighingOperations] ([TrailerPlate]);

    PRINT 'Tabla WeighingOperations creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla WeighingOperations ya existe.';
END
GO

-- Crear tabla WeighingPhotos
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingPhotos')
BEGIN
    CREATE TABLE [weighing].[WeighingPhotos] (
        [Id] uniqueidentifier NOT NULL,
        [WeighingOperationId] uniqueidentifier NOT NULL,
        [PhotoType] nvarchar(50) NOT NULL,
        [PhotoUrl] nvarchar(500) NOT NULL,
        [Description] nvarchar(200) NULL,
        [CreatedAt] DATETIME NOT NULL,
        CONSTRAINT [PK_WeighingPhotos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WeighingPhotos_WeighingOperations_WeighingOperationId] FOREIGN KEY ([WeighingOperationId]) REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE CASCADE
    );

    -- Crear índice para WeighingPhotos
    CREATE INDEX [IX_WeighingPhotos_WeighingOperationId] ON [weighing].[WeighingPhotos] ([WeighingOperationId]);

    PRINT 'Tabla WeighingPhotos creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla WeighingPhotos ya existe.';
END
GO

-- Crear tabla WeighingRemolques
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques')
BEGIN
    CREATE TABLE [weighing].[WeighingRemolques] (
        [Id] uniqueidentifier NOT NULL,
        [WeighingOperationId] uniqueidentifier NOT NULL,
        [Numero] int NOT NULL,
        [Placa] nvarchar(20) NOT NULL,
        [PesoBruto] decimal(18,2) NOT NULL,
        [PesoTara] decimal(18,2) NULL,
        [PesoCapturado] bit NOT NULL,
        [FotosCapturadas] bit NOT NULL,
        [FotoCargaCapturada] bit NOT NULL,
        [FotoPlacaCapturada] bit NOT NULL,
        [CreatedAt] DATETIME NOT NULL,
        [UpdatedAt] DATETIME NOT NULL,
        CONSTRAINT [PK_WeighingRemolques] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WeighingRemolques_WeighingOperations_WeighingOperationId] FOREIGN KEY ([WeighingOperationId]) REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE CASCADE
    );

    -- Crear índice para WeighingRemolques
    CREATE INDEX [IX_WeighingRemolques_WeighingOperationId] ON [weighing].[WeighingRemolques] ([WeighingOperationId]);

    PRINT 'Tabla WeighingRemolques creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla WeighingRemolques ya existe.';
END
GO

-- Crear tabla de historial de migraciones si no existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '__EFMigrationsHistory')
BEGIN
    CREATE TABLE [dbo].[__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END
GO

-- Registrar la migración
IF NOT EXISTS (SELECT * FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = '20250820000001_AddWeighingTables')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20250820000001_AddWeighingTables', '8.0.0');
    PRINT 'Migración 20250820000001_AddWeighingTables registrada.';
END
ELSE
BEGIN
    PRINT 'Migración 20250820000001_AddWeighingTables ya está registrada.';
END
GO

PRINT 'Migración completada exitosamente.';
PRINT 'Verificando tablas creadas...';

-- Verificar que las tablas se crearon correctamente
SELECT 
    TABLE_SCHEMA as Esquema,
    TABLE_NAME as Tabla,
    'Creada' as Estado
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'weighing'
ORDER BY TABLE_NAME;
GO