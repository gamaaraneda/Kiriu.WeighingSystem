# Sistema de Auditoría - Kiriu Weighing System

## 📋 Descripción

Sistema completo de auditoría implementado en el backend que registra automáticamente todas las operaciones exitosas realizadas por los usuarios (POST, PUT, DELETE) para fines de control y trazabilidad.

## ✅ Características Implementadas

### 1. **Entidad AuditLog**
- **Ubicación**: `Domain/Entities/AuditLog.cs`
- **Campos**:
  - `Id` (PK, autoincremental)
  - `UsuarioId` (extraído del token JWT)
  - `NombreUsuario` (nombre legible del usuario)
  - `Operacion` (CREATE, UPDATE, DELETE)
  - `Recurso` (tabla/recurso afectado)
  - `RegistroId` (ID del registro modificado)
  - `Timestamp` (fecha y hora UTC)
  - `Payload` (contenido del request serializado)
  - `IpOrigen` (IP del cliente)
  - `Resultado` (siempre "success")
  - `Detalles` (información adicional)
  - `MetodoHttp` (POST, PUT, DELETE)
  - `RutaApi` (endpoint llamado)

### 2. **Interfaz y Servicio de Auditoría**
- **Interfaz**: `Domain/Interfaces/IAuditLogger.cs`
- **Implementación**: `Infrastructure/Services/AuditLoggerService.cs`
- **Funcionalidades**:
  - Registro automático de operaciones
  - Métodos específicos para CREATE, UPDATE, DELETE
  - Consulta paginada de logs
  - Estadísticas de uso
  - Usuarios más activos

### 3. **Middleware Automático**
- **Ubicación**: `Api/Middleware/AuditMiddleware.cs`
- **Funciona automáticamente**:
  - Intercepta POST, PUT, DELETE
  - Solo registra operaciones exitosas (200, 201, 202, 204)
  - Excluye rutas como `/api/auth/login`, `/health`, `/metrics`
  - Extrae usuario del JWT automáticamente
  - Captura IP del cliente
  - Limpia datos sensibles del payload

### 4. **Base de Datos**
- **Esquema**: `audit`
- **Tabla**: `AuditLogs`
- **Índices optimizados** para consultas por:
  - Usuario + Timestamp
  - Recurso + Timestamp
  - Operación
  - Solo Timestamp
- **Vista**: `vw_AuditLogsSummary` para consultas comunes

### 5. **API para Consultas**
- **Controlador**: `Api/Controllers/AuditController.cs`
- **Endpoints**:
  - `GET /api/audit` - Lista logs con filtros y paginación
  - `GET /api/audit/{id}` - Detalles específicos de un log
  - `GET /api/audit/statistics` - Estadísticas de uso

## 🚀 Instalación

### 1. **Base de Datos**

```sql
-- 1. Ejecutar el script principal
-- En SQL Server Management Studio, ejecutar:
src/backend/Kiriu.WeighingSystem.Database/create_audit_log_table.sql

-- 2. (Opcional) Verificar instalación con:
src/backend/Kiriu.WeighingSystem.Database/apply_audit_migration.sql
```

### 2. **Código Backend**

El sistema ya está integrado automáticamente:

- ✅ Servicios registrados en DI
- ✅ Middleware configurado en pipeline  
- ✅ DbContext actualizado
- ✅ Controlador disponible

### 3. **Configuración (Opcional)**

El sistema funciona con configuración por defecto, pero puede personalizar:

```csharp
// En ApplicationBuilderExtensions.cs, puede reordenar el middleware si necesario:
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<AuditMiddleware>(); // Debe ir después de autenticación
```

## 📊 Uso

### **Automático**
Una vez instalado, el sistema registra automáticamente:

```http
POST /api/weighing/entry
PUT /api/weighing/operations/123
DELETE /api/usuarios/456
```

### **Consultar Logs**

```http
# Obtener logs recientes
GET /api/audit?page=1&size=20

# Filtrar por usuario
GET /api/audit?usuarioId=john.doe&fechaDesde=2024-01-01

# Filtrar por recurso
GET /api/audit?recurso=WeighingOperation&operacion=CREATE

# Obtener estadísticas
GET /api/audit/statistics?fechaDesde=2024-01-01&fechaHasta=2024-01-31
```

### **Consultas SQL Directas**

```sql
-- Logs recientes
SELECT * FROM [audit].[AuditLogs] 
ORDER BY [Timestamp] DESC

-- Vista resumida
SELECT * FROM [audit].[vw_AuditLogsSummary] 
WHERE [Fecha] >= '2024-01-01'
ORDER BY [Timestamp] DESC

-- Estadísticas por operación
SELECT [Operacion], COUNT(*) as Total
FROM [audit].[AuditLogs]
WHERE [Timestamp] >= DATEADD(day, -7, GETUTCDATE())
GROUP BY [Operacion]

-- Usuarios más activos
SELECT [UsuarioId], [NombreUsuario], COUNT(*) as Operaciones
FROM [audit].[AuditLogs]
WHERE [Timestamp] >= DATEADD(day, -30, GETUTCDATE())
GROUP BY [UsuarioId], [NombreUsuario]
ORDER BY COUNT(*) DESC
```

## 🔒 Seguridad

### **Datos Sensibles**
- Passwords, tokens y secrets se marcan como `[REDACTED]` en los logs
- Solo usuarios autenticados pueden consultar logs
- Payloads grandes se truncan automáticamente

### **Performance**
- Logging asíncrono para no afectar rendimiento
- Índices optimizados para consultas frecuentes
- Errores de logging no afectan operaciones principales

## 📈 Monitoreo

### **Campos Clave para Reportes**
- `Timestamp` - Cuándo ocurrió
- `UsuarioId/NombreUsuario` - Quién lo hizo  
- `Operacion` - Qué tipo (CREATE/UPDATE/DELETE)
- `Recurso` - En qué tabla/entidad
- `IpOrigen` - Desde dónde
- `RutaApi` - Qué endpoint

### **Casos de Uso**
✅ **Control de Accesos**: Ver quién modificó registros críticos  
✅ **Trazabilidad**: Seguir cambios en operaciones de pesaje  
✅ **Compliance**: Auditoría completa para regulaciones  
✅ **Debugging**: Rastrear cambios problemáticos  
✅ **Estadísticas**: Usuarios más activos, operaciones frecuentes  

## 🛠️ Mantenimiento

### **Limpieza de Logs Antiguos**
```sql
-- Eliminar logs de más de 1 año (ejecutar mensualmente)
DELETE FROM [audit].[AuditLogs] 
WHERE [Timestamp] < DATEADD(year, -1, GETUTCDATE())

-- O archivar en tabla histórica antes de eliminar
SELECT * INTO [audit].[AuditLogs_Archive_2024] 
FROM [audit].[AuditLogs] 
WHERE YEAR([Timestamp]) = 2024
```

### **Monitoreo de Performance**
```sql
-- Verificar tamaño de tabla
SELECT 
    COUNT(*) as TotalRegistros,
    MIN([Timestamp]) as PrimerRegistro,
    MAX([Timestamp]) as UltimoRegistro,
    AVG(LEN([Payload])) as TamañoPromedioPayload
FROM [audit].[AuditLogs]
```

## 📞 Soporte

- **Base de Datos**: Revisar scripts en `Kiriu.WeighingSystem.Database/`
- **Backend**: Servicios en `Infrastructure/Services/AuditLoggerService.cs`
- **API**: Consultas en `Api/Controllers/AuditController.cs`
- **Logs**: Revisar logs de aplicación para errores de auditoría

---

**✨ El sistema está listo para uso inmediato una vez ejecutada la migración SQL.**