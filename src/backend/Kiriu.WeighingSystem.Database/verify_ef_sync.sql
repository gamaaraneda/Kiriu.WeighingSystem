-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE SINCRONIZACIÓN CON ENTITY FRAMEWORK
-- =====================================================
-- Este script verifica que las tablas del sistema de pesaje
-- estén completamente sincronizadas con el modelo de EF Core

USE WeighingSystem;
GO

PRINT '🔍 VERIFICANDO SINCRONIZACIÓN CON ENTITY FRAMEWORK CORE';
PRINT '========================================================';
PRINT '';

-- 1. Verificar versión de la base de datos
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DatabaseVersions')
BEGIN
    DECLARE @CurrentVersion INT;
    SELECT @CurrentVersion = MAX([Version]) FROM [dbo].[DatabaseVersions];
    
    PRINT '📊 VERSIÓN ACTUAL: ' + CAST(@CurrentVersion AS VARCHAR(10));
    
    IF @CurrentVersion >= 2
        PRINT '✅ Migración de sincronización con EF Core aplicada';
    ELSE
        PRINT '⚠️  Migración de sincronización con EF Core pendiente';
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Tabla de control de versiones no encontrada';
    PRINT '';
END

-- 2. Verificar estructura de tablas principales
PRINT '🗃️  VERIFICACIÓN DE ESTRUCTURA DE TABLAS:';
PRINT '';

-- WeighingOperations
PRINT '📋 TABLA WeighingOperations:';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations')
BEGIN
    PRINT '  ✅ Tabla existe';
    
    -- Verificar columnas principales
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations' AND COLUMN_NAME = 'Id')
        PRINT '  ✅ Columna Id existe';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations' AND COLUMN_NAME = 'Folio')
        PRINT '  ✅ Columna Folio existe';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations' AND COLUMN_NAME = 'Status')
        PRINT '  ✅ Columna Status existe';
    
    -- Verificar índices
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_Folio')
        PRINT '  ✅ Índice único en Folio existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_Status')
        PRINT '  ✅ Índice en Status existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_TrailerPlate')
        PRINT '  ✅ Índice en TrailerPlate existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_CreatedAt')
        PRINT '  ✅ Índice en CreatedAt existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_ClientProvider')
        PRINT '  ✅ Índice en ClientProviderName existe';
END
ELSE
BEGIN
    PRINT '  ❌ Tabla no existe';
END
PRINT '';

-- WeighingPhotos
PRINT '📸 TABLA WeighingPhotos:';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingPhotos')
BEGIN
    PRINT '  ✅ Tabla existe';
    
    -- Verificar columnas principales
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingPhotos' AND COLUMN_NAME = 'WeighingOperationId')
        PRINT '  ✅ Columna WeighingOperationId existe';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingPhotos' AND COLUMN_NAME = 'PhotoType')
        PRINT '  ✅ Columna PhotoType existe';
    
    -- Verificar índices
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingPhotos_WeighingOperationId')
        PRINT '  ✅ Índice en WeighingOperationId existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingPhotos_PhotoType')
        PRINT '  ✅ Índice en PhotoType existe';
END
ELSE
BEGIN
    PRINT '  ❌ Tabla no existe';
END
PRINT '';

-- WeighingRemolques
PRINT '🚚 TABLA WeighingRemolques:';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques')
BEGIN
    PRINT '  ✅ Tabla existe';
    
    -- Verificar columnas principales
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques' AND COLUMN_NAME = 'WeighingOperationId')
        PRINT '  ✅ Columna WeighingOperationId existe';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques' AND COLUMN_NAME = 'Numero')
        PRINT '  ✅ Columna Numero existe';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques' AND COLUMN_NAME = 'Placa')
        PRINT '  ✅ Columna Placa existe';
    
    -- Verificar índices
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingRemolques_WeighingOperationId')
        PRINT '  ✅ Índice en WeighingOperationId existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingRemolques_Placa')
        PRINT '  ✅ Índice en Placa existe';
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingRemolques_Operation_Numero')
        PRINT '  ✅ Índice único en (WeighingOperationId, Numero) existe';
END
ELSE
BEGIN
    PRINT '  ❌ Tabla no existe';
END
PRINT '';

-- 3. Verificar foreign keys
PRINT '🔗 VERIFICACIÓN DE FOREIGN KEYS:';
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingPhotos_WeighingOperations')
    PRINT '  ✅ FK_WeighingPhotos_WeighingOperations existe';
ELSE
    PRINT '  ❌ FK_WeighingPhotos_WeighingOperations no existe';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingRemolques_WeighingOperations')
    PRINT '  ✅ FK_WeighingRemolques_WeighingOperations existe';
ELSE
    PRINT '  ❌ FK_WeighingRemolques_WeighingOperations no existe';
PRINT '';

-- 4. Verificar triggers
PRINT '⚡ VERIFICACIÓN DE TRIGGERS:';
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_WeighingOperations_UpdatedAt')
    PRINT '  ✅ Trigger TR_WeighingOperations_UpdatedAt existe';
ELSE
    PRINT '  ❌ Trigger TR_WeighingOperations_UpdatedAt no existe';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_WeighingRemolques_UpdatedAt')
    PRINT '  ✅ Trigger TR_WeighingRemolques_UpdatedAt existe';
ELSE
    PRINT '  ❌ Trigger TR_WeighingRemolques_UpdatedAt no existe';
PRINT '';

-- 5. Verificar restricciones de datos
PRINT '🔒 VERIFICACIÓN DE RESTRICCIONES:';
DECLARE @ConstraintsCount INT = 0;

SELECT @ConstraintsCount = COUNT(*) 
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = 'weighing';

PRINT '  📊 Total de restricciones CHECK: ' + CAST(@ConstraintsCount AS VARCHAR(10));

-- Verificar restricciones específicas
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'weighing' AND CONSTRAINT_NAME = 'CK_WeighingOperations_UnitType')
    PRINT '  ✅ Restricción CK_WeighingOperations_UnitType existe';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'weighing' AND CONSTRAINT_NAME = 'CK_WeighingOperations_OperationType')
    PRINT '  ✅ Restricción CK_WeighingOperations_OperationType existe';
PRINT '';

-- 6. Resumen de compatibilidad con EF Core
PRINT '🎯 RESUMEN DE COMPATIBILIDAD CON ENTITY FRAMEWORK CORE:';
PRINT '';

DECLARE @EFCompatibilityScore INT = 0;
DECLARE @TotalChecks INT = 0;

-- Verificar tablas principales
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingOperations')
    SET @EFCompatibilityScore = @EFCompatibilityScore + 1;
SET @TotalChecks = @TotalChecks + 1;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingPhotos')
    SET @EFCompatibilityScore = @EFCompatibilityScore + 1;
SET @TotalChecks = @TotalChecks + 1;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'WeighingRemolques')
    SET @EFCompatibilityScore = @EFCompatibilityScore + 1;
SET @TotalChecks = @TotalChecks + 1;

-- Verificar foreign keys
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingPhotos_WeighingOperations')
    SET @EFCompatibilityScore = @EFCompatibilityScore + 1;
SET @TotalChecks = @TotalChecks + 1;

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WeighingRemolques_WeighingOperations')
    SET @EFCompatibilityScore = @EFCompatibilityScore + 1;
SET @TotalChecks = @TotalChecks + 1;

-- Verificar índices principales
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WeighingOperations_Folio')
    SET @EFCompatibilityScore = @EFCompatibilityScore + 1;
SET @TotalChecks = @TotalChecks + 1;

DECLARE @CompatibilityPercentage DECIMAL(5,2) = (@EFCompatibilityScore * 100.0) / @TotalChecks;

PRINT '  📊 Puntuación de compatibilidad: ' + CAST(@EFCompatibilityScore AS VARCHAR(10)) + '/' + CAST(@TotalChecks AS VARCHAR(10));
PRINT '  📈 Porcentaje de compatibilidad: ' + CAST(@CompatibilityPercentage AS VARCHAR(10)) + '%';

IF @CompatibilityPercentage >= 90
BEGIN
    PRINT '  🎉 ¡EXCELENTE! Sistema completamente compatible con EF Core';
    PRINT '  ✅ Todas las tablas están sincronizadas';
    PRINT '  ✅ Las relaciones están correctamente definidas';
    PRINT '  ✅ Los índices están optimizados';
END
ELSE IF @CompatibilityPercentage >= 70
BEGIN
    PRINT '  ✅ BUENO - Sistema mayormente compatible con EF Core';
    PRINT '  ⚠️  Algunas características pueden necesitar ajustes';
END
ELSE
BEGIN
    PRINT '  ❌ ATENCIÓN - Sistema necesita sincronización con EF Core';
    PRINT '  🔧 Ejecutar manual_migrations.sql para completar la configuración';
END

PRINT '';
PRINT '📚 PRÓXIMOS PASOS:';
IF @CompatibilityPercentage < 90
BEGIN
    PRINT '  1. 🔧 Ejecutar manual_migrations.sql para aplicar migración versión 2';
    PRINT '  2. 🔍 Ejecutar este script nuevamente para verificar';
    PRINT '  3. 🚀 Probar conexión desde la aplicación';
END
ELSE
BEGIN
    PRINT '  1. 🎯 Sistema listo para usar con EF Core';
    PRINT '  2. 🚀 Puedes ejecutar la aplicación sin problemas';
    PRINT '  3. 📝 Para futuras modificaciones, usar migraciones de EF Core';
END

PRINT '';
PRINT '🏁 Verificación de sincronización completada.';
GO
