-- ============================================================================
-- Script para agregar el permiso REPORTES.EDIT al sistema
-- ============================================================================
-- Este permiso permite editar pesos en registros de pesaje ya completados
-- Solo se pueden editar: Peso de Entrada y Peso de Salida
-- NO se pueden editar: Cliente, Producto, Fotos
-- Fecha: 2025-10-15
-- ============================================================================

USE WeighingSystem;
GO

PRINT '🔐 AGREGANDO PERMISO REPORTES.EDIT AL SISTEMA';
PRINT '================================================';
PRINT '';

-- ============================================================================
-- PASO 1: Crear el permiso REPORTES.EDIT
-- ============================================================================
DECLARE @PermisoId UNIQUEIDENTIFIER;

IF NOT EXISTS (SELECT 1 FROM Permisos WHERE Nombre = 'REPORTES.EDIT')
BEGIN
    SET @PermisoId = NEWID();

    INSERT INTO Permisos (Id, Nombre, Descripcion, Tipo, FechaCreacion, Activo)
    VALUES (
        @PermisoId,
        'REPORTES.EDIT',
        'Permite editar pesos de entrada y salida en registros de pesaje completados',
        'REPORTES',
        GETDATE(),
        1
    );

    PRINT '✅ Permiso REPORTES.EDIT creado exitosamente';
    PRINT '   ID: ' + CAST(@PermisoId AS NVARCHAR(50));
END
ELSE
BEGIN
    SELECT @PermisoId = Id FROM Permisos WHERE Nombre = 'REPORTES.EDIT';
    PRINT 'ℹ️  El permiso REPORTES.EDIT ya existe';
    PRINT '   ID: ' + CAST(@PermisoId AS NVARCHAR(50));
END
GO

PRINT '';
PRINT '================================================';
PRINT '';

-- ============================================================================
-- PASO 2: Asignar el permiso al rol Administrador (si existe)
-- ============================================================================
DECLARE @AdminRolId UNIQUEIDENTIFIER;
DECLARE @PermisoEditId UNIQUEIDENTIFIER;

-- Buscar el rol Administrador
SELECT @AdminRolId = Id FROM Roles WHERE Nombre = 'Administrador' OR Nombre = 'ADMIN' OR Nombre = 'Admin';
SELECT @PermisoEditId = Id FROM Permisos WHERE Nombre = 'REPORTES.EDIT';

IF @AdminRolId IS NOT NULL AND @PermisoEditId IS NOT NULL
BEGIN
    -- Verificar si ya está asignado
    IF NOT EXISTS (SELECT 1 FROM RolPermisos WHERE RolId = @AdminRolId AND PermisoId = @PermisoEditId)
    BEGIN
        INSERT INTO RolPermisos (RolId, PermisoId)
        VALUES (@AdminRolId, @PermisoEditId);

        PRINT '✅ Permiso REPORTES.EDIT asignado al rol Administrador';
    END
    ELSE
    BEGIN
        PRINT 'ℹ️  El permiso REPORTES.EDIT ya está asignado al rol Administrador';
    END
END
ELSE
BEGIN
    IF @AdminRolId IS NULL
        PRINT '⚠️  Rol Administrador no encontrado. Asigna el permiso manualmente desde la interfaz.';
    IF @PermisoEditId IS NULL
        PRINT '❌ Error: No se pudo crear el permiso REPORTES.EDIT';
END
GO

PRINT '';
PRINT '================================================';
PRINT '📊 RESUMEN DE CONFIGURACIÓN';
PRINT '================================================';
PRINT '';

-- ============================================================================
-- PASO 3: Mostrar resumen
-- ============================================================================

-- Mostrar el permiso creado
PRINT '🔐 Permiso creado:';
SELECT
    Nombre as [Nombre del Permiso],
    Descripcion as [Descripción],
    Tipo as [Módulo],
    CASE WHEN Activo = 1 THEN 'Sí' ELSE 'No' END as [Activo],
    FORMAT(FechaCreacion, 'dd/MM/yyyy HH:mm') as [Fecha de Creación]
FROM Permisos
WHERE Nombre = 'REPORTES.EDIT';

PRINT '';
PRINT '👥 Roles con acceso al permiso:';

-- Mostrar roles que tienen el permiso
SELECT
    r.Nombre as [Rol],
    r.Descripcion as [Descripción del Rol],
    CASE WHEN r.Activo = 1 THEN 'Sí' ELSE 'No' END as [Activo]
FROM Roles r
INNER JOIN RolPermisos rp ON r.Id = rp.RolId
INNER JOIN Permisos p ON rp.PermisoId = p.Id
WHERE p.Nombre = 'REPORTES.EDIT';

PRINT '';
PRINT '================================================';
PRINT '✅ CONFIGURACIÓN COMPLETADA';
PRINT '================================================';
PRINT '';
PRINT '📋 INSTRUCCIONES SIGUIENTES:';
PRINT '1. Si necesitas asignar el permiso a otros roles, usa la interfaz de administración';
PRINT '2. Los usuarios con rol Administrador ya pueden editar pesos';
PRINT '3. Verifica que los usuarios tengan sus tokens actualizados (re-login)';
PRINT '';
GO
