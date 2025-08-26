# Sistema de Auditoría - Pruebas y Diagnóstico

## Problemas Identificados y Solucionados

### Problema 1: Falta de Visibilidad

**Problema:** El sistema de auditoría solo parecía registrar operaciones de "weighing" (pesaje) pero no capturaba operaciones CRUD de usuarios, roles, permisos y módulos.

**Causa:** El middleware estaba configurado correctamente, pero faltaba logging detallado para diagnosticar qué operaciones se estaban registrando.

### Problema 2: ObjectDisposedException

**Problema:** Error `System.ObjectDisposedException: IFeatureCollection has been disposed` al intentar registrar auditoría.

**Causa:** El middleware ejecutaba el logging de auditoría de forma asíncrona usando `Task.Run`, pero cuando el task se ejecutaba, el `HttpContext` ya había sido disposed por el pipeline de ASP.NET.

**Solución:** Se refactorizó el middleware para:

- Capturar toda la información necesaria (usuario, request) ANTES de continuar con el pipeline
- Ejecutar el logging de forma síncrona después del pipeline
- Evitar accesos al `HttpContext` después de que el response se haya completado

## Cambios Realizados

### 1. Mejoras en el Middleware de Auditoría (`AuditMiddleware.cs`)

- **Logging Mejorado:** Se añadieron logs más detallados para diagnosticar el flujo de auditoría
- **Información de Debug:** Se agregaron logs para mostrar el recurso y registro ID extraídos
- **Visibilidad de Operaciones:** Ahora todas las operaciones auditables se logean con nivel Information
- **Fix ObjectDisposedException:** Se refactorizó para capturar información del usuario antes del pipeline y ejecutar logging de forma síncrona
- **Gestión de Ciclo de Vida:** La clase `RequestInfo` ahora almacena toda la información necesaria para evitar accesos al `HttpContext` disposed

### 2. Endpoints de Prueba (`AdminController.cs`)

Se añadieron 3 endpoints específicos para testing:

- `POST /api/admin/test-audit` - Prueba operaciones CREATE
- `PUT /api/admin/test-audit/{id}` - Prueba operaciones UPDATE
- `DELETE /api/admin/test-audit/{id}` - Prueba operaciones DELETE

### 3. Archivo de Pruebas HTTP (`test_audit.http`)

Se creó un archivo completo con casos de prueba para verificar:

- Operaciones de prueba (test endpoints)
- Operaciones reales de roles, usuarios, permisos y módulos
- Consulta de logs de auditoría
- Estadísticas de auditoría

## Cómo Verificar que el Sistema Funciona

### Paso 1: Ejecutar la Aplicación

```bash
cd src/backend/Kiriu.WeighingSystem.Api
dotnet run
```

### Paso 2: Usar los Tests HTTP

1. Abrir el archivo `test_audit.http` en tu IDE
2. Ejecutar el login para obtener un token válido
3. Ejecutar los endpoints de prueba uno por uno
4. Verificar los logs en la consola del servidor
5. Consultar los logs de auditoría usando el endpoint GET

### Paso 3: Verificar Logs en Tiempo Real

En los logs del servidor deberías ver mensajes como:

```
🔍 Audit Middleware: POST /api/admin/test-audit
📝 Audit: Procesando request auditable: POST /api/admin/test-audit
📊 Audit: Response status: 200 para POST /api/admin/test-audit
✅ Audit: Registrando operación exitosa: POST /api/admin/test-audit -> 200
🏷️ Recurso extraído: AdminModule para ruta: /api/admin/test-audit
🆔 RegistroId extraído: null para ruta: /api/admin/test-audit
💾 Guardando audit log: CREATE en AdminModule por [usuario]
✅ Audit log guardado exitosamente: CREATE en AdminModule
```

### Paso 4: Consultar Base de Datos

Verificar directamente en la base de datos:

```sql
SELECT TOP 10 * FROM audit.AuditLogs
ORDER BY Timestamp DESC;
```

## Operaciones que Deberían Generar Audit Logs

### ✅ Operaciones Admin (todas auditadas)

- `POST /api/admin/roles` → CREATE Rol
- `PUT /api/admin/roles/{id}` → UPDATE Rol
- `DELETE /api/admin/roles/{id}` → DELETE Rol
- `POST /api/admin/usuarios` → CREATE Usuario
- `PUT /api/admin/usuarios/{id}` → UPDATE Usuario
- `DELETE /api/admin/usuarios/{id}` → DELETE Usuario
- `POST /api/admin/permisos` → CREATE Permiso
- `PUT /api/admin/permisos/{id}` → UPDATE Permiso
- `DELETE /api/admin/permisos/{id}` → DELETE Permiso
- `POST /api/admin/modulos` → CREATE Modulo
- `PUT /api/admin/modulos/{id}` → UPDATE Modulo
- `DELETE /api/admin/modulos/{id}` → DELETE Modulo

### ✅ Operaciones de Usuario

- `POST /api/usuarios` → CREATE Usuario

### ✅ Operaciones de Weighing

- `POST /api/weighing/*` → CREATE WeighingOperation
- `PUT /api/weighing/*` → UPDATE WeighingOperation

### ❌ Operaciones Excluidas (correcto)

- `POST /api/auth/login` - Excluido por seguridad
- `POST /api/auth/refresh` - Excluido por seguridad
- `GET /*` - Solo se auditan operaciones de modificación

## Debugging en Caso de Problemas

### 1. Verificar Configuración de Logging

En `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Kiriu.WeighingSystem.Api.Middleware.AuditMiddleware": "Information"
    }
  }
}
```

### 2. Verificar Middleware Registrado

En `Program.cs` debe estar:

```csharp
app.UseGlobalMiddlewares(); // Esto incluye el AuditMiddleware
```

### 3. Verificar Servicio de Auditoría

En `ServiceCollectionExtensions.cs`:

```csharp
services.AddScoped<IAuditLogger, AuditLoggerService>();
```

### 4. Verificar DbContext

Asegurar que la tabla AuditLogs existe:

```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'audit' AND TABLE_NAME = 'AuditLogs';
```

## Mapeo de Rutas a Recursos

El sistema mapea automáticamente las rutas a recursos:

| Ruta                    | Recurso           |
| ----------------------- | ----------------- |
| `/api/admin/roles`      | Rol               |
| `/api/admin/usuarios`   | Usuario           |
| `/api/admin/permisos`   | Permiso           |
| `/api/admin/modulos`    | Modulo            |
| `/api/usuarios`         | Usuario           |
| `/api/weighing`         | WeighingOperation |
| `/api/admin/test-audit` | AdminModule       |

## Próximos Pasos

1. **Ejecutar Pruebas:** Usar el archivo `test_audit.http` para verificar funcionamiento
2. **Revisar Logs:** Monitorear los logs durante las pruebas
3. **Verificar Base de Datos:** Confirmar que los registros se guardan correctamente
4. **Implementar en Producción:** Una vez verificado el funcionamiento

El sistema ahora debería capturar **todas** las operaciones CRUD de usuarios, roles, permisos y módulos, no solo las operaciones de weighing.
