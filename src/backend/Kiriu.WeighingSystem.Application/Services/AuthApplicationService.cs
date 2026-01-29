using Mapster;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Exceptions;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class AuthApplicationService : IAuthApplicationService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IAuthService _authService;
    private readonly IUserSessionService _sessionService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthApplicationService> _logger;

    public AuthApplicationService(
        IUsuarioRepository usuarioRepository,
        IAuthService authService,
        IUserSessionService sessionService,
        IConfiguration configuration,
        ILogger<AuthApplicationService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _authService = authService;
        _sessionService = sessionService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("🔑 Intentando login para: {Email}", request.Email);

        var usuario = await _usuarioRepository.GetByEmailAsync(request.Email);
        if (usuario == null)
        {
            _logger.LogWarning("❌ Usuario no encontrado: {Email}", request.Email);
            throw new UnauthorizedException("Email o contraseña incorrectos");
        }

        _logger.LogInformation("✅ Usuario encontrado: {Email}, ID: {Id}", usuario.Email, usuario.Id);
        _logger.LogInformation("   Activo: {Activo}", usuario.Activo);

        var isValidPassword = await _authService.ValidatePasswordAsync(request.Password, usuario.PasswordHash);
        if (!isValidPassword)
        {
            _logger.LogWarning("❌ Contraseña inválida para: {Email}", request.Email);
            throw new UnauthorizedException("Email o contraseña incorrectos");
        }

        _logger.LogInformation("✅ Credenciales válidas para: {Email}", request.Email);

        // Verificar si el usuario ya tiene una sesión activa en otro dispositivo
        var hasActiveSession = await _sessionService.HasActiveSessionAsync(usuario.Id);
        if (hasActiveSession)
        {
            var activeSession = await _sessionService.GetActiveSessionAsync(usuario.Id);

            // Obtener la vigencia configurada del token en minutos
            var sessionValidityMinutes = Convert.ToInt32(_configuration["JwtSettings:SessionValidityInMinutes"] ?? "10");

            // Calcular el tiempo transcurrido desde la creación de la sesión
            var sessionAge = DateTime.UtcNow - activeSession.CreatedAt;
            var minutesRemaining = sessionValidityMinutes - (int)sessionAge.TotalMinutes;

            // Si ya expiró el tiempo de vigencia, permitir login
            if (minutesRemaining <= 0)
            {
                _logger.LogInformation("✅ Sesión anterior expiró. Permitiendo nuevo login para {Email}", request.Email);
                // Revocar la sesión expirada
                await _sessionService.RevokeSessionAsync(activeSession.TokenJti);
            }
            else
            {
                // Token todavía vigente, bloquear login
                _logger.LogWarning("🚫 Login bloqueado para {Email}: ya tiene sesión activa desde {Device} ({IP}). {Minutes} minutos restantes.",
                    request.Email,
                    activeSession?.DeviceInfo ?? "Dispositivo desconocido",
                    activeSession?.IpAddress ?? "IP desconocida",
                    minutesRemaining);

                var message = minutesRemaining == 1
                    ? $"Ya existe una sesión activa para este usuario. Podrás iniciar sesión en {minutesRemaining} minuto."
                    : $"Ya tienes una sesión activa para este usuario. Podrás iniciar sesión en {minutesRemaining} minutos.";

                throw new ActiveSessionExistsException(
                    message,
                    activeSession?.DeviceInfo,
                    activeSession?.IpAddress,
                    activeSession?.CreatedAt,
                    minutesRemaining
                );
            }
        }

        // Actualizar último acceso
        usuario.UltimoAcceso = DateTime.UtcNow;
        await _usuarioRepository.UpdateAsync(usuario);

        // Generar tokens con JTI para control de sesiones
        var (token, jti) = await _authService.GenerateJwtTokenAsync(usuario);
        var refreshToken = await _authService.GenerateRefreshTokenAsync();

        // Calcular fecha de expiración
        var expirationMinutes = Convert.ToInt32(_configuration["JwtSettings:ExpirationInMinutes"] ?? "60");
        var refreshTokenDays = Convert.ToInt32(_configuration["JwtSettings:RefreshTokenExpirationInDays"] ?? "7");
        var expiresAt = DateTime.UtcNow.AddDays(refreshTokenDays); // La sesión expira con el refresh token

        // Crear sesión en BD (esto revocará automáticamente sesiones previas del usuario)
        // El servicio de sesiones se encarga de invalidar sesiones anteriores
        await _sessionService.CreateSessionAsync(
            userId: usuario.Id,
            tokenJti: jti,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            deviceInfo: request.DeviceInfo,
            ipAddress: request.IpAddress
        );

        _logger.LogInformation("✅ Login exitoso para: {Email}. Sesión creada con JTI: {Jti}", request.Email, jti);

        // Mapear usuario a DTO
        var usuarioDto = usuario.Adapt<UsuarioDto>();
        var permissions = await _authService.GetUserPermissionsAsync(usuario.Id);
        usuarioDto.Permisos = permissions.ToList();

        return new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            User = usuarioDto,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes) // Expiración del JWT
        };
    }

    public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        _logger.LogInformation("🔄 Intentando renovar sesión con refresh token");

        // Buscar la sesión por refresh token
        var session = await _sessionService.GetSessionByRefreshTokenAsync(request.RefreshToken);
        
        if (session == null)
        {
            _logger.LogWarning("❌ Refresh token no válido o sesión expirada");
            throw new UnauthorizedException("El refresh token no es válido o ha expirado");
        }

        var usuario = await _usuarioRepository.GetByIdAsync(session.UserId);
        if (usuario == null || !usuario.Activo)
        {
            _logger.LogWarning("❌ Usuario no existe o está inactivo: {UserId}", session.UserId);
            throw new UnauthorizedException("El usuario no existe o está inactivo");
        }

        // Generar nuevos tokens
        var (newToken, newJti) = await _authService.GenerateJwtTokenAsync(usuario);
        var newRefreshToken = await _authService.GenerateRefreshTokenAsync();
        
        var refreshTokenDays = Convert.ToInt32(_configuration["JwtSettings:RefreshTokenExpirationInDays"] ?? "7");
        var newExpiresAt = DateTime.UtcNow.AddDays(refreshTokenDays);

        // Actualizar la sesión con los nuevos tokens
        var updatedSession = await _sessionService.RefreshSessionAsync(
            request.RefreshToken,
            newJti,
            newRefreshToken,
            newExpiresAt
        );

        if (updatedSession == null)
        {
            _logger.LogWarning("❌ No se pudo renovar la sesión");
            throw new UnauthorizedException("No se pudo renovar la sesión");
        }

        _logger.LogInformation("✅ Sesión renovada exitosamente para usuario {Email}", usuario.Email);

        // Mapear usuario a DTO
        var usuarioDto = usuario.Adapt<UsuarioDto>();
        var permissions = await _authService.GetUserPermissionsAsync(usuario.Id);
        usuarioDto.Permisos = permissions.ToList();

        var expirationMinutes = Convert.ToInt32(_configuration["JwtSettings:ExpirationInMinutes"] ?? "60");

        return new LoginResponse
        {
            Token = newToken,
            RefreshToken = newRefreshToken,
            User = usuarioDto,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };
    }

    public async Task<bool> LogoutAsync(LogoutRequest request)
    {
        _logger.LogInformation("🚪 Procesando logout");

        // Revocar la sesión por refresh token
        var result = await _sessionService.RevokeSessionByRefreshTokenAsync(request.RefreshToken);

        if (result)
        {
            _logger.LogInformation("✅ Logout exitoso");
        }
        else
        {
            _logger.LogWarning("⚠️ No se encontró sesión activa para revocar (puede que ya haya expirado)");
        }

        return true; // Siempre retornamos true para no revelar información
    }
}
