# Kiriu Weighing System - Backend API

## 🎯 Descripción

Solución .NET 8 Web API con Clean Architecture que implementa autenticación JWT y conexión a base de datos SQL Server existente.

## 📁 Estructura de Proyectos

```
Kiriu.WeighingSystem.sln
├── Kiriu.WeighingSystem.Domain/          # Entidades, Enums, Interfaces
├── Kiriu.WeighingSystem.Application/     # Use Cases, DTOs, Services
├── Kiriu.WeighingSystem.Infrastructure/  # Repositorios, EF, Servicios Externos
└── Kiriu.WeighingSystem.Api/            # Controllers, Middleware, Startup
```

## 🗃️ Entidades del Dominio

- **Usuario**: Gestión de usuarios del sistema
- **Rol**: Roles de usuario
- **Modulo**: Módulos del sistema
- **Permiso**: Permisos disponibles
- **ModuloPermiso**: Relación entre módulos y permisos
- **RolePermiso**: Asignación de permisos a roles

## 🔐 Funcionalidad de Autenticación

- **Login**: Autenticación con email y contraseña
- **Refresh Token**: Renovación de tokens JWT
- **Logout**: Cierre de sesión
- **Password Hashing**: BCrypt para seguridad

## 📤 Respuesta Estándar

Todos los endpoints retornan `ApiResponse<T>` con:

- Success: Estado de la operación
- Data: Datos de respuesta
- Message: Mensaje descriptivo
- Errors: Lista de errores (si los hay)
- Metadata: Metadatos de la respuesta

## 🗄️ Configuración de Base de Datos

- **Motor**: SQL Server
- **Database**: WeighingSystem
- **Schema**: defutlt
- **ConnectionString**: Configurado en appsettings.json

## ⚙️ Configuración

### appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=WeighingSystem;User Id=sa;Password=YourPassword123!;TrustServerCertificate=true;"
  },
  "JwtSettings": {
    "SecretKey": "tu-super-secret-key-de-al-menos-32-caracteres-para-jwt-tokens",
    "Issuer": "KiriuWeighingSystem",
    "Audience": "KiriuWeighingWeb",
    "ExpirationInMinutes": 60,
    "RefreshTokenExpirationInDays": 7
  }
}
```

## 📦 Paquetes NuGet Utilizados

- **Entity Framework Core**: Para acceso a datos
- **JWT Bearer**: Para autenticación
- **BCrypt.Net-Next**: Para hashing de contraseñas
- **AutoMapper**: Para mapeo de objetos
- **FluentValidation**: Para validación
- **Serilog**: Para logging
- **Swashbuckle**: Para documentación API

## 🚀 Comandos de Ejecución

### Compilar la solución

```bash
dotnet build
```

### Ejecutar la API

```bash
dotnet run --project Kiriu.WeighingSystem.Api
```

### Ejecutar en modo desarrollo

```bash
dotnet run --project Kiriu.WeighingSystem.Api --environment Development
```

## 📚 Documentación API

- **Swagger UI**: Disponible en `https://localhost:7000/swagger`
- **Health Check**: Disponible en `/health`

## 🔧 Endpoints Disponibles

### Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh-token` - Renovar token
- `POST /api/auth/logout` - Cerrar sesión

### Prueba

- `GET /api/test` - Endpoint de prueba

## 🛡️ Seguridad

- **JWT Tokens**: Autenticación basada en tokens
- **Password Hashing**: BCrypt para contraseñas
- **CORS**: Configurado para Angular (localhost:4200)
- **Refresh Tokens**: Almacenamiento en memoria

## 📝 Logging

- **Serilog**: Configurado para desarrollo y producción
- **Request Logging**: Para todas las peticiones HTTP
- **Global Exception Handler**: Manejo centralizado de errores

## ⚠️ Notas Importantes

1. **NO se crean migraciones** - La base de datos ya existe
2. **Schema defutlt** - Todas las tablas están en esquema `defutlt`
3. **Refresh Tokens** - Almacenados en memoria (NO localStorage)
4. **AutoMapper** - Comentado temporalmente para evitar errores de compilación

## 🔄 Próximos Pasos

1. Configurar AutoMapper correctamente
2. Agregar más endpoints según necesidades
3. Implementar tests unitarios
4. Configurar CI/CD
