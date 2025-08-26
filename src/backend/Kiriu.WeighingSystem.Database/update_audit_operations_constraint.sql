-- ======================================================================================
-- Script: Actualizar constraint de operaciones de auditoría
-- Descripción: Agregar LOGIN y LOGOUT como operaciones válidas en la tabla AuditLogs
-- Versión: 1.1
-- Fecha: $(Get-Date -Format "yyyy-MM-dd")
-- ======================================================================================

PRINT 'Iniciando actualización de constraint CK_AuditLogs_Operacion...'
GO

-- Verificar si el constraint existe
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AuditLogs_Operacion')
BEGIN
    PRINT 'Constraint CK_AuditLogs_Operacion encontrado - eliminando...'
    
    -- Eliminar constraint existente
    ALTER TABLE [audit].[AuditLogs]
    DROP CONSTRAINT [CK_AuditLogs_Operacion];
    
    PRINT 'Constraint anterior eliminado exitosamente'
END
ELSE
BEGIN
    PRINT 'Constraint CK_AuditLogs_Operacion no existe - creando nuevo...'
END
GO

-- Crear nuevo constraint con LOGIN y LOGOUT incluidos
ALTER TABLE [audit].[AuditLogs]
ADD CONSTRAINT [CK_AuditLogs_Operacion] 
CHECK ([Operacion] IN ('CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT'));

PRINT 'Nuevo constraint CK_AuditLogs_Operacion creado con operaciones:'
PRINT '- CREATE (operaciones POST)'
PRINT '- UPDATE (operaciones PUT)'  
PRINT '- DELETE (operaciones DELETE)'
PRINT '- READ (operaciones GET - opcional)'
PRINT '- LOGIN (autenticación exitosa)'
PRINT '- LOGOUT (cierre de sesión)'
GO

-- Verificar que el constraint se creó correctamente
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AuditLogs_Operacion')
BEGIN
    PRINT '✅ Constraint actualizado exitosamente'
    
    -- Mostrar definición del constraint
    SELECT 
        cc.name AS ConstraintName,
        cc.definition AS ConstraintDefinition,
        t.name AS TableName,
        s.name AS SchemaName
    FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE cc.name = 'CK_AuditLogs_Operacion'
END
ELSE
BEGIN
    PRINT '❌ Error: Constraint no se creó correctamente'
END
GO

-- Insertar registro de auditoría de esta migración
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
    'SYSTEM',
    'Sistema Automático',
    'UPDATE',
    'AuditLog',
    'Constraint de operaciones actualizado - agregadas LOGIN y LOGOUT',
    'MIGRATION',
    '/database/migrations/audit-constraint-update'
);

PRINT 'Registro de auditoría de la migración insertado'
GO

PRINT '======================================================================================';
PRINT 'ACTUALIZACIÓN DE CONSTRAINT COMPLETADA EXITOSAMENTE';
PRINT 'El sistema ahora puede registrar operaciones de LOGIN y LOGOUT';
PRINT '======================================================================================';
GO
