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
DECLARE @CurrentVersion INT = 9; -- Versión actual del script
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
                REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE NO ACTION,
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
                REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE NO ACTION,
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
-- MIGRACIÓN VERSIÓN 2: SINCRONIZACIÓN CON ENTITY FRAMEWORK
-- =====================================================
IF @SchemaVersion < 2
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 2: SINCRONIZACIÓN CON ENTITY FRAMEWORK';
    PRINT '==========================================';
    
    -- Esta migración asegura que las tablas existentes estén completamente sincronizadas
    -- con el modelo de Entity Framework Core, incluyendo foreign keys y restricciones
    
    -- Verificar y crear foreign keys si no existen
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingPhotos_WeighingOperations')
    BEGIN
        ALTER TABLE [weighing].[WeighingPhotos] 
        ADD CONSTRAINT [FK_WeighingPhotos_WeighingOperations] 
        FOREIGN KEY ([WeighingOperationId]) 
        REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE NO ACTION;
        PRINT '✓ Foreign key FK_WeighingPhotos_WeighingOperations creada';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingRemolques_WeighingOperations')
    BEGIN
        ALTER TABLE [weighing].[WeighingRemolques] 
        ADD CONSTRAINT [FK_WeighingRemolques_WeighingOperations] 
        FOREIGN KEY ([WeighingOperationId]) 
        REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE NO ACTION;
        PRINT '✓ Foreign key FK_WeighingRemolques_WeighingOperations creada';
    END
    
    -- Verificar y crear índices adicionales si no existen
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingPhotos_PhotoType')
    BEGIN
        CREATE INDEX [IX_WeighingPhotos_PhotoType] ON [weighing].[WeighingPhotos] ([PhotoType]);
        PRINT '✓ Índice IX_WeighingPhotos_PhotoType creado';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingRemolques_Placa')
    BEGIN
        CREATE INDEX [IX_WeighingRemolques_Placa] ON [weighing].[WeighingRemolques] ([Placa]);
        PRINT '✓ Índice IX_WeighingRemolques_Placa creado';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingRemolques_Operation_Numero')
    BEGIN
        CREATE UNIQUE INDEX [IX_WeighingRemolques_Operation_Numero] ON [weighing].[WeighingRemolques] ([WeighingOperationId], [Numero]);
        PRINT '✓ Índice único IX_WeighingRemolques_Operation_Numero creado';
    END
    
    -- Verificar y crear índices adicionales para WeighingOperations
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_CreatedAt')
    BEGIN
        CREATE INDEX [IX_WeighingOperations_CreatedAt] ON [weighing].[WeighingOperations] ([CreatedAt]);
        PRINT '✓ Índice IX_WeighingOperations_CreatedAt creado';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_ClientProvider')
    BEGIN
        CREATE INDEX [IX_WeighingOperations_ClientProvider] ON [weighing].[WeighingOperations] ([ClientProviderName]);
        PRINT '✓ Índice IX_WeighingOperations_ClientProvider creado';
    END
    
    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (2, 'Sincronización completa con Entity Framework Core: Foreign keys, índices adicionales y restricciones', 'manual_migrations.sql');
    
    PRINT '✅ MIGRACIÓN VERSIÓN 2 COMPLETADA EXITOSAMENTE';
    PRINT '   • Foreign keys sincronizadas';
    PRINT '   • Índices adicionales creados';
    PRINT '   • Sistema completamente compatible con EF Core';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'ℹ️  Migración versión 2 ya aplicada - Saltando...';
END

-- =====================================================
-- MIGRACIÓN VERSIÓN 3: CAMPOS DE EDICIÓN MANUAL
-- =====================================================
IF @SchemaVersion < 3
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 3: CAMPOS DE EDICIÓN MANUAL';
    PRINT '==========================================';
    
    -- Agregar campos para rastrear ediciones manuales
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[weighing].[WeighingOperations]') AND name = 'FueEditado')
    BEGIN
        ALTER TABLE [weighing].[WeighingOperations] ADD [FueEditado] BIT NOT NULL DEFAULT 0;
        PRINT '✓ Campo FueEditado agregado a WeighingOperations';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[weighing].[WeighingOperations]') AND name = 'FechaUltimaEdicion')
    BEGIN
        ALTER TABLE [weighing].[WeighingOperations] ADD [FechaUltimaEdicion] DATETIME2 NULL;
        PRINT '✓ Campo FechaUltimaEdicion agregado a WeighingOperations';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[weighing].[WeighingOperations]') AND name = 'UsuarioEditor')
    BEGIN
        ALTER TABLE [weighing].[WeighingOperations] ADD [UsuarioEditor] NVARCHAR(100) NULL;
        PRINT '✓ Campo UsuarioEditor agregado a WeighingOperations';
    END
    
    -- Crear índice para consultas de registros editados
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_FueEditado')
    BEGIN
        CREATE INDEX [IX_WeighingOperations_FueEditado] ON [weighing].[WeighingOperations] ([FueEditado]);
        PRINT '✓ Índice IX_WeighingOperations_FueEditado creado';
    END
    
    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (3, 'Campos de edición manual: FueEditado, FechaUltimaEdicion, UsuarioEditor', 'manual_migrations.sql');
    
    PRINT '✅ MIGRACIÓN VERSIÓN 3 COMPLETADA EXITOSAMENTE';
    PRINT '   • Campo FueEditado para marcar registros editados manualmente';
    PRINT '   • Campo FechaUltimaEdicion para timestamp de última edición';
    PRINT '   • Campo UsuarioEditor para identificar quien editó el registro';
    PRINT '   • Índice para mejorar consultas por estado de edición';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'ℹ️  Migración versión 3 ya aplicada - Saltando...';
END

-- =====================================================
-- PLANTILLA PARA FUTURAS MIGRACIONES
-- =====================================================
/*
-- =====================================================
-- MIGRACIÓN VERSIÓN 4: [DESCRIPCIÓN]
-- =====================================================
IF @SchemaVersion < 4
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 4: [DESCRIPCIÓN]';
    PRINT '==========================================';
    
    -- Aquí van los comandos SQL para la migración
    -- Ejemplo:
    -- ALTER TABLE [weighing].[WeighingOperations] ADD [NuevoCampo] NVARCHAR(50) NULL;
    -- CREATE INDEX [IX_NuevoIndice] ON [weighing].[WeighingOperations] ([NuevoCampo]);
    
    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (4, '[DESCRIPCIÓN DE LA MIGRACIÓN]', 'manual_migrations.sql');
    
    PRINT '✅ MIGRACIÓN VERSIÓN 4 COMPLETADA EXITOSAMENTE';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'ℹ️  Migración versión 4 ya aplicada - Saltando...';
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

-- =====================================================
-- MIGRACIÓN VERSIÓN 4: ÍNDICE PARA BÚSQUEDA DE PRODUCTOS
-- =====================================================
IF @SchemaVersion < 4
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 4: ÍNDICE PARA BÚSQUEDA DE PRODUCTOS';
    PRINT '==========================================';

    -- Crear índice en la columna Product para optimizar búsquedas de autocompletado
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_Product' AND object_id = OBJECT_ID('WeighingOperations'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_WeighingOperations_Product]
        ON [dbo].[WeighingOperations] ([Product])
        WHERE [Product] IS NOT NULL;

        PRINT '✓ Índice IX_WeighingOperations_Product creado exitosamente.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Índice IX_WeighingOperations_Product ya existe.';
    END

    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (4, 'Índice para búsqueda de productos', 'manual_migrations.sql');

    PRINT '✓ Versión 4 aplicada exitosamente.';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'Versión 4 ya aplicada, saltando...';
END

-- =====================================================
-- MIGRACIÓN VERSIÓN 5: ÍNDICE PARA BÚSQUEDA DE CLIENTES/PROVEEDORES
-- =====================================================
IF @SchemaVersion < 5
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 5: ÍNDICE PARA BÚSQUEDA DE CLIENTES/PROVEEDORES';
    PRINT '==========================================';

    -- Crear índice en la columna ClientProviderName para optimizar búsquedas de autocompletado
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_ClientProviderName' AND object_id = OBJECT_ID('WeighingOperations'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_WeighingOperations_ClientProviderName]
        ON [dbo].[WeighingOperations] ([ClientProviderName])
        WHERE [ClientProviderName] IS NOT NULL;

        PRINT '✓ Índice IX_WeighingOperations_ClientProviderName creado exitosamente.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Índice IX_WeighingOperations_ClientProviderName ya existe.';
    END

    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (5, 'Índice para búsqueda de clientes/proveedores', 'manual_migrations.sql');

    PRINT '✓ Versión 5 aplicada exitosamente.';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'Versión 5 ya aplicada, saltando...';
END

-- =====================================================
-- MIGRACIÓN VERSIÓN 6: AGREGAR COLUMNA ExitRegisteredBy
-- =====================================================
IF @SchemaVersion < 6
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 6: AGREGAR COLUMNA ExitRegisteredBy';
    PRINT '==========================================';

    -- Agregar columna ExitRegisteredBy a WeighingOperations
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('WeighingOperations') AND name = 'ExitRegisteredBy')
    BEGIN
        ALTER TABLE [dbo].[WeighingOperations]
        ADD [ExitRegisteredBy] NVARCHAR(255) NULL;

        PRINT '✓ Columna ExitRegisteredBy agregada exitosamente.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Columna ExitRegisteredBy ya existe.';
    END

    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (6, 'Agregar columna ExitRegisteredBy para rastrear usuario que registra salida', 'manual_migrations.sql');

    PRINT '✓ Versión 6 aplicada exitosamente.';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'Versión 6 ya aplicada, saltando...';
END

-- =====================================================
-- MIGRACIÓN VERSIÓN 7: TABLA DE HISTÓRICO DE EDICIONES
-- =====================================================
IF @SchemaVersion < 7
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 7: TABLA DE HISTÓRICO DE EDICIONES';
    PRINT '==========================================';

    -- Crear tabla WeighingEditHistory para almacenar el histórico de ediciones
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingEditHistory')
    BEGIN
        CREATE TABLE [weighing].[WeighingEditHistory] (
            [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
            [WeighingOperationId] UNIQUEIDENTIFIER NOT NULL,
            [Justificacion] NVARCHAR(70) NOT NULL,
            [ValoresOriginales] NVARCHAR(MAX) NOT NULL, -- JSON con los valores antes de editar
            [FechaEdicion] DATETIME2 NOT NULL DEFAULT GETDATE(),
            [UsuarioEditor] NVARCHAR(255) NULL,

            CONSTRAINT [PK_WeighingEditHistory] PRIMARY KEY ([Id]),
            CONSTRAINT [FK_WeighingEditHistory_WeighingOperation]
                FOREIGN KEY ([WeighingOperationId])
                REFERENCES [weighing].[WeighingOperations]([Id])
                ON DELETE CASCADE
        );

        -- Índices para WeighingEditHistory
        CREATE INDEX [IX_WeighingEditHistory_WeighingOperationId]
            ON [weighing].[WeighingEditHistory] ([WeighingOperationId]);
        CREATE INDEX [IX_WeighingEditHistory_FechaEdicion]
            ON [weighing].[WeighingEditHistory] ([FechaEdicion]);

        PRINT '✓ Tabla WeighingEditHistory creada exitosamente.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Tabla WeighingEditHistory ya existe.';
    END

    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (7, 'Crear tabla de histórico de ediciones', 'manual_migrations.sql');

    PRINT '✓ Versión 7 aplicada exitosamente.';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'Versión 7 ya aplicada, saltando...';
END

-- =====================================================
-- MIGRACIÓN VERSIÓN 8: SOPORTE PARA DOBLE REMOLQUE INTERRUMPIBLE
-- =====================================================
IF @SchemaVersion < 8
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 8: DOBLE REMOLQUE INTERRUMPIBLE';
    PRINT '==========================================';

    -- 1. Agregar nuevos campos a WeighingRemolques
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'weighing'
                   AND TABLE_NAME = 'WeighingRemolques'
                   AND COLUMN_NAME = 'RegistradoPor')
    BEGIN
        ALTER TABLE [weighing].[WeighingRemolques]
        ADD [RegistradoPor] NVARCHAR(255) NULL;
        PRINT '✓ Campo RegistradoPor agregado a WeighingRemolques.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Campo RegistradoPor ya existe en WeighingRemolques.';
    END

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'weighing'
                   AND TABLE_NAME = 'WeighingRemolques'
                   AND COLUMN_NAME = 'FechaRegistro')
    BEGIN
        ALTER TABLE [weighing].[WeighingRemolques]
        ADD [FechaRegistro] DATETIME2 NULL;
        PRINT '✓ Campo FechaRegistro agregado a WeighingRemolques.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Campo FechaRegistro ya existe en WeighingRemolques.';
    END

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'weighing'
                   AND TABLE_NAME = 'WeighingRemolques'
                   AND COLUMN_NAME = 'Estado')
    BEGIN
        ALTER TABLE [weighing].[WeighingRemolques]
        ADD [Estado] NVARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CONSTRAINT [CK_WeighingRemolques_Estado] CHECK ([Estado] IN ('PENDIENTE', 'REGISTRADO'));
        PRINT '✓ Campo Estado agregado a WeighingRemolques.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Campo Estado ya existe en WeighingRemolques.';
    END

    -- 2. Actualizar constraint de Status en WeighingOperations para incluir nuevos estados
    IF EXISTS (SELECT * FROM sys.check_constraints
               WHERE name = 'CK_WeighingOperations_Status'
               AND parent_object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
    BEGIN
        ALTER TABLE [weighing].[WeighingOperations]
        DROP CONSTRAINT [CK_WeighingOperations_Status];
        PRINT '✓ Constraint antiguo CK_WeighingOperations_Status eliminado.';
    END

    ALTER TABLE [weighing].[WeighingOperations]
    ADD CONSTRAINT [CK_WeighingOperations_Status] CHECK ([Status] IN (
        'ENTRADA_REGISTRADA',
        'SALIDA_REGISTRADA',
        'ENTRADA_PARCIAL_R1',
        'ENTRADA_COMPLETA',
        'SALIDA_PARCIAL_R1',
        'SALIDA_COMPLETA'
    ));
    PRINT '✓ Constraint CK_WeighingOperations_Status actualizado con nuevos estados.';

    -- 3. Crear índice para búsqueda eficiente de operaciones parciales
    IF NOT EXISTS (SELECT * FROM sys.indexes
                   WHERE name = 'IX_WeighingOperations_Status_TipoUnidad_Parcial'
                   AND object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
    BEGIN
        CREATE INDEX [IX_WeighingOperations_Status_TipoUnidad_Parcial]
        ON [weighing].[WeighingOperations] ([Status], [TipoUnidad])
        WHERE [TipoUnidad] = 'doble-remolque'
          AND [Status] IN ('ENTRADA_PARCIAL_R1', 'SALIDA_PARCIAL_R1');
        PRINT '✓ Índice IX_WeighingOperations_Status_TipoUnidad_Parcial creado.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Índice IX_WeighingOperations_Status_TipoUnidad_Parcial ya existe.';
    END

    -- 4. Crear índice para búsqueda por folio y placa de remolque
    IF NOT EXISTS (SELECT * FROM sys.indexes
                   WHERE name = 'IX_WeighingOperations_Folio_PlacaRemolque1'
                   AND object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
    BEGIN
        CREATE INDEX [IX_WeighingOperations_Folio_PlacaRemolque1]
        ON [weighing].[WeighingOperations] ([Folio], [PlacaRemolque1]);
        PRINT '✓ Índice IX_WeighingOperations_Folio_PlacaRemolque1 creado.';
    END
    ELSE
    BEGIN
        PRINT '⚠ Índice IX_WeighingOperations_Folio_PlacaRemolque1 ya existe.';
    END

    -- 5. Actualizar registros existentes de doble remolque
    -- Migrar estado 'ENTRADA_REGISTRADA' a 'ENTRADA_COMPLETA' para doble remolque ya completados
    UPDATE [weighing].[WeighingOperations]
    SET [Status] = 'ENTRADA_COMPLETA'
    WHERE [TipoUnidad] = 'doble-remolque'
      AND [Status] = 'ENTRADA_REGISTRADA'
      AND [PlacaRemolque1] IS NOT NULL
      AND [PlacaRemolque2] IS NOT NULL;

    DECLARE @UpdatedEntries INT = @@ROWCOUNT;
    PRINT '✓ ' + CAST(@UpdatedEntries AS NVARCHAR(10)) + ' entradas de doble remolque migradas a ENTRADA_COMPLETA.';

    -- Migrar estado 'SALIDA_REGISTRADA' a 'SALIDA_COMPLETA' para doble remolque ya completados
    UPDATE [weighing].[WeighingOperations]
    SET [Status] = 'SALIDA_COMPLETA'
    WHERE [TipoUnidad] = 'doble-remolque'
      AND [Status] = 'SALIDA_REGISTRADA'
      AND [PlacaRemolque1] IS NOT NULL
      AND [PlacaRemolque2] IS NOT NULL;

    DECLARE @UpdatedExits INT = @@ROWCOUNT;
    PRINT '✓ ' + CAST(@UpdatedExits AS NVARCHAR(10)) + ' salidas de doble remolque migradas a SALIDA_COMPLETA.';

    -- Actualizar remolques existentes con estado 'REGISTRADO'
    UPDATE [weighing].[WeighingRemolques]
    SET [Estado] = 'REGISTRADO',
        [FechaRegistro] = [CreatedAt]
    WHERE [Estado] = 'PENDIENTE';

    DECLARE @UpdatedRemolques INT = @@ROWCOUNT;
    PRINT '✓ ' + CAST(@UpdatedRemolques AS NVARCHAR(10)) + ' remolques actualizados a estado REGISTRADO.';

    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (8, 'Soporte para doble remolque interrumpible', 'manual_migrations.sql');

    PRINT '✓ Versión 8 aplicada exitosamente.';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'Versión 8 ya aplicada, saltando...';
END

-- =====================================================
-- MIGRACIÓN VERSIÓN 9: SALIDA EN PARTES (DOBLE REMOLQUE)
-- =====================================================
IF @SchemaVersion < 9
BEGIN
    PRINT '==========================================';
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 9: SALIDA EN PARTES';
    PRINT '==========================================';

    -- 1. FechaSalida en WeighingRemolques (cuándo se registró la salida de ese remolque)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'weighing'
                   AND TABLE_NAME = 'WeighingRemolques'
                   AND COLUMN_NAME = 'FechaSalida')
    BEGIN
        ALTER TABLE [weighing].[WeighingRemolques]
        ADD [FechaSalida] DATETIME2 NULL;
        PRINT '✓ Campo FechaSalida agregado a WeighingRemolques.';
    END
    ELSE
        PRINT '⚠ Campo FechaSalida ya existe en WeighingRemolques.';

    -- 2. RegistradoPorSalida en WeighingRemolques (quién registró la salida de ese remolque)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'weighing'
                   AND TABLE_NAME = 'WeighingRemolques'
                   AND COLUMN_NAME = 'RegistradoPorSalida')
    BEGIN
        ALTER TABLE [weighing].[WeighingRemolques]
        ADD [RegistradoPorSalida] NVARCHAR(255) NULL;
        PRINT '✓ Campo RegistradoPorSalida agregado a WeighingRemolques.';
    END
    ELSE
        PRINT '⚠ Campo RegistradoPorSalida ya existe en WeighingRemolques.';

    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (9, 'Salida en partes (doble remolque): FechaSalida y RegistradoPorSalida en WeighingRemolques', 'manual_migrations.sql');

    PRINT '✓ Versión 9 aplicada exitosamente.';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'Versión 9 ya aplicada, saltando...';
END

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