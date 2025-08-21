# Sincronización con Entity Framework Core

## 📋 Resumen

Este documento describe el proceso de sincronización entre las tablas del sistema de pesaje creadas manualmente y el modelo de Entity Framework Core.

## 🎯 Objetivo

Asegurar que todas las tablas del sistema de pesaje estén completamente sincronizadas con Entity Framework Core, permitiendo que la aplicación funcione correctamente sin conflictos de migración.

## 🔍 Estado Actual

### Tablas Existentes

- ✅ `WeighingOperations` - Operaciones de pesaje
- ✅ `WeighingPhotos` - Fotos asociadas a operaciones
- ✅ `WeighingRemolques` - Datos de remolques

### Configuración de Entity Framework

- ✅ Entidades definidas en el dominio
- ✅ DbContext configurado con Fluent API
- ✅ Relaciones y navegación configuradas
- ✅ Migración de sincronización creada

## 🚀 Proceso de Sincronización

### 1. Aplicar Migración Manual

```sql
-- Ejecutar el script completo de migraciones manuales
EXECUTE manual_migrations.sql
```

Este script:

- Aplica la migración versión 1 (creación de tablas básicas)
- Aplica la migración versión 2 (sincronización con EF Core)
- Crea foreign keys y índices adicionales
- Registra el progreso en la tabla de versiones

### 2. Verificar Sincronización

```sql
-- Verificar el estado general de la base de datos
EXECUTE check_database.sql

-- Verificar específicamente la sincronización con EF Core
EXECUTE verify_ef_sync.sql
```

### 3. Validar desde la Aplicación

```bash
# Compilar el proyecto
dotnet build

# Verificar que no hay errores de migración
dotnet ef migrations list --startup-project ../Kiriu.WeighingSystem.Api
```

## 📊 Estructura de Migraciones

### Migración Versión 1

- **Objetivo**: Crear tablas básicas del sistema de pesaje
- **Contenido**: Estructura de tablas, índices básicos, triggers
- **Estado**: ✅ Implementada

### Migración Versión 2

- **Objetivo**: Sincronización completa con Entity Framework Core
- **Contenido**: Foreign keys, índices adicionales, restricciones
- **Estado**: ✅ Implementada

## 🔧 Scripts Disponibles

| Script                  | Propósito                       | Cuándo Usar                             |
| ----------------------- | ------------------------------- | --------------------------------------- |
| `manual_migrations.sql` | Aplicar todas las migraciones   | Configuración inicial o actualizaciones |
| `check_database.sql`    | Verificar estado general        | Verificación rutinaria                  |
| `verify_ef_sync.sql`    | Verificar sincronización con EF | Después de aplicar migraciones          |

## ⚠️ Consideraciones Importantes

### No Recrear Tablas

- Las tablas ya existen y contienen datos
- La migración solo agrega elementos faltantes
- No se pierden datos existentes

### Compatibilidad de Versiones

- Entity Framework Core 8.0
- SQL Server compatible
- .NET 8.0

### Orden de Ejecución

1. Ejecutar `manual_migrations.sql`
2. Verificar con `verify_ef_sync.sql`
3. Probar desde la aplicación

## 🧪 Pruebas de Validación

### 1. Verificar Conexión

```csharp
// En la aplicación, verificar que el DbContext se conecta correctamente
using var context = serviceProvider.GetRequiredService<WeighingDbContext>();
var operations = await context.WeighingOperations.ToListAsync();
```

### 2. Verificar Relaciones

```csharp
// Verificar que las relaciones funcionan correctamente
var operation = await context.WeighingOperations
    .Include(o => o.Photos)
    .Include(o => o.Remolques)
    .FirstOrDefaultAsync();
```

### 3. Verificar Operaciones CRUD

```csharp
// Crear una operación de prueba
var newOperation = new WeighingOperation { /* ... */ };
context.WeighingOperations.Add(newOperation);
await context.SaveChangesAsync();
```

## 📝 Mantenimiento Futuro

### Para Nuevas Entidades

1. Definir la entidad en el dominio
2. Configurar en el DbContext
3. Crear migración de EF Core
4. Actualizar `manual_migrations.sql`

### Para Modificaciones Existentes

1. Modificar la entidad en el dominio
2. Generar migración de EF Core
3. Aplicar migración a la base de datos
4. Actualizar documentación

## 🆘 Solución de Problemas

### Error: "Table already exists"

- Las tablas ya existen, esto es normal
- La migración solo agrega elementos faltantes
- Verificar que la migración se aplicó correctamente

### Error: "Foreign key constraint failed"

- Verificar que las foreign keys se crearon correctamente
- Ejecutar `verify_ef_sync.sql` para diagnosticar
- Aplicar migración manual si es necesario

### Error: "Index already exists"

- Los índices ya existen, esto es normal
- La migración solo crea índices faltantes
- Verificar con `verify_ef_sync.sql`

## 📞 Soporte

Si encuentras problemas durante la sincronización:

1. Ejecutar `verify_ef_sync.sql` para diagnóstico
2. Revisar logs de la aplicación
3. Verificar que todas las migraciones se aplicaron
4. Consultar este documento para pasos específicos

## 🎉 Estado Final Esperado

Después de la sincronización exitosa:

- ✅ Todas las tablas están sincronizadas con EF Core
- ✅ Las relaciones están correctamente definidas
- ✅ Los índices están optimizados
- ✅ La aplicación puede conectarse sin problemas
- ✅ Las operaciones CRUD funcionan correctamente
- ✅ El sistema está listo para producción

---

**Última actualización**: Enero 2025  
**Versión del documento**: 1.0  
**Responsable**: Equipo de Desarrollo Backend
