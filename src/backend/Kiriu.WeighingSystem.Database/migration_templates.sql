-- =====================================================
-- PLANTILLAS PARA FUTURAS MIGRACIONES
-- =====================================================
-- Este archivo contiene plantillas comunes para modificaciones
-- Copia la sección que necesites al archivo manual_migrations.sql

-- =====================================================
-- PLANTILLA: AGREGAR NUEVA COLUMNA
-- =====================================================
/*
-- Agregar columna a WeighingOperations
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'weighing' 
               AND TABLE_NAME = 'WeighingOperations' 
               AND COLUMN_NAME = 'NuevaColumna')
BEGIN
    ALTER TABLE [weighing].[WeighingOperations] 
    ADD [NuevaColumna] NVARCHAR(100) NULL;
    PRINT '✓ Columna NuevaColumna agregada a WeighingOperations';
END
*/

-- =====================================================
-- PLANTILLA: CREAR NUEVA TABLA
-- =====================================================
/*
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'weighing' 
               AND TABLE_NAME = 'NuevaTabla')
BEGIN
    CREATE TABLE [weighing].[NuevaTabla] (
        [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [WeighingOperationId] UNIQUEIDENTIFIER NOT NULL,
        [Campo1] NVARCHAR(50) NOT NULL,
        [Campo2] DECIMAL(18,2) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [PK_NuevaTabla] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NuevaTabla_WeighingOperations] FOREIGN KEY ([WeighingOperationId]) 
            REFERENCES [weighing].[WeighingOperations] ([Id]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_NuevaTabla_WeighingOperationId] ON [weighing].[NuevaTabla] ([WeighingOperationId]);
    PRINT '✓ Tabla NuevaTabla creada';
END
*/

-- =====================================================
-- PLANTILLA: CREAR ÍNDICE
-- =====================================================
/*
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name = 'IX_NuevoIndice' 
               AND object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
BEGIN
    CREATE INDEX [IX_NuevoIndice] ON [weighing].[WeighingOperations] ([Columna1], [Columna2]);
    PRINT '✓ Índice IX_NuevoIndice creado';
END
*/

-- =====================================================
-- PLANTILLA: MODIFICAR COLUMNA EXISTENTE
-- =====================================================
/*
-- Cambiar tipo de datos o tamaño
ALTER TABLE [weighing].[WeighingOperations] 
ALTER COLUMN [ColumnaExistente] NVARCHAR(200) NOT NULL;
PRINT '✓ Columna ColumnaExistente modificada';
*/

-- =====================================================
-- PLANTILLA: AGREGAR CONSTRAINT CHECK
-- =====================================================
/*
IF NOT EXISTS (SELECT * FROM sys.check_constraints 
               WHERE name = 'CK_NuevoCheck' 
               AND parent_object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
BEGIN
    ALTER TABLE [weighing].[WeighingOperations]
    ADD CONSTRAINT [CK_NuevoCheck] CHECK ([Campo] IN ('Valor1', 'Valor2', 'Valor3'));
    PRINT '✓ Constraint CK_NuevoCheck agregado';
END
*/

-- =====================================================
-- PLANTILLA: CREAR VISTA
-- =====================================================
/*
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.VIEWS 
               WHERE TABLE_SCHEMA = 'weighing' 
               AND TABLE_NAME = 'VW_OperacionesCompletas')
BEGIN
    EXEC('
    CREATE VIEW [weighing].[VW_OperacionesCompletas]
    AS
    SELECT 
        wo.[Id],
        wo.[Folio],
        wo.[TrailerPlate],
        wo.[ClientProviderName],
        wo.[Product],
        wo.[EntryWeight],
        wo.[ExitWeight],
        wo.[NetWeight],
        wo.[Status],
        wo.[CreatedAt],
        COUNT(wp.[Id]) as TotalFotos,
        COUNT(wr.[Id]) as TotalRemolques
    FROM [weighing].[WeighingOperations] wo
    LEFT JOIN [weighing].[WeighingPhotos] wp ON wo.[Id] = wp.[WeighingOperationId]
    LEFT JOIN [weighing].[WeighingRemolques] wr ON wo.[Id] = wr.[WeighingOperationId]
    GROUP BY wo.[Id], wo.[Folio], wo.[TrailerPlate], wo.[ClientProviderName], 
             wo.[Product], wo.[EntryWeight], wo.[ExitWeight], wo.[NetWeight], 
             wo.[Status], wo.[CreatedAt]
    ');
    PRINT '✓ Vista VW_OperacionesCompletas creada';
END
*/

-- =====================================================
-- PLANTILLA: STORED PROCEDURE
-- =====================================================
/*
IF NOT EXISTS (SELECT * FROM sys.procedures 
               WHERE name = 'SP_BuscarOperacionesPorPlaca' 
               AND schema_id = SCHEMA_ID('weighing'))
BEGIN
    EXEC('
    CREATE PROCEDURE [weighing].[SP_BuscarOperacionesPorPlaca]
        @Placa NVARCHAR(20)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        SELECT *
        FROM [weighing].[WeighingOperations]
        WHERE [TrailerPlate] = @Placa
           OR [TrailerPlate2] = @Placa
           OR [PlacaRemolque1] = @Placa
           OR [PlacaRemolque2] = @Placa
        ORDER BY [CreatedAt] DESC;
    END
    ');
    PRINT '✓ Stored Procedure SP_BuscarOperacionesPorPlaca creado';
END
*/

-- =====================================================
-- PLANTILLA: INSERTAR DATOS MAESTROS
-- =====================================================
/*
-- Insertar datos de configuración o catálogos
IF NOT EXISTS (SELECT * FROM [weighing].[Configuracion] WHERE [Clave] = 'VERSION_SISTEMA')
BEGIN
    INSERT INTO [weighing].[Configuracion] ([Clave], [Valor], [Descripcion])
    VALUES ('VERSION_SISTEMA', '1.0.0', 'Versión actual del sistema de pesaje');
    PRINT '✓ Datos maestros insertados';
END
*/

-- =====================================================
-- PLANTILLA: MIGRACIÓN DE DATOS
-- =====================================================
/*
-- Actualizar datos existentes
UPDATE [weighing].[WeighingOperations]
SET [CampoNuevo] = 'ValorPorDefecto'
WHERE [CampoNuevo] IS NULL;
PRINT '✓ Datos migrados: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' registros actualizados';
*/

-- =====================================================
-- PLANTILLA: ELIMINAR ELEMENTOS (CON PRECAUCIÓN)
-- =====================================================
/*
-- ELIMINAR ÍNDICE
IF EXISTS (SELECT * FROM sys.indexes 
           WHERE name = 'IX_IndiceAEliminar' 
           AND object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
BEGIN
    DROP INDEX [IX_IndiceAEliminar] ON [weighing].[WeighingOperations];
    PRINT '✓ Índice IX_IndiceAEliminar eliminado';
END

-- ELIMINAR COLUMNA
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'weighing' 
           AND TABLE_NAME = 'WeighingOperations' 
           AND COLUMN_NAME = 'ColumnaAEliminar')
BEGIN
    ALTER TABLE [weighing].[WeighingOperations] DROP COLUMN [ColumnaAEliminar];
    PRINT '✓ Columna ColumnaAEliminar eliminada';
END

-- ELIMINAR TABLA
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = 'weighing' 
           AND TABLE_NAME = 'TablaAEliminar')
BEGIN
    DROP TABLE [weighing].[TablaAEliminar];
    PRINT '✓ Tabla TablaAEliminar eliminada';
END
*/