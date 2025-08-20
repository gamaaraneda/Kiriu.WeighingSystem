# 🗄️ Sistema de Base de Datos - Kiriu Weighing System

Esta carpeta contiene todos los scripts y documentación relacionados con la base de datos del sistema de pesaje Kiriu.

## 📁 Estructura de Archivos

```
Kiriu.WeighingSystem.Database/
├── 📋 README.md                        # Esta documentación
├── 🚀 manual_migrations.sql            # Script principal de migraciones
├── 🔍 check_database.sql               # Verificación del estado de la BD
├── 📝 migration_templates.sql          # Plantillas para futuras migraciones
└── 📚 DATABASE_MIGRATIONS_README.md    # Documentación detallada
```

## 🎯 Uso Rápido

### 🚀 **Primera Configuración**
```sql
-- 1. Conectar a la base de datos WeighingSystem
-- 2. Ejecutar:
manual_migrations.sql
```

### 🔍 **Verificar Estado**
```sql
-- Para verificar que todo está configurado correctamente:
check_database.sql
```

### ➕ **Agregar Nuevas Migraciones**
```sql
-- 1. Consultar plantillas:
migration_templates.sql

-- 2. Editar y agregar nueva versión a:
manual_migrations.sql

-- 3. Ejecutar manual_migrations.sql actualizado
```

## 📊 Base de Datos del Sistema de Pesaje

### 🏗️ **Arquitectura**

El sistema utiliza **SQL Server** con la siguiente estructura:

#### **Esquema Principal (`dbo`)**
- `DatabaseVersions` - Control de versiones de migraciones
- `Usuarios` - Sistema de usuarios (existente)
- `Roles` - Sistema de roles (existente)

#### **Esquema de Pesaje (`weighing`)**
- `WeighingOperations` - 🚛 **Operaciones principales de pesaje**
- `WeighingPhotos` - 📸 **Fotos asociadas a operaciones**
- `WeighingRemolques` - 🚚 **Datos de remolques dobles**

### 🔄 **Flujo de Datos**

```
[Entrada del Vehículo] 
       ↓
[WeighingOperations] ← Status: ENTRADA_REGISTRADA
       ↓
[WeighingPhotos] ← Fotos de entrada
       ↓
[WeighingRemolques] ← Si es doble remolque
       ↓
[Salida del Vehículo]
       ↓
[WeighingOperations] ← Status: SALIDA_REGISTRADA + pesos finales
       ↓
[WeighingPhotos] ← Fotos de salida
```

### 🎲 **Tipos de Operaciones Soportadas**

| Tipo | Descripción | Tablas Involucradas |
|------|-------------|-------------------|
| **Remolque Simple** | Un solo remolque | `WeighingOperations` + `WeighingPhotos` |
| **Contenedor** | Operación con contenedor | `WeighingOperations` + `WeighingPhotos` |
| **Doble Remolque** | Dos remolques en una operación | `WeighingOperations` + `WeighingPhotos` + `WeighingRemolques` |

## 🔧 Herramientas Disponibles

### 1. **`manual_migrations.sql`** ⭐ **PRINCIPAL**
- Aplica todas las migraciones necesarias
- Control inteligente de versiones
- Idempotente (se puede ejecutar múltiples veces)
- Incluye verificaciones de seguridad

### 2. **`check_database.sql`** 🔍 **DIAGNÓSTICO**
- Verifica estado actual de la base de datos
- Muestra estadísticas de tablas
- Lista índices y relaciones
- Reporte completo del sistema

### 3. **`migration_templates.sql`** 📝 **PLANTILLAS**
- Patrones para agregar columnas
- Plantillas para crear tablas
- Ejemplos de índices y constraints
- Guías para modificaciones seguras

### 4. **`DATABASE_MIGRATIONS_README.md`** 📚 **DOCUMENTACIÓN**
- Guía completa del sistema de migraciones
- Mejores prácticas
- Ejemplos detallados
- Troubleshooting

## 🛡️ Características de Seguridad

### ✅ **Control de Versiones**
```sql
-- Tabla automática de control
[dbo].[DatabaseVersions]
├── Version (INT) - Número de versión
├── Description (NVARCHAR) - Qué cambios incluye
├── AppliedDate (DATETIME2) - Cuándo se aplicó
└── ScriptName (NVARCHAR) - Qué script lo aplicó
```

### ✅ **Verificaciones de Integridad**
- Constraints para validar datos
- Foreign keys para relaciones
- Triggers para timestamps automáticos
- Índices optimizados para rendimiento

### ✅ **Migraciones Seguras**
- Verificación de existencia antes de crear
- Rollback automático en caso de error
- Logs detallados de cada operación
- Compatible con entornos de producción

## 🚀 Comandos Útiles

### **Configuración Inicial**
```sql
-- Crear base de datos (si no existe)
CREATE DATABASE WeighingSystem;

-- Aplicar todas las migraciones
USE WeighingSystem;
-- Ejecutar: manual_migrations.sql
```

### **Verificación Regular**
```sql
-- Verificar estado del sistema
-- Ejecutar: check_database.sql
```

### **Mantenimiento**
```sql
-- Ver historial de migraciones
SELECT * FROM [dbo].[DatabaseVersions] ORDER BY [Version];

-- Estadísticas de uso
SELECT 
    COUNT(*) as TotalOperaciones,
    COUNT(CASE WHEN Status = 'ENTRADA_REGISTRADA' THEN 1 END) as EntradasPendientes,
    COUNT(CASE WHEN Status = 'SALIDA_REGISTRADA' THEN 1 END) as OperacionesCompletas
FROM [weighing].[WeighingOperations];
```

## 📞 Soporte

### 🐛 **Troubleshooting**
1. Ejecutar `check_database.sql` para diagnóstico
2. Revisar tabla `DatabaseVersions` para historial
3. Consultar `DATABASE_MIGRATIONS_README.md` para guías detalladas

### 🆘 **Problemas Comunes**
- **"Tabla ya existe"** → El script es idempotente, esto es normal
- **"Error de permisos"** → Verificar permisos de usuario SQL Server
- **"Versión incorrecta"** → Ejecutar `check_database.sql` para verificar estado

### 🔄 **Actualizaciones**
- Los scripts son actualizados junto con el código del API
- Siempre usar la versión más reciente de `manual_migrations.sql`
- Las migraciones son incrementales y seguras

---

## 🎉 **¡Listo para Usar!**

El sistema de base de datos está diseñado para ser:
- **Fácil de usar** 🎯
- **Seguro y confiable** 🛡️
- **Escalable** 📈
- **Mantenible** 🔧

**¡Tu sistema de pesaje tiene una base de datos robusta y profesional!** 🚛⚖️