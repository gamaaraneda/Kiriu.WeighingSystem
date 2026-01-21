using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Exceptions;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous] // Permitir acceso sin autenticación para endpoints de auth
public class AuthController : ControllerBase
{
    private readonly IAuthApplicationService _authApplicationService;
    private readonly ILogger<AuthController> _logger;
    private readonly IAuditLogger _auditLogger;

    public AuthController(
        IAuthApplicationService authApplicationService,
        ILogger<AuthController> logger,
        IAuditLogger auditLogger)
    {
        _authApplicationService = authApplicationService;
        _logger = logger;
        _auditLogger = auditLogger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(LoginRequest request)
    {
        try
        {
            // Capturar información del dispositivo y IP desde el contexto HTTP
            request.DeviceInfo = Request.Headers.UserAgent.ToString();
            request.IpAddress = GetClientIpAddress();
            
            var response = await _authApplicationService.LoginAsync(request);

            // Auditar login exitoso manualmente (sin credenciales en payload)
            await AuditSuccessfulLogin(request.Email, response);

            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Data = response,
                Message = "Login exitoso"
            });
        }
        catch (ActiveSessionExistsException ex)
        {
            _logger.LogWarning("Login bloqueado para {Email}: sesión activa existente", request.Email);
            
            // Retornar 409 Conflict para indicar que ya existe una sesión activa
            return Conflict(new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = ex.Message,
                Errors = new List<string> 
                { 
                    "ACTIVE_SESSION_EXISTS",
                    $"Dispositivo: {ex.DeviceInfo ?? "Desconocido"}",
                    $"Sesión iniciada: {ex.SessionCreatedAt?.ToString("dd/MM/yyyy HH:mm") ?? "Desconocido"}"
                }
            });
        }
        catch (UnauthorizedException ex)
        {
            return BadRequest(new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Credenciales inválidas",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> RefreshToken(RefreshTokenRequest request)
    {
        try
        {
            var response = await _authApplicationService.RefreshTokenAsync(request);

            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Data = response,
                Message = "Token renovado exitosamente"
            });
        }
        catch (UnauthorizedException ex)
        {
            return BadRequest(new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Refresh token inválido",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return StatusCode(500, new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<object>>> Logout(LogoutRequest request)
    {
        try
        {
            await _authApplicationService.LogoutAsync(request);

            // Auditar logout exitoso manualmente
            await AuditSuccessfulLogout(request);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Logout exitoso"
            });
        }
        catch (UnauthorizedException ex)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Error en logout",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    /// <summary>
    /// Audita un login exitoso de forma manual y segura
    /// </summary>
    private async Task AuditSuccessfulLogin(string email, LoginResponse loginResponse)
    {
        try
        {
            var ipAddress = GetClientIpAddress();
            
            // Payload seguro sin credenciales
            var safePayload = System.Text.Json.JsonSerializer.Serialize(new
            {
                email = email,
                loginTime = DateTime.UtcNow,
                userAgent = Request.Headers.UserAgent.ToString(),
                success = true
            });

            await _auditLogger.LogAsync(
                usuarioId: loginResponse.User.Email, // Usar email como ID hasta tener el usuario autenticado
                nombreUsuario: loginResponse.User.Nombre,
                operacion: "LOGIN",
                recurso: "Authentication",
                registroId: loginResponse.User.Id.ToString(),
                payload: safePayload,
                ipOrigen: ipAddress,
                detalles: "Login exitoso",
                metodoHttp: "POST",
                rutaApi: "/api/auth/login",
                dispositivo: Request.Headers.UserAgent.ToString()
            );

            _logger.LogInformation("✅ Login auditado para usuario: {Email}", email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al auditar login para usuario: {Email}", email);
            // No fallar el login por error de auditoría
        }
    }

    /// <summary>
    /// Audita un logout exitoso de forma manual y segura
    /// </summary>
    private async Task AuditSuccessfulLogout(LogoutRequest logoutRequest)
    {
        try
        {
            // Extraer información del usuario del contexto autenticado
            var userId = HttpContext.User?.Identity?.Name ?? "UNKNOWN_USER";
            var userName = HttpContext.User?.FindFirst("name")?.Value ?? "Usuario Desconocido";
            var ipAddress = GetClientIpAddress();
            
            // Payload seguro sin tokens
            var safePayload = System.Text.Json.JsonSerializer.Serialize(new
            {
                logoutTime = DateTime.UtcNow,
                userAgent = Request.Headers.UserAgent.ToString(),
                success = true
            });

            await _auditLogger.LogAsync(
                usuarioId: userId,
                nombreUsuario: userName,
                operacion: "LOGOUT",
                recurso: "Authentication",
                registroId: null,
                payload: safePayload,
                ipOrigen: ipAddress,
                detalles: "Logout exitoso",
                metodoHttp: "POST",
                rutaApi: "/api/auth/logout",
                dispositivo: Request.Headers.UserAgent.ToString()
            );

            _logger.LogInformation("✅ Logout auditado para usuario: {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al auditar logout");
            // No fallar el logout por error de auditoría
        }
    }

    /// <summary>
    /// Obtiene la dirección IP del cliente
    /// </summary>
    private string GetClientIpAddress()
    {
        try
        {
            // Buscar en headers comunes de proxy
            var ipAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim();
            
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = Request.Headers["X-Real-IP"].FirstOrDefault();
            }
            
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            }

            return ipAddress ?? "unknown";
        }
        catch
        {
            return "unknown";
        }
    }

    
} 