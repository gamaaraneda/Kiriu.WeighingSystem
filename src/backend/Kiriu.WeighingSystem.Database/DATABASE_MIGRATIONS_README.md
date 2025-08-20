# 🗄️ Sistema de Migraciones Manual de Base de Datos

Este directorio contiene scripts SQL para manejar las migraciones de base de datos sin depender de Entity Framework Core, evitando problemas de compatibilidad de versiones.

## 📁 Archivos Disponibles

| Archivo | Propósito |
|---------|-----------|
| `manual_migrations.sql` | **PRINCIPAL** - Aplica todas las migraciones de forma segura |
| `check_database.sql` | Verifica el estado actual de la base de datos |
| `migration_templates.sql` | Plantillas para futuras modificaciones |
| `DATABASE_MIGRATIONS_README.md` | Esta documentación |

## 🚀 Uso Básico

### 1. Primera Configuración
```sql
-- Conectar a la base de datos WeighingSystem
-- Ejecutar el script principal
manual_migrations.sql
```

### 2. Verificar Estado
```sql
-- Para verificar que todo esté configurado correctamente
check_database.sql
```

### 3. Futuras Modificaciones
```sql
-- 1. Consultar plantillas en migration_templates.sql
-- 2. Agregar nueva migración al final de manual_migrations.sql
-- 3. Ejecutar manual_migrations.sql actualizado
```

## 🛠️ Cómo Agregar Nuevas Migraciones

### Paso 1: Incrementar Versión
```sql
-- En manual_migrations.sql, agregar al final:
IF @SchemaVersion < 2  -- Incrementar número de versión
BEGIN
    PRINT 'APLICANDO MIGRACIÓN VERSIÓN 2: [TU DESCRIPCIÓN]';
    
    -- Tus comandos SQL aquí
    
    -- Registrar migración
    INSERT INTO [dbo].[DatabaseVersions] ([Version], [Description], [ScriptName])
    VALUES (2, '[DESCRIPCIÓN]', 'manual_migrations.sql');
    
    PRINT '✅ MIGRACIÓN VERSIÓN 2 COMPLETADA';
END
```

### Paso 2: Usar Plantillas
Consulta `migration_templates.sql` para plantillas comunes:
- ➕ Agregar columnas
- 🆕 Crear tablas
- 🔗 Crear índices
- 🔄 Modificar estructuras existentes
- 📊 Crear vistas y procedures

### Paso 3: Verificar
Ejecuta `check_database.sql` para confirmar que los cambios se aplicaron correctamente.

## 📊 Control de Versiones

El sistema mantiene un control automático de versiones:

```sql
-- Tabla de control
[dbo].[DatabaseVersions]
├── Version (INT) - Número de versión
├── Description (NVARCHAR) - Descripción de los cambios
├── AppliedDate (DATETIME2) - Cuándo se aplicó
└── ScriptName (NVARCHAR) - Nombre del script
```

### Ventajas del Sistema:
- ✅ **Idempotente**: Se puede ejecutar múltiples veces sin problemas
- ✅ **Incremental**: Solo aplica cambios nuevos
- ✅ **Trazable**: Historial completo de modificaciones
- ✅ **Seguro**: Verifica existencia antes de crear/modificar

## 🔄 Ejemplos de Migraciones Comunes

### Agregar Nueva Columna
```sql
-- En manual_migrations.sql, versión N:
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'weighing' 
               AND TABLE_NAME = 'WeighingOperations' 
               AND COLUMN_NAME = 'CodigoBarras')
BEGIN
    ALTER TABLE [weighing].[WeighingOperations] 
    ADD [CodigoBarras] NVARCHAR(100) NULL;
    PRINT '✓ Columna CodigoBarras agregada';
END
```

### Crear Nueva Tabla
```sql
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'weighing' 
               AND TABLE_NAME = 'WeighingAuditLog')
BEGIN
    CREATE TABLE [weighing].[WeighingAuditLog] (
        [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [WeighingOperationId] UNIQUEIDENTIFIER NOT NULL,
        [Action] NVARCHAR(50) NOT NULL,
        [UserId] NVARCHAR(100) NOT NULL,
        [Timestamp] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [Details] NVARCHAR(MAX) NULL,
        
        CONSTRAINT [PK_WeighingAuditLog] PRIMARY KEY ([Id])
    );
    PRINT '✓ Tabla WeighingAuditLog creada';
END
```

### Crear Índice
```sql
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name = 'IX_WeighingOperations_ClientRfc' 
               AND object_id = OBJECT_ID('[weighing].[WeighingOperations]'))
BEGIN
    CREATE INDEX [IX_WeighingOperations_ClientRfc] 
    ON [weighing].[WeighingOperations] ([ClientProviderRfc]);
    PRINT '✓ Índice por RFC creado';
END
```

## 🚨 Mejores Prácticas

### ✅ HACER:
- Verificar existencia antes de crear elementos
- Usar transacciones para cambios complejos
- Documentar el propósito de cada migración
- Probar en ambiente de desarrollo primero
- Hacer respaldo antes de aplicar en producción

### ❌ NO HACER:
- Modificar migraciones ya aplicadas
- Eliminar datos sin confirmación
- Aplicar en producción sin probar
- Omitir el registro de versión

## 🔧 Troubleshooting

### Problema: "Tabla ya existe"
```sql
-- Solución: Verificar existencia
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'weighing' AND TABLE_NAME = 'MiTabla')
BEGIN
    -- Crear tabla
END
```

### Problema: "Columna ya existe"
```sql
-- Solución: Verificar existencia
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'weighing' 
               AND TABLE_NAME = 'MiTabla' 
               AND COLUMN_NAME = 'MiColumna')
BEGIN
    -- Agregar columna
END
```

### Problema: "Error en migración anterior"
1. Ejecutar `check_database.sql` para ver el estado
2. Revisar la tabla `DatabaseVersions` para ver qué se aplicó
3. Corregir manualmente si es necesario
4. Continuar con siguientes migraciones

## 📞 Soporte

Para problemas o dudas:
1. Ejecutar `check_database.sql` para diagnóstico
2. Revisar logs en la tabla `DatabaseVersions`
3. Consultar plantillas en `migration_templates.sql`
4. Verificar documentación del proyecto principal

## 🏆 Estado del Sistema

Después de aplicar `manual_migrations.sql` versión 1, tendrás:

- ✅ Esquema `weighing` creado
- ✅ Tabla `WeighingOperations` (operaciones de pesaje)
- ✅ Tabla `WeighingPhotos` (fotos de operaciones)
- ✅ Tabla `WeighingRemolques` (datos de remolques)
- ✅ Índices optimizados para consultas
- ✅ Constraints para integridad de datos
- ✅ Triggers para timestamps automáticos
- ✅ Sistema de control de versiones

¡El sistema de pesaje estará completamente funcional! 🎉