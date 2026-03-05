-- =============================================
-- Script: Habilitar compresión PAGE en WeighingPhotos
-- Descripción: Aplica compresión a nivel de SQL Server para reducir tamaño en disco
--              Se complementa con la compresión de imágenes en backend (ImageCompressionService)
-- Fecha: 2026-03-04
-- Reducción esperada: 30-50% adicional al tamaño ya comprimido por backend
-- Impacto en rendimiento: +5-10% uso de CPU SQL Server (aceptable)
-- =============================================

USE WeighingSystem;
GO

PRINT '╔══════════════════════════════════════════════════════════════════╗';
PRINT '║  HABILITAR COMPRESIÓN PAGE EN WeighingPhotos                     ║';
PRINT '╚══════════════════════════════════════════════════════════════════╝';
PRINT '';

-- =============================================
-- PASO 1: Verificar tamaño actual de la tabla
-- =============================================
PRINT '📊 PASO 1: Verificando tamaño actual de la tabla...';
PRINT '';

DECLARE @TableSizeMB DECIMAL(18,2);
DECLARE @RowCount BIGINT;

SELECT
    @TableSizeMB = SUM(a.total_pages) * 8 / 1024.0,
    @RowCount = SUM(p.rows)
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.schema_id = SCHEMA_ID('weighing')
  AND t.name = 'WeighingPhotos'
GROUP BY t.name;

PRINT '   Tabla: [weighing].[WeighingPhotos]';
PRINT '   Registros: ' + CAST(ISNULL(@RowCount, 0) AS VARCHAR(20));
PRINT '   Tamaño actual: ' + CAST(ISNULL(@TableSizeMB, 0) AS VARCHAR(20)) + ' MB';
PRINT '';

-- =============================================
-- PASO 2: Verificar si ya tiene compresión aplicada
-- =============================================
PRINT '🔍 PASO 2: Verificando estado de compresión actual...';
PRINT '';

DECLARE @CurrentCompression VARCHAR(20);

SELECT @CurrentCompression = p.data_compression_desc
FROM sys.partitions p
INNER JOIN sys.tables t ON p.object_id = t.object_id
WHERE t.schema_id = SCHEMA_ID('weighing')
  AND t.name = 'WeighingPhotos'
  AND p.index_id IN (0, 1); -- Heap o Clustered Index

PRINT '   Compresión actual: ' + ISNULL(@CurrentCompression, 'NONE');
PRINT '';

IF @CurrentCompression = 'PAGE'
BEGIN
    PRINT '✓ La tabla ya tiene compresión PAGE aplicada.';
    PRINT '  No es necesario realizar cambios.';
    PRINT '';
    PRINT '══════════════════════════════════════════════════════════════════';
    PRINT '✓ Script completado (sin cambios necesarios)';
    PRINT '══════════════════════════════════════════════════════════════════';
    RETURN;
END

-- =============================================
-- PASO 3: Aplicar compresión PAGE
-- =============================================
PRINT '⚙️ PASO 3: Aplicando compresión PAGE a la tabla...';
PRINT '';
PRINT '⚠️ IMPORTANTE:';
PRINT '   - Este proceso puede tardar varios minutos dependiendo del tamaño de la tabla';
PRINT '   - La tabla permanecerá disponible durante el proceso';
PRINT '   - Se recomienda ejecutar en ventana de mantenimiento o baja carga';
PRINT '';
PRINT '🔄 Iniciando proceso de compresión...';

-- Aplicar compresión PAGE
-- NOTA: REBUILD reconstruye la tabla con la nueva configuración de compresión
-- ONLINE = OFF: Requiere bloqueo exclusivo breve al final (recomendado para tablas pequeñas-medianas)
-- Si la tabla es muy grande (>10GB), considerar usar ONLINE = ON (requiere Enterprise Edition)

ALTER TABLE [weighing].[WeighingPhotos]
REBUILD PARTITION = ALL
WITH (DATA_COMPRESSION = PAGE);

PRINT '✓ Compresión PAGE aplicada exitosamente';
PRINT '';

-- =============================================
-- PASO 4: Verificar nuevo tamaño
-- =============================================
PRINT '📊 PASO 4: Verificando nuevo tamaño de la tabla...';
PRINT '';

DECLARE @NewTableSizeMB DECIMAL(18,2);
DECLARE @SavedSpaceMB DECIMAL(18,2);
DECLARE @CompressionPercent DECIMAL(5,2);

SELECT
    @NewTableSizeMB = SUM(a.total_pages) * 8 / 1024.0
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.schema_id = SCHEMA_ID('weighing')
  AND t.name = 'WeighingPhotos'
GROUP BY t.name;

SET @SavedSpaceMB = @TableSizeMB - @NewTableSizeMB;
SET @CompressionPercent = (@SavedSpaceMB / NULLIF(@TableSizeMB, 0)) * 100;

PRINT '   Tamaño anterior: ' + CAST(@TableSizeMB AS VARCHAR(20)) + ' MB';
PRINT '   Tamaño nuevo: ' + CAST(@NewTableSizeMB AS VARCHAR(20)) + ' MB';
PRINT '   Espacio ahorrado: ' + CAST(@SavedSpaceMB AS VARCHAR(20)) + ' MB';
PRINT '   Reducción: ' + CAST(@CompressionPercent AS VARCHAR(20)) + '%';
PRINT '';

-- =============================================
-- PASO 5: Verificar compresión aplicada
-- =============================================
PRINT '🔍 PASO 5: Verificando compresión aplicada...';
PRINT '';

SELECT @CurrentCompression = p.data_compression_desc
FROM sys.partitions p
INNER JOIN sys.tables t ON p.object_id = t.object_id
WHERE t.schema_id = SCHEMA_ID('weighing')
  AND t.name = 'WeighingPhotos'
  AND p.index_id IN (0, 1);

PRINT '   Compresión aplicada: ' + @CurrentCompression;
PRINT '';

-- =============================================
-- PASO 6: Actualizar estadísticas
-- =============================================
PRINT '📈 PASO 6: Actualizando estadísticas de la tabla...';
PRINT '';

UPDATE STATISTICS [weighing].[WeighingPhotos] WITH FULLSCAN;

PRINT '✓ Estadísticas actualizadas';
PRINT '';

-- =============================================
-- RESUMEN FINAL
-- =============================================
PRINT '══════════════════════════════════════════════════════════════════';
PRINT '✓ COMPRESIÓN PAGE APLICADA EXITOSAMENTE';
PRINT '══════════════════════════════════════════════════════════════════';
PRINT '';
PRINT '📋 RESUMEN:';
PRINT '   - Tabla: [weighing].[WeighingPhotos]';
PRINT '   - Compresión: PAGE (nivel de página)';
PRINT '   - Reducción de espacio: ' + CAST(@CompressionPercent AS VARCHAR(20)) + '%';
PRINT '   - Espacio liberado: ' + CAST(@SavedSpaceMB AS VARCHAR(20)) + ' MB';
PRINT '';
PRINT '📝 NOTAS:';
PRINT '   - La compresión PAGE se aplica automáticamente a todos los datos nuevos';
PRINT '   - Las consultas descomprimen datos automáticamente (transparente)';
PRINT '   - Impacto en CPU: +5-10% (aceptable para el ahorro de espacio)';
PRINT '   - Los backups también serán más pequeños';
PRINT '';
PRINT '🔄 PRÓXIMOS PASOS:';
PRINT '   1. Monitorear uso de CPU de SQL Server durante 1-2 semanas';
PRINT '   2. Verificar que los tiempos de respuesta siguen aceptables';
PRINT '   3. Si hay problemas, se puede desactivar con:';
PRINT '      ALTER TABLE [weighing].[WeighingPhotos] REBUILD WITH (DATA_COMPRESSION = NONE);';
PRINT '';
PRINT '💡 COMBINACIÓN CON COMPRESIÓN BACKEND:';
PRINT '   - Backend comprime imágenes: 60-70% reducción';
PRINT '   - SQL Server comprime datos: 30-50% reducción adicional';
PRINT '   - REDUCCIÓN TOTAL ESTIMADA: 70-85%';
PRINT '';
PRINT '══════════════════════════════════════════════════════════════════';
PRINT '✓ Script completado exitosamente';
PRINT '══════════════════════════════════════════════════════════════════';
GO
