using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Api.Middleware;

/// <summary>
/// Middleware de auditoría que intercepta operaciones POST, PUT, DELETE exitosas
/// y registra automáticamente la información en el log de auditoría
/// </summary>
public class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditMiddleware> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    // Métodos HTTP que se deben auditar
    private static readonly HashSet<string> AuditableMethods = ["POST", "PUT", "DELETE"];

    // Códigos de respuesta que se consideran exitosos
    private static readonly HashSet<int> SuccessStatusCodes = [200, 201, 202, 204];

    // Rutas que se deben excluir de la auditoría
    private static readonly HashSet<string> ExcludedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth/login",
        "/api/auth/refresh",
        "/health",
        "/metrics",
        "/hubs/peso"
    };

    public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger, IServiceScopeFactory serviceScopeFactory)
    {
        _next = next;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var method = context.Request.Method;
        var path = context.Request.Path.ToString();
        
        // Log de debug para todas las requests auditables
        if (AuditableMethods.Contains(method))
        {
            _logger.LogInformation("🔍 Audit Middleware: {Method} {Path}", method, path);
        }

        // Verificar si la operación debe ser auditada
        if (!ShouldAudit(context))
        {
            _logger.LogDebug("⏭️ Audit: Request excluida de auditoría: {Method} {Path}", method, path);
            await _next(context);
            return;
        }

        _logger.LogInformation("📝 Audit: Procesando request auditable: {Method} {Path}", method, path);

        // Capturar información del request y usuario antes del pipeline
        var requestInfo = await CaptureRequestInfoAsync(context);
        var (usuarioId, nombreUsuario) = ExtractUserInfo(context);
        
        // Guardar información del usuario en requestInfo
        requestInfo.UsuarioId = usuarioId;
        requestInfo.NombreUsuario = nombreUsuario;

        // Continuar con el pipeline
        await _next(context);

        var statusCode = context.Response.StatusCode;
        requestInfo.StatusCode = statusCode;
        
        _logger.LogInformation("📊 Audit: Response status: {StatusCode} para {Method} {Path}", statusCode, method, path);

        // Solo auditar si la operación fue exitosa
        if (SuccessStatusCodes.Contains(statusCode))
        {
            _logger.LogInformation("✅ Audit: Registrando operación exitosa: {Method} {Path} -> {StatusCode}", method, path, statusCode);
            // Registrar la operación de forma síncrona usando la información ya capturada
            await LogOperationAsync(requestInfo);
        }
        else
        {
            _logger.LogWarning("❌ Audit: Operación no exitosa, no se registra: {Method} {Path} -> {StatusCode}", method, path, statusCode);
        }
    }

    private static bool ShouldAudit(HttpContext context)
    {
        var method = context.Request.Method;
        var path = context.Request.Path.ToString();

        // Solo auditar métodos específicos
        if (!AuditableMethods.Contains(method))
        {
            return false;
        }

        // Excluir rutas específicas
        if (ExcludedPaths.Any(excluded => path.StartsWith(excluded, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        return true;
    }

    private static async Task<RequestInfo> CaptureRequestInfoAsync(HttpContext context)
    {
        var requestInfo = new RequestInfo
        {
            Method = context.Request.Method,
            Path = context.Request.Path.ToString(),
            IpAddress = GetClientIpAddress(context),
            Dispositivo = GetUserAgent(context)
        };

        // Capturar payload del request para POST y PUT
        if (context.Request.Method is "POST" or "PUT" && context.Request.ContentLength > 0)
        {
            context.Request.EnableBuffering();
            var buffer = new byte[context.Request.ContentLength.Value];
            await context.Request.Body.ReadAsync(buffer.AsMemory(0, buffer.Length));
            context.Request.Body.Position = 0;

            requestInfo.Payload = Encoding.UTF8.GetString(buffer);
        }

        return requestInfo;
    }

    private async Task LogOperationAsync(RequestInfo requestInfo)
    {
        try
        {
            _logger.LogDebug("🔍 Iniciando LogOperationAsync para {Method} {Path}", requestInfo.Method, requestInfo.Path);
            
            using var scope = _serviceScopeFactory.CreateScope();
            var auditLogger = scope.ServiceProvider.GetRequiredService<IAuditLogger>();

            var usuarioId = requestInfo.UsuarioId;
            var nombreUsuario = requestInfo.NombreUsuario;

            _logger.LogDebug("👤 Usuario extraído: ID={UsuarioId}, Nombre={NombreUsuario}", usuarioId ?? "null", nombreUsuario ?? "null");
            
            if (string.IsNullOrEmpty(usuarioId))
            {
                _logger.LogWarning("⚠️ No se pudo extraer información del usuario para auditoría en {Path}", requestInfo.Path);
                
                // En desarrollo, usar usuario genérico para poder probar
                usuarioId = "UNKNOWN_USER";
                nombreUsuario = "Usuario No Identificado";
            }

            // Determinar el tipo de operación
            var operacion = requestInfo.Method.ToUpperInvariant() switch
            {
                "POST" => "CREATE",
                "PUT" => "UPDATE", 
                "DELETE" => "DELETE",
                _ => requestInfo.Method.ToUpperInvariant()
            };

            // Determinar el recurso basado en la ruta
            var recurso = ExtractResourceFromPath(requestInfo.Path);
            _logger.LogDebug("🏷️ Recurso extraído: {Recurso} para ruta: {Path}", recurso, requestInfo.Path);

            // Extraer ID del registro si está disponible en la ruta
            var registroId = ExtractRecordIdFromPath(requestInfo.Path);
            _logger.LogDebug("🆔 RegistroId extraído: {RegistroId} para ruta: {Path}", registroId ?? "null", requestInfo.Path);

            // Limpiar payload si contiene información sensible
            var cleanPayload = CleanSensitiveData(requestInfo.Payload);

            _logger.LogInformation("💾 Guardando audit log: {Operacion} en {Recurso} por {UsuarioId}", 
                operacion, recurso, usuarioId);

            await auditLogger.LogAsync(
                usuarioId: usuarioId,
                nombreUsuario: nombreUsuario,
                operacion: operacion,
                recurso: recurso,
                registroId: registroId,
                payload: cleanPayload,
                ipOrigen: requestInfo.IpAddress,
                detalles: $"Operación exitosa - Status: {requestInfo.StatusCode}",
                metodoHttp: requestInfo.Method,
                rutaApi: requestInfo.Path,
                dispositivo: requestInfo.Dispositivo
            );

            _logger.LogInformation("✅ Audit log guardado exitosamente: {Operacion} en {Recurso}", operacion, recurso);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar auditoría para {Method} {Path}", requestInfo.Method, requestInfo.Path);
        }
    }

    private static (string? usuarioId, string? nombreUsuario) ExtractUserInfo(HttpContext context)
    {
        try
        {
            var user = context.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                return (null, null);
            }

            // Intentar obtener diferentes claims del usuario
            var usuarioId = user.Identity.Name ??
                          user.FindFirst(ClaimTypes.Name)?.Value ??
                          user.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                          user.FindFirst("sub")?.Value ??
                          user.FindFirst("username")?.Value ??
                          user.FindFirst("email")?.Value;

            var nombreUsuario = user.FindFirst("name")?.Value ??
                              user.FindFirst(ClaimTypes.GivenName)?.Value ??
                              user.FindFirst("username")?.Value;

            return (usuarioId, nombreUsuario);
        }
        catch
        {
            return (null, null);
        }
    }

    private static string ExtractResourceFromPath(string path)
    {
        try
        {
            // Ejemplos de mapeo de rutas a recursos
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length < 2) return "Unknown";

            var resource = segments[1].ToLowerInvariant() switch
            {
                "weighing" => "WeighingOperation",
                "usuarios" => "Usuario", 
                "usuario" => "Usuario",
                "roles" => "Rol",
                "rol" => "Rol", 
                "permisos" => "Permiso",
                "permiso" => "Permiso",
                "modulos" => "Modulo",
                "modulo" => "Modulo",
                "admin" => GetAdminResource(segments),
                "auth" => "Authentication",
                "audit" => "AuditLog",
                _ => segments[1] // Usar el segmento tal como está
            };

            return resource;
        }
        catch
        {
            return "Unknown";
        }
    }

    private static string GetAdminResource(string[] segments)
    {
        // Para rutas como /api/admin/usuarios, /api/admin/roles, etc.
        if (segments.Length >= 3)
        {
            return segments[2].ToLowerInvariant() switch
            {
                "usuarios" => "Usuario",
                "roles" => "Rol", 
                "permisos" => "Permiso",
                "modulos" => "Modulo",
                _ => "AdminModule"
            };
        }
        return "AdminModule";
    }

    private static string? ExtractRecordIdFromPath(string path)
    {
        try
        {
            // Buscar patrones comunes de ID en la ruta
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            
            // Buscar GUIDs o números al final de la ruta
            foreach (var segment in segments.Reverse())
            {
                if (Guid.TryParse(segment, out _) || int.TryParse(segment, out _))
                {
                    return segment;
                }
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    private static string? CleanSensitiveData(string? payload)
    {
        if (string.IsNullOrEmpty(payload)) return payload;

        try
        {
            // Parsear JSON y remover campos sensibles
            var jsonDoc = JsonDocument.Parse(payload);
            var cleanedJson = RemoveSensitiveFields(jsonDoc.RootElement);
            return JsonSerializer.Serialize(cleanedJson);
        }
        catch
        {
            // Si no es JSON válido o hay error, truncar si es muy largo
            return payload.Length > 2000 ? payload[..2000] + "..." : payload;
        }
    }

    private static JsonElement RemoveSensitiveFields(JsonElement element)
    {
        // Lista de campos sensibles que se deben omitir
        var sensitiveFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "password", "passwordHash", "token", "secret", "key", "authorization"
        };

        if (element.ValueKind == JsonValueKind.Object)
        {
            var cleanedObject = new Dictionary<string, object?>();
            
            foreach (var property in element.EnumerateObject())
            {
                if (!sensitiveFields.Contains(property.Name))
                {
                    cleanedObject[property.Name] = RemoveSensitiveFields(property.Value);
                }
                else
                {
                    cleanedObject[property.Name] = "[REDACTED]";
                }
            }
            
            return JsonSerializer.SerializeToElement(cleanedObject);
        }

        return element;
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        try
        {
            // Buscar en headers comunes de proxy
            var ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim();
            
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            }
            
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = context.Connection.RemoteIpAddress?.ToString();
            }

            return ipAddress ?? "unknown";
        }
        catch
        {
            return "unknown";
        }
    }

    private static string GetUserAgent(HttpContext context)
    {
        try
        {
            var userAgent = context.Request.Headers.UserAgent.ToString();
            
            // Truncar si es muy largo para evitar problemas de base de datos
            if (!string.IsNullOrEmpty(userAgent) && userAgent.Length > 200)
            {
                userAgent = userAgent[..197] + "...";
            }
            
            return userAgent ?? "Unknown";
        }
        catch
        {
            return "Unknown";
        }
    }

    private class RequestInfo
    {
        public string Method { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public string? Payload { get; set; }
        public string? IpAddress { get; set; }
        public string? UsuarioId { get; set; }
        public string? NombreUsuario { get; set; }
        public int StatusCode { get; set; }
        public string? Dispositivo { get; set; }
    }
}