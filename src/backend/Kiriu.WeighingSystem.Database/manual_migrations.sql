-- =====================================================
-- MANUAL DATABASE MIGRATIONS FOR KIRIU WEIGHING SYSTEM
-- =====================================================
-- Este script maneja todas las migraciones de la base de datos
-- sin depender de Entity Framework Core migrations.
-- 
-- INSTRUCCIONES:
-- 1. Conectar a la base de datos WeighingSystem
-- 2. Ejecutar este script completo
-- 3. Para futuras modificaciones, agregar nuevas secciones al final
-- =====================================================

USE WeighingSystem;
GO

-- =====================================================
-- VARIABLES DE CONTROL
-- =====================================================
DECLARE @CurrentVersion INT = 1; -- Versión actual del script
DECLARE @SchemaVersion INT;

-- Crear tabla de versiones si no existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DatabaseVersions')
BEGIN
    CREATE TABLE [dbo].[DatabaseVersions] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Version] INT NOT NULL UNIQUE,
        [Description] NVARCHAR(255) NOT NULL,
        [AppliedDate] DATETIME2 DEFAULT GETDATE(),
        [ScriptName] NVARCHAR(100) NOT NULL
    );
    
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (0, 'Base database structure', 'initial_setup.sql');
    
    PRINT 'Tabla de control de versiones creada.';
END

-- Obtener versión actual de la base de datos
SELECT @SchemaVersion = ISNULL(MAX([Version]), 0) FROM [dbo].[DatabaseVersions];
PRINT 'Versión actual de la base de datos: ' + CAST(@SchemaVersion AS VARCHAR(10));

-- =====================================================
-- MIGRACIÓN VERSIÓN 1: TABLAS DE PESAJE
-- =====================================================
IF @SchemaVersion < 1
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 1: TABLAS DE PESAJE';
    PRINT '==========================================';
    
    -- Crear esquema weighing si no existe
    IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'weighing')
    BEGIN
        EXEC('CREATE SCHEMA weighing');
        PRINT '✓ Esquema weighing creado';
    END
    
    -- 1. TABLA WeighingOperations
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations')
    BEGIN
        CREATE TABLE [weighing].[WeighingOperations] (
            [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
            [Folio] NVARCHAR(50) NOT NULL,
            [UnitType] NVARCHAR(20) NOT NULL, -- client, provider
            [OperationType] NVARCHAR(20) NOT NULL, -- entry, exit
            [TrailerPlate] NVARCHAR(20) NULL,
            [TrailerPlate2] NVARCHAR(20) NULL,
            [TrailerPlateContenedor] NVARCHAR(20) NULL,
            [RemolquePlateContenedor] NVARCHAR(20) NULL,
            [PlacaRemolque1] NVARCHAR(20) NULL,
            [PlacaRemolque2] NVARCHAR(20) NULL,
            [Product] NVARCHAR(100) NOT NULL,
            [ClientProviderName] NVARCHAR(200) NOT NULL,
            [ClientProviderRfc] NVARCHAR(50) NULL,
            [EntryWeight] DECIMAL(18,2) NULL,
            [ExitWeight] DECIMAL(18,2) NULL,
            [NetWeight] DECIMAL(18,2) NULL,
            [Status] NVARCHAR(30) NOT NULL, -- ENTRADA_REGISTRADA, SALIDA_REGISTRADA
            [TipoUnidad] NVARCHAR(30) NOT NULL, -- remolque, contenedor, doble-remolque
            [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
            [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
            [EntryDate] DATETIME2 NULL,
            [ExitDate] DATETIME2 NULL,
            
            CONSTRAINT [PK_WeighingOperations] PRIMARY KEY ([Id]),
            CONSTRAINT [CK_WeighingOperations_UnitType] CHECK ([UnitType] IN ('client', 'provider')),
            CONSTRAINT [CK_WeighingOperations_OperationType] CHECK ([OperationType] IN ('entry', 'exit')),
            CONSTRAINT [CK_WeighingOperations_Status] CHECK ([Status] IN ('ENTRADA_REGISTRADA', 'SALIDA_REGISTRADA')),
            CONSTRAINT [CK_WeighingOperations_TipoUnidad] CHECK ([TipoUnidad] IN ('remolque', 'contenedor', 'doble-remolque')),
            CONSTRAINT [CK_WeighingOperations_Weights] CHECK ([EntryWeight] >= 0 AND [ExitWeight] >= 0 AND [NetWeight] >= 0)
        );
        
        -- Índices para WeighingOperations
        CREATE UNIQUE INDEX [IX_WeighingOperations_Folio] ON [weighing].[WeighingOperations] ([Folio]);
        CREATE INDEX [IX_WeighingOperations_Status] ON [weighing].[WeighingOperations] ([Status]);
        CREATE INDEX [IX_WeighingOperations_TrailerPlate] ON [weighing].[WeighingOperations] ([TrailerPlate]);
        CREATE INDEX [IX_WeighingOperations_CreatedAt] ON [weighing].[WeighingOperations] ([CreatedAt]);
        CREATE INDEX [IX_WeighingOperations_ClientProvider] ON [weighing].[WeighingOperations] ([ClientProviderName]);
        
        PRINT '✓ Tabla WeighingOperations creada con índices';
    END
    
    -- 2. TABLA WeighingPhotos
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingPhotos')
    BEGIN
        CREATE TABLE [weighing].[WeighingPhotos] (
            [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
            [WeighingOperationId] UNIQUEIDENTIFIER NOT NULL,
            [PhotoType] NVARCHAR(50) NOT NULL, -- trailerPlate, cargo, cargoState, etc.
            [PhotoUrl] NVARCHAR(500) NOT NULL,
            [Description] NVARCHAR(200) NULL,
            [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
            
            CONSTRAINT [PK_WeighingPhotos] PRIMARY KEY ([Id]),
            CONSTRAINT [FK_WeighingPhotos_WeighingOperations] FOREIGN KEY ([WeighingOperationId]) 
                REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE CASCADE,
            CONSTRAINT [CK_WeighingPhotos_PhotoType] CHECK ([PhotoType] IN (
                'trailerPlate', 'trailerPlate2', 'cargo', 'cargoState', 'containerPlate',
                'remolque1Plate', 'remolque2Plate', 'cargoRemolque1', 'cargoRemolque2'
            ))
        );
        
        -- Índices para WeighingPhotos
        CREATE INDEX [IX_WeighingPhotos_WeighingOperationId] ON [weighing].[WeighingPhotos] ([WeighingOperationId]);
        CREATE INDEX [IX_WeighingPhotos_PhotoType] ON [weighing].[WeighingPhotos] ([PhotoType]);
        
        PRINT '✓ Tabla WeighingPhotos creada con índices';
    END
    
    -- 3. TABLA WeighingRemolques
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques')
    BEGIN
        CREATE TABLE [weighing].[WeighingRemolques] (
            [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
            [WeighingOperationId] UNIQUEIDENTIFIER NOT NULL,
            [Numero] INT NOT NULL, -- 1 o 2 para identificar remolque
            [Placa] NVARCHAR(20) NOT NULL,
            [PesoBruto] DECIMAL(18,2) NOT NULL,
            [PesoTara] DECIMAL(18,2) NULL,
            [PesoCapturado] BIT NOT NULL DEFAULT 0,
            [FotosCapturadas] BIT NOT NULL DEFAULT 0,
            [FotoCargaCapturada] BIT NOT NULL DEFAULT 0,
            [FotoPlacaCapturada] BIT NOT NULL DEFAULT 0,
            [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
            [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
            
            CONSTRAINT [PK_WeighingRemolques] PRIMARY KEY ([Id]),
            CONSTRAINT [FK_WeighingRemolques_WeighingOperations] FOREIGN KEY ([WeighingOperationId]) 
                REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE CASCADE,
            CONSTRAINT [CK_WeighingRemolques_Numero] CHECK ([Numero] IN (1, 2)),
            CONSTRAINT [CK_WeighingRemolques_Weights] CHECK ([PesoBruto] >= 0 AND ([PesoTara] IS NULL OR [PesoTara] >= 0))
        );
        
        -- Índices para WeighingRemolques
        CREATE INDEX [IX_WeighingRemolques_WeighingOperationId] ON [weighing].[WeighingRemolques] ([WeighingOperationId]);
        CREATE INDEX [IX_WeighingRemolques_Placa] ON [weighing].[WeighingRemolques] ([Placa]);
        CREATE UNIQUE INDEX [IX_WeighingRemolques_Operation_Numero] ON [weighing].[WeighingRemolques] ([WeighingOperationId], [Numero]);
        
        PRINT '✓ Tabla WeighingRemolques creada con índices';
    END
    
    -- 4. CREAR TRIGGERS PARA UpdatedAt
    IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_WeighingOperations_UpdatedAt')
    BEGIN
        EXEC('
        CREATE TRIGGER [weighing].[TR_WeighingOperations_UpdatedAt]
        ON [weighing].[WeighingOperations]
        AFTER UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            UPDATE [weighing].[WeighingOperations]
            SET [UpdatedAt] = GETDATE()
            FROM [weighing].[WeighingOperations] w
            INNER JOIN inserted i ON w.[Id] = i.[Id];
        END
        ');
        PRINT '✓ Trigger UpdatedAt para WeighingOperations creado';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_WeighingRemolques_UpdatedAt')
    BEGIN
        EXEC('
        CREATE TRIGGER [weighing].[TR_WeighingRemolques_UpdatedAt]
        ON [weighing].[WeighingRemolques]
        AFTER UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            UPDATE [weighing].[WeighingRemolques]
            SET [UpdatedAt] = GETDATE()
            FROM [weighing].[WeighingRemolques] r
            INNER JOIN inserted i ON r.[Id] = i.[Id];
        END
        ');
        PRINT '✓ Trigger UpdatedAt para WeighingRemolques creado';
    END
    
    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (1, 'Tablas de sistema de pesaje: WeighingOperations, WeighingPhotos, WeighingRemolques', 'manual_migrations.sql');
    
    PRINT '✅ MIGRACIÓN VERSIÓN 1 COMPLETADA EXITOSAMENTE';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'ℹ️  Migración versión 1 ya aplicada - Saltando...';
END

-- =====================================================
-- PLANTILLA PARA FUTURAS MIGRACIONES
-- =====================================================
/*
-- =====================================================
-- MIGRACIÓN VERSIÓN 2: [DESCRIPCIÓN]
-- =====================================================
IF @SchemaVersion < 2
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 2: [DESCRIPCIÓN]';
    PRINT '==========================================';
    
    -- Aquí van los comandos SQL para la migración
    -- Ejemplo:
    -- ALTER TABLE [weighing].[WeighingOperations] ADD [NuevoCampo] NVARCHAR(50) NULL;
    -- CREATE INDEX [IX_NuevoIndice] ON [weighing].[WeighingOperations] ([NuevoCampo]);
    
    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (2, '[DESCRIPCIÓN DE LA MIGRACIÓN]', 'manual_migrations.sql');
    
    PRINT '✅ MIGRACIÓN VERSIÓN 2 COMPLETADA EXITOSAMENTE';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'ℹ️  Migración versión 2 ya aplicada - Saltando...';
END
*/

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
PRINT '==========================================';
PRINT 'VERIFICACIÓN FINAL DEL ESTADO DE LA BASE DE DATOS';
PRINT '==========================================';

-- Mostrar versión actual
SELECT @SchemaVersion = MAX([Version]) FROM [dbo].[DatabaseVersions];
PRINT 'Versión final de la base de datos: ' + CAST(@SchemaVersion AS VARCHAR(10));

-- Mostrar tablas creadas
PRINT '';
PRINT 'Tablas en el esquema weighing:';
SELECT 
    '  - ' + TABLE_NAME as [Tablas Creadas]
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'weighing'
ORDER BY TABLE_NAME;

-- Mostrar historial de migraciones
PRINT '';
PRINT 'Historial de migraciones aplicadas:';
SELECT 
    [Version] as Ver,
    [Description] as Descripción,
    FORMAT([AppliedDate], 'yyyy-MM-dd HH:mm') as Aplicada
FROM [dbo].[DatabaseVersions]
ORDER BY [Version];

PRINT '';
PRINT '🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!';
PRINT '   El sistema de pesaje está listo para usar.';
GO