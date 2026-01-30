-- =====================================================
-- Añadir FechaSalida y RegistradoPorSalida a WeighingRemolques
-- (requerido para salida en partes de doble remolque)
-- Ejecutar contra la base de datos WeighingSystem.
-- =====================================================

USE WeighingSystem;
GO

-- FechaSalida
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

-- RegistradoPorSalida
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

-- Registrar versión 9 si no está (para que manual_migrations.sql no vuelva a intentar añadir)
IF NOT EXISTS (SELECT 1 FROM [dbo].[DatabaseVersions] WHERE [Version] = 9)
BEGIN
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (9, 'Salida en partes (doble remolque): FechaSalida y RegistradoPorSalida en WeighingRemolques', 'add_fechasalida_registradoporsalida.sql');
    PRINT '✓ Versión 9 registrada en DatabaseVersions.';
END

PRINT 'Listo.';
GO
