-- ======================================================================================
-- Script: Creación de tabla AuditLog para sistema de auditoría
-- Descripción: Crea la tabla para registrar todas las operaciones exitosas del sistema
-- Versión: 1.0
-- Fecha: $(Get-Date -Format "yyyy-MM-dd")
-- ======================================================================================

-- Crear esquema de auditoría si no existe
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit')
BEGIN
    EXEC('CREATE SCHEMA audit')
    PRINT 'Esquema [audit] creado exitosamente'
END
GO

-- Crear tabla AuditLogs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLogs' AND schema_id = SCHEMA_ID('audit'))
BEGIN
    CREATE TABLE [audit].[AuditLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UsuarioId] NVARCHAR(100) NOT NULL,
        [NombreUsuario] NVARCHAR(200) NULL,
        [Operacion] NVARCHAR(10) NOT NULL,
        [Recurso] NVARCHAR(100) NOT NULL,
        [RegistroId] NVARCHAR(50) NULL,
        [Timestamp] DATETIME2(7) NOT NULL CONSTRAINT [DF_AuditLogs_Timestamp] DEFAULT (GETUTCDATE()),
        [Payload] NVARCHAR(MAX) NULL,
        [IpOrigen] NVARCHAR(45) NULL,
        [Resultado] NVARCHAR(20) NOT NULL CONSTRAINT [DF_AuditLogs_Resultado] DEFAULT ('success'),
        [Detalles] NVARCHAR(500) NULL,
        [MetodoHttp] NVARCHAR(10) NULL,
        [RutaApi] NVARCHAR(200) NULL,
        
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    PRINT 'Tabla [audit].[AuditLogs] creada exitosamente'
END
ELSE
BEGIN
    PRINT 'Tabla [audit].[AuditLogs] ya existe'
END
GO

-- Crear índices para optimizar consultas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_UsuarioId' AND object_id = OBJECT_ID('[audit].[AuditLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_UsuarioId] ON [audit].[AuditLogs] ([UsuarioId] ASC);
    PRINT 'Índice IX_AuditLogs_UsuarioId creado'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_Recurso' AND object_id = OBJECT_ID('[audit].[AuditLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Recurso] ON [audit].[AuditLogs] ([Recurso] ASC);
    PRINT 'Índice IX_AuditLogs_Recurso creado'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_Operacion' AND object_id = OBJECT_ID('[audit].[AuditLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Operacion] ON [audit].[AuditLogs] ([Operacion] ASC);
    PRINT 'Índice IX_AuditLogs_Operacion creado'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_Timestamp' AND object_id = OBJECT_ID('[audit].[AuditLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Timestamp] ON [audit].[AuditLogs] ([Timestamp] DESC);
    PRINT 'Índice IX_AuditLogs_Timestamp creado'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_Usuario_Timestamp' AND object_id = OBJECT_ID('[audit].[AuditLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Usuario_Timestamp] ON [audit].[AuditLogs] ([UsuarioId] ASC, [Timestamp] DESC);
    PRINT 'Índice compuesto IX_AuditLogs_Usuario_Timestamp creado'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_Recurso_Timestamp' AND object_id = OBJECT_ID('[audit].[AuditLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Recurso_Timestamp] ON [audit].[AuditLogs] ([Recurso] ASC, [Timestamp] DESC);
    PRINT 'Índice compuesto IX_AuditLogs_Recurso_Timestamp creado'
END
GO

-- Agregar constrains adicionales
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AuditLogs_Operacion')
BEGIN
    ALTER TABLE [audit].[AuditLogs]
    ADD CONSTRAINT [CK_AuditLogs_Operacion] CHECK ([Operacion] IN ('CREATE', 'UPDATE', 'DELETE', 'READ'));
    PRINT 'Constraint CK_AuditLogs_Operacion creado'
END
GO

-- Crear vista para facilitar consultas comunes
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_AuditLogsSummary' AND schema_id = SCHEMA_ID('audit'))
BEGIN
    DROP VIEW [audit].[vw_AuditLogsSummary]
    PRINT 'Vista [audit].[vw_AuditLogsSummary] eliminada para recrear'
END
GO

CREATE VIEW [audit].[vw_AuditLogsSummary] AS
SELECT 
    [Id],
    [UsuarioId],
    [NombreUsuario],
    [Operacion],
    [Recurso],
    [RegistroId],
    [Timestamp],
    [IpOrigen],
    [Detalles],
    [MetodoHttp],
    [RutaApi],
    -- Campos calculados
    CAST([Timestamp] AS DATE) as [Fecha],
    DATEPART(HOUR, [Timestamp]) as [Hora],
    LEN([Payload]) as [PayloadSize],
    CASE 
        WHEN [Payload] IS NULL THEN 'Sin datos'
        WHEN LEN([Payload]) > 1000 THEN 'Datos extensos'
        ELSE 'Datos normales'
    END as [PayloadStatus]
FROM [audit].[AuditLogs]
GO

PRINT 'Vista [audit].[vw_AuditLogsSummary] creada exitosamente'
GO

-- Insertar registro de auditoría para la creación de esta tabla
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
    'CREATE',
    'AuditLog',
    'Tabla de auditoría creada e inicializada',
    'MIGRATION',
    '/database/migrations'
);

PRINT 'Registro inicial de auditoría insertado'
GO

-- Mostrar estadísticas de la nueva tabla
SELECT 
    'audit' as Esquema,
    'AuditLogs' as Tabla,
    COUNT(*) as [Registros Iniciales],
    GETUTCDATE() as [Fecha Creación]
FROM [audit].[AuditLogs];

PRINT '======================================================================================';
PRINT 'Script de creación de tabla AuditLog ejecutado exitosamente';
PRINT 'La tabla está lista para recibir logs de auditoría del sistema';
PRINT '======================================================================================';