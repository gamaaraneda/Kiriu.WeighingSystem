-- ======================================================================================
-- Script: Aplicar migración de auditoría al sistema de pesaje
-- Descripción: Script para aplicar la migración de auditoría de forma segura
-- Autor: Sistema de Auditoría
-- Fecha: $(Get-Date -Format "yyyy-MM-dd")
-- ======================================================================================

USE [KiriuWeighingSystem]
GO

PRINT '======================================================================================';
PRINT 'INICIANDO MIGRACIÓN DE SISTEMA DE AUDITORÍA';
PRINT 'Fecha: ' + CAST(GETDATE() AS NVARCHAR(50));
PRINT '======================================================================================';

-- Verificar que estamos en la base de datos correcta
IF DB_NAME() != 'KiriuWeighingSystem'
BEGIN
    PRINT 'ERROR: Este script debe ejecutarse en la base de datos KiriuWeighingSystem'
    RETURN
END

-- Verificar si ya existe el esquema de auditoría
IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit')
BEGIN
    PRINT 'El esquema de auditoría ya existe, verificando tabla...'
END
ELSE
BEGIN
    PRINT 'Creando esquema de auditoría...'
END

-- Ejecutar el script de creación
PRINT 'Aplicando script de creación de tabla AuditLog...'
PRINT 'NOTA: Ejecute manualmente el script create_audit_log_table.sql antes de este script'
GO

-- El script create_audit_log_table.sql debe ejecutarse por separado
-- debido a limitaciones de inclusión de archivos en SQL Server Management Studio

-- Verificar que la migración se aplicó correctamente
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLogs' AND schema_id = SCHEMA_ID('audit'))
BEGIN
    PRINT 'SUCCESS: Tabla AuditLogs creada/verificada exitosamente'
    
    -- Mostrar información de la tabla
    SELECT 
        'audit.AuditLogs' as Tabla,
        COUNT(*) as RegistrosActuales,
        GETDATE() as FechaVerificacion
    FROM [audit].[AuditLogs]
    
    -- Mostrar índices
    PRINT 'Índices disponibles:'
    SELECT 
        i.name AS NombreIndice,
        i.type_desc AS TipoIndice,
        i.is_unique AS EsUnico,
        c.name AS Columna
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID('[audit].[AuditLogs]')
    ORDER BY i.name, ic.key_ordinal
END
ELSE
BEGIN
    PRINT 'ERROR: La tabla AuditLogs no se creó correctamente'
    RETURN
END

-- Verificar permisos del usuario de aplicación (si existe)
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'KiriuWeighingUser')
BEGIN
    PRINT 'Configurando permisos para usuario de aplicación...'
    
    -- Otorgar permisos de SELECT, INSERT en la tabla de auditoría
    GRANT SELECT, INSERT ON [audit].[AuditLogs] TO [KiriuWeighingUser]
    GRANT SELECT ON [audit].[vw_AuditLogsSummary] TO [KiriuWeighingUser]
    
    PRINT 'Permisos otorgados al usuario de aplicación'
END
ELSE
BEGIN
    PRINT 'Nota: No se encontró usuario específico de aplicación, usando permisos por defecto'
END

-- Insertar log de migración exitosa
INSERT INTO [audit].[AuditLogs] (
    [UsuarioId], 
    [NombreUsuario], 
    [Operacion], 
    [Recurso], 
    [Detalles], 
    [MetodoHttp],
    [RutaApi]
)
VALUES (
    'MIGRATION',
    'Sistema de Migración',
    'CREATE',
    'AuditSystem',
    'Sistema de auditoría implementado exitosamente via migración',
    'MIGRATION',
    '/database/migrations/audit'
);

PRINT '======================================================================================';
PRINT 'MIGRACIÓN DE AUDITORÍA COMPLETADA EXITOSAMENTE';
PRINT 'El sistema está ahora configurado para registrar automáticamente:';
PRINT '- Operaciones CREATE (POST)';
PRINT '- Operaciones UPDATE (PUT)';  
PRINT '- Operaciones DELETE (DELETE)';
PRINT 'Solo se registran operaciones exitosas (códigos 200, 201, 202, 204)';
PRINT '';
PRINT 'Para consultar logs de auditoría use:';
PRINT 'SELECT * FROM [audit].[AuditLogs] ORDER BY [Timestamp] DESC';
PRINT 'O la vista resumida:';
PRINT 'SELECT * FROM [audit].[vw_AuditLogsSummary] ORDER BY [Timestamp] DESC';
PRINT '======================================================================================';

-- Mostrar estadísticas finales
SELECT 
    'RESUMEN DE MIGRACIÓN' as Seccion,
    'audit.AuditLogs' as Tabla,
    COUNT(*) as RegistrosTotales,
    MIN([Timestamp]) as PrimerRegistro,
    MAX([Timestamp]) as UltimoRegistro
FROM [audit].[AuditLogs]

PRINT 'Migración completada: ' + CAST(GETDATE() AS NVARCHAR(50));
GO