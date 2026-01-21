-- =============================================
-- Script de Migración: Control de Sesiones Concurrentes
-- Descripción: Crea la tabla UserSessions para controlar
--              que un usuario solo pueda tener una sesión activa a la vez.
-- Autor: Sistema
-- Fecha: 2026-01-21
-- =============================================

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[defutlt].[UserSessions]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla [defutlt].[UserSessions]...';
    
    CREATE TABLE [defutlt].[UserSessions] (
        [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [TokenJti] NVARCHAR(100) NOT NULL,
        [RefreshToken] NVARCHAR(500) NOT NULL,
        [DeviceInfo] NVARCHAR(500) NULL,
        [IpAddress] NVARCHAR(45) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETUTCDATE(),
        [ExpiresAt] DATETIME NOT NULL,
        [RevokedAt] DATETIME NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [RevocationReason] NVARCHAR(200) NULL,
        
        CONSTRAINT [PK_UserSessions] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_UserSessions_Usuarios] FOREIGN KEY ([UserId]) 
            REFERENCES [defutlt].[Usuarios]([Id]) ON DELETE CASCADE
    );
    
    PRINT 'Tabla [defutlt].[UserSessions] creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla [defutlt].[UserSessions] ya existe.';
END
GO

-- Crear índices para optimizar consultas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserSessions_UserId' AND object_id = OBJECT_ID('[defutlt].[UserSessions]'))
BEGIN
    PRINT 'Creando índice IX_UserSessions_UserId...';
    CREATE NONCLUSTERED INDEX [IX_UserSessions_UserId] 
        ON [defutlt].[UserSessions]([UserId] ASC);
    PRINT 'Índice IX_UserSessions_UserId creado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserSessions_TokenJti' AND object_id = OBJECT_ID('[defutlt].[UserSessions]'))
BEGIN
    PRINT 'Creando índice IX_UserSessions_TokenJti...';
    CREATE NONCLUSTERED INDEX [IX_UserSessions_TokenJti] 
        ON [defutlt].[UserSessions]([TokenJti] ASC);
    PRINT 'Índice IX_UserSessions_TokenJti creado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserSessions_RefreshToken' AND object_id = OBJECT_ID('[defutlt].[UserSessions]'))
BEGIN
    PRINT 'Creando índice IX_UserSessions_RefreshToken...';
    CREATE NONCLUSTERED INDEX [IX_UserSessions_RefreshToken] 
        ON [defutlt].[UserSessions]([RefreshToken] ASC);
    PRINT 'Índice IX_UserSessions_RefreshToken creado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserSessions_UserId_IsActive' AND object_id = OBJECT_ID('[defutlt].[UserSessions]'))
BEGIN
    PRINT 'Creando índice IX_UserSessions_UserId_IsActive...';
    CREATE NONCLUSTERED INDEX [IX_UserSessions_UserId_IsActive] 
        ON [defutlt].[UserSessions]([UserId] ASC, [IsActive] ASC)
        WHERE [IsActive] = 1;
    PRINT 'Índice IX_UserSessions_UserId_IsActive creado.';
END
GO

-- Verificar la estructura creada
PRINT '';
PRINT '=== VERIFICACIÓN DE LA MIGRACIÓN ===';
PRINT '';

SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable,
    CASE WHEN pk.column_id IS NOT NULL THEN 'YES' ELSE 'NO' END AS IsPrimaryKey
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN (
    SELECT ic.column_id, ic.object_id
    FROM sys.index_columns ic
    INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    WHERE i.is_primary_key = 1
) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
WHERE c.object_id = OBJECT_ID('[defutlt].[UserSessions]')
ORDER BY c.column_id;

PRINT '';
PRINT '=== ÍNDICES CREADOS ===';
PRINT '';

SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('[defutlt].[UserSessions]')
AND i.name IS NOT NULL;

PRINT '';
PRINT '=== MIGRACIÓN COMPLETADA ===';
PRINT 'La tabla UserSessions ha sido creada para el control de sesiones concurrentes.';
PRINT 'Solo se permitirá una sesión activa por usuario.';
GO
