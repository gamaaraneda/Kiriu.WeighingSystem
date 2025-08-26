-- =====================================================
-- SCRIPT DE REPARACIÓN: CAMPOS DE EDICIÓN MANUAL
-- =====================================================
-- Este script agrega los campos necesarios para el 
-- rastreo de ediciones manuales sin depender del
-- estado previo de la base de datos.
-- =====================================================

USE WeighingSystem;
GO

PRINT '==========================================';
PRINT 'REPARANDO Y AGREGANDO CAMPOS DE EDICIÓN MANUAL';
PRINT '==========================================';

-- 1. Limpiar foreign keys problemáticas si existen
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingPhotos_WeighingOperations')
BEGIN
    ALTER TABLE [weighing].[WeighingPhotos] DROP CONSTRAINT [FK_WeighingPhotos_WeighingOperations];
    PRINT '✓ Foreign key problemática FK_WeighingPhotos_WeighingOperations eliminada';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingRemolques_WeighingOperations')
BEGIN
    ALTER TABLE [weighing].[WeighingRemolques] DROP CONSTRAINT [FK_WeighingRemolques_WeighingOperations];
    PRINT '✓ Foreign key problemática FK_WeighingRemolques_WeighingOperations eliminada';
END

-- 2. Recrear foreign keys con NO ACTION
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingPhotos_WeighingOperations')
BEGIN
    ALTER TABLE [weighing].[WeighingPhotos] 
    ADD CONSTRAINT [FK_WeighingPhotos_WeighingOperations] 
    FOREIGN KEY ([WeighingOperationId]) 
    REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE NO ACTION;
    PRINT '✓ Foreign key FK_WeighingPhotos_WeighingOperations recreada con NO ACTION';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingRemolques_WeighingOperations')
BEGIN
    ALTER TABLE [weighing].[WeighingRemolques] 
    ADD CONSTRAINT [FK_WeighingRemolques_WeighingOperations] 
    FOREIGN KEY ([WeighingOperationId]) 
    REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE NO ACTION;
    PRINT '✓ Foreign key FK_WeighingRemolques_WeighingOperations recreada con NO ACTION';
END

-- 3. Agregar campos para rastrear ediciones manuales
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[weighing].[WeighingOperations]') AND name = 'FueEditado')
BEGIN
    ALTER TABLE [weighing].[WeighingOperations] ADD [FueEditado] BIT NOT NULL DEFAULT 0;
    PRINT '✓ Campo FueEditado agregado a WeighingOperations';
END
ELSE
BEGIN
    PRINT 'ℹ️  Campo FueEditado ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[weighing].[WeighingOperations]') AND name = 'FechaUltimaEdicion')
BEGIN
    ALTER TABLE [weighing].[WeighingOperations] ADD [FechaUltimaEdicion] DATETIME2 NULL;
    PRINT '✓ Campo FechaUltimaEdicion agregado a WeighingOperations';
END
ELSE
BEGIN
    PRINT 'ℹ️  Campo FechaUltimaEdicion ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[weighing].[WeighingOperations]') AND name = 'UsuarioEditor')
BEGIN
    ALTER TABLE [weighing].[WeighingOperations] ADD [UsuarioEditor] NVARCHAR(100) NULL;
    PRINT '✓ Campo UsuarioEditor agregado a WeighingOperations';
END
ELSE
BEGIN
    PRINT 'ℹ️  Campo UsuarioEditor ya existe';
END

-- 4. Crear índice para consultas de registros editados
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_FueEditado')
BEGIN
    CREATE INDEX [IX_WeighingOperations_FueEditado] ON [weighing].[WeighingOperations] ([FueEditado]);
    PRINT '✓ Índice IX_WeighingOperations_FueEditado creado';
END
ELSE
BEGIN
    PRINT 'ℹ️  Índice IX_WeighingOperations_FueEditado ya existe';
END

-- 5. Índices adicionales si no existen
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

-- 6. Actualizar tabla de versiones
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DatabaseVersions')
BEGIN
    -- Actualizar versión 2 como completada
    IF NOT EXISTS (SELECT * FROM [dbo].[DatabaseVersions] WHERE [Version] = 2)
    BEGIN
        INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
        VALUES (2, 'Sincronización con Entity Framework Core (reparada)', 'fix_manual_edit_fields.sql');
    END
    
    -- Agregar versión 3
    IF NOT EXISTS (SELECT * FROM [dbo].[DatabaseVersions] WHERE [Version] = 3)
    BEGIN
        INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
        VALUES (3, 'Campos de edición manual: FueEditado, FechaUltimaEdicion, UsuarioEditor', 'fix_manual_edit_fields.sql');
        PRINT '✓ Versión 3 registrada en DatabaseVersions';
    END
    ELSE
    BEGIN
        PRINT 'ℹ️  Versión 3 ya registrada';
    END
END

PRINT '';
PRINT '✅ REPARACIÓN COMPLETADA EXITOSAMENTE';
PRINT '   • Foreign keys corregidas con NO ACTION';
PRINT '   • Campo FueEditado para marcar registros editados manualmente';
PRINT '   • Campo FechaUltimaEdicion para timestamp de última edición';
PRINT '   • Campo UsuarioEditor para identificar quien editó el registro';
PRINT '   • Índices creados para mejorar consultas';
PRINT '';
PRINT '🚀 La aplicación ya puede funcionar correctamente!';

-- Verificación final
PRINT 'Verificando estructura final:';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'weighing' 
    AND TABLE_NAME = 'WeighingOperations'
    AND COLUMN_NAME IN ('FueEditado', 'FechaUltimaEdicion', 'UsuarioEditor')
ORDER BY COLUMN_NAME;

GO