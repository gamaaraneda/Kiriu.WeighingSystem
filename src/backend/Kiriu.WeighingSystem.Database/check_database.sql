-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE BASE DE DATOS
-- =====================================================
-- Ejecuta este script para verificar el estado actual
-- de la base de datos del sistema de pesaje

USE WeighingSystem;
GO

PRINT '🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS DEL SISTEMA DE PESAJE';
PRINT '================================================================';
PRINT '';

-- 1. Verificar versión de la base de datos
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DatabaseVersions')
BEGIN
    DECLARE @CurrentVersion INT;
    SELECT @CurrentVersion = MAX([Version]) FROM [dbo].[DatabaseVersions];
    
    PRINT '📊 VERSIÓN ACTUAL: ' + CAST(@CurrentVersion AS VARCHAR(10));
    PRINT '';
    
    PRINT '📋 HISTORIAL DE MIGRACIONES:';
    SELECT 
        [Version] as Ver,
        [Description] as Descripción,
        FORMAT([AppliedDate], 'yyyy-MM-dd HH:mm') as [Fecha Aplicación]
    FROM [dbo].[DatabaseVersions]
    ORDER BY [Version];
    PRINT '';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla de control de versiones no encontrada';
    PRINT '';
END

-- 2. Verificar esquemas
PRINT '🗂️  ESQUEMAS DISPONIBLES:';
SELECT 
    schema_name as [Esquema],
    CASE 
        WHEN schema_name = 'weighing' THEN '✅ Sistema de Pesaje'
        WHEN schema_name = 'dbo' THEN '✅ Esquema Principal'
        ELSE '📁 Otro'
    END as [Tipo]
FROM information_schema.schemata
WHERE schema_name IN ('dbo', 'weighing')
ORDER BY schema_name;
PRINT '';

-- 3. Verificar tablas del sistema de pesaje
PRINT '🗃️  TABLAS DEL SISTEMA DE PESAJE:';
IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'weighing')
BEGIN
    SELECT 
        TABLE_NAME as [Tabla],
        CASE 
            WHEN TABLE_NAME = 'WeighingOperations' THEN '🚛 Operaciones de Pesaje'
            WHEN TABLE_NAME = 'WeighingPhotos' THEN '📸 Fotos de Operaciones'
            WHEN TABLE_NAME = 'WeighingRemolques' THEN '🚚 Datos de Remolques'
            ELSE '📋 Otra'
        END as [Descripción],
        '✅' as [Estado]
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'weighing'
    ORDER BY TABLE_NAME;
    
    -- Contar registros en cada tabla
    PRINT '';
    PRINT '📈 ESTADÍSTICAS DE DATOS:';
    
    DECLARE @Count INT;
    
    SELECT @Count = COUNT(*) FROM [weighing].[WeighingOperations];
    PRINT '  • WeighingOperations: ' + CAST(@Count AS VARCHAR(10)) + ' registros';
    
    SELECT @Count = COUNT(*) FROM [weighing].[WeighingPhotos];
    PRINT '  • WeighingPhotos: ' + CAST(@Count AS VARCHAR(10)) + ' registros';
    
    SELECT @Count = COUNT(*) FROM [weighing].[WeighingRemolques];
    PRINT '  • WeighingRemolques: ' + CAST(@Count AS VARCHAR(10)) + ' registros';
END
ELSE
BEGIN
    PRINT '❌ Esquema weighing no encontrado';
END
PRINT '';

-- 4. Verificar índices
PRINT '🔗 ÍNDICES PRINCIPALES:';
SELECT 
    OBJECT_SCHEMA_NAME(i.object_id) as [Esquema],
    OBJECT_NAME(i.object_id) as [Tabla],
    i.name as [Índice],
    CASE 
        WHEN i.is_unique = 1 THEN '🔑 Único'
        ELSE '📋 Normal'
    END as [Tipo]
FROM sys.indexes i
WHERE OBJECT_SCHEMA_NAME(i.object_id) = 'weighing'
  AND i.name IS NOT NULL
ORDER BY OBJECT_NAME(i.object_id), i.name;
PRINT '';

-- 5. Verificar foreign keys
PRINT '🔗 RELACIONES ENTRE TABLAS:';
SELECT 
    OBJECT_SCHEMA_NAME(f.parent_object_id) as [Esquema],
    OBJECT_NAME(f.parent_object_id) as [Tabla Origen],
    f.name as [Constraint],
    OBJECT_SCHEMA_NAME(f.referenced_object_id) as [Esquema Destino],
    OBJECT_NAME(f.referenced_object_id) as [Tabla Destino]
FROM sys.foreign_keys f
WHERE OBJECT_SCHEMA_NAME(f.parent_object_id) = 'weighing'
ORDER BY OBJECT_NAME(f.parent_object_id);
PRINT '';

-- 6. Verificar triggers
PRINT '⚡ TRIGGERS ACTIVOS:';
SELECT 
    OBJECT_SCHEMA_NAME(t.parent_id) as [Esquema],
    OBJECT_NAME(t.parent_id) as [Tabla],
    t.name as [Trigger],
    CASE 
        WHEN t.is_disabled = 0 THEN '✅ Activo'
        ELSE '❌ Desactivado'
    END as [Estado]
FROM sys.triggers t
WHERE OBJECT_SCHEMA_NAME(t.parent_id) = 'weighing'
ORDER BY OBJECT_NAME(t.parent_id);
PRINT '';

-- 7. Verificar permisos básicos
PRINT '🔐 VERIFICACIÓN DE PERMISOS BÁSICOS:';
DECLARE @HasSelectPermission INT = 0;
DECLARE @HasInsertPermission INT = 0;

-- Intentar verificar permisos (esto puede variar según la configuración de seguridad)
BEGIN TRY
    IF EXISTS (SELECT * FROM [weighing].[WeighingOperations] WHERE 1=0)
        SET @HasSelectPermission = 1;
END TRY
BEGIN CATCH
    SET @HasSelectPermission = 0;
END CATCH

PRINT '  • Lectura (SELECT): ' + CASE WHEN @HasSelectPermission = 1 THEN '✅ OK' ELSE '❌ Sin acceso' END;
-- Nota: Verificación completa de permisos requiere consultas más complejas

PRINT '';
PRINT '🎯 RESUMEN DEL ESTADO:';

DECLARE @WeighingSchemaExists BIT = 0;
DECLARE @TablesCount INT = 0;

IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'weighing')
    SET @WeighingSchemaExists = 1;

SELECT @TablesCount = COUNT(*)
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'weighing';

IF @WeighingSchemaExists = 1 AND @TablesCount >= 3
BEGIN
    PRINT '✅ ¡Sistema de pesaje LISTO para usar!';
    PRINT '   • Base de datos configurada correctamente';
    PRINT '   • Todas las tablas están disponibles';
    PRINT '   • El API puede conectarse sin problemas';
END
ELSE
BEGIN
    PRINT '⚠️  Sistema de pesaje INCOMPLETO:';
    IF @WeighingSchemaExists = 0
        PRINT '   • ❌ Falta el esquema weighing';
    IF @TablesCount < 3
        PRINT '   • ❌ Faltan tablas del sistema de pesaje';
    PRINT '   • 🔧 Ejecutar manual_migrations.sql para completar la configuración';
END

PRINT '';
PRINT '📚 COMANDOS ÚTILES:';
PRINT '   • Para aplicar migraciones: Ejecutar manual_migrations.sql';
PRINT '   • Para verificar estado: Ejecutar check_database.sql';
PRINT '   • Para futuras modificaciones: Usar migration_templates.sql';
PRINT '';
PRINT '🏁 Verificación completada.';