using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

/// <summary>
/// Servicio de gestión de sesiones de usuario.
/// Implementa la lógica de negocio para control de sesiones concurrentes,
/// garantizando que solo exista una sesión activa por usuario.
/// </summary>
public class UserSessionService : IUserSessionService
{
    private readonly IUserSessionRepository _sessionRepository;
    private readonly ILogger<UserSessionService> _logger;

    public UserSessionService(
        IUserSessionRepository sessionRepository,
        ILogger<UserSessionService> logger)
    {
        _sessionRepository = sessionRepository;
        _logger = logger;
    }

    public async Task<UserSession> CreateSessionAsync(
        Guid userId,
        string tokenJti,
        string refreshToken,
        DateTime expiresAt,
        string? deviceInfo = null,
        string? ipAddress = null)
    {
        _logger.LogInformation("🔐 Creando nueva sesión para usuario {UserId}", userId);

        // NOTA: Ya no se revocan sesiones anteriores automáticamente.
        // El bloqueo de sesiones concurrentes se maneja en AuthApplicationService.LoginAsync()
        // verificando si ya existe una sesión activa ANTES de llegar aquí.

        // Crear la nueva sesión
        var session = new UserSession
        {
            UserId = userId,
            TokenJti = tokenJti,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            DeviceInfo = deviceInfo,
            IpAddress = ipAddress,
            IsActive = true
        };

        var createdSession = await _sessionRepository.CreateAsync(session);

        _logger.LogInformation("✅ Sesión creada exitosamente para usuario {UserId}, JTI: {Jti}", 
            userId, tokenJti);

        return createdSession;
    }

    public async Task<bool> IsSessionActiveAsync(string jti)
    {
        if (string.IsNullOrEmpty(jti))
        {
            _logger.LogWarning("⚠️ Se intentó verificar sesión con JTI vacío");
            return false;
        }

        var isActive = await _sessionRepository.IsSessionActiveByJtiAsync(jti);
        
        if (!isActive)
        {
            _logger.LogDebug("🔒 Sesión con JTI {Jti} no está activa o ha expirado", jti);
        }

        return isActive;
    }

    public async Task<bool> HasActiveSessionAsync(Guid userId)
    {
        return await _sessionRepository.HasActiveSessionAsync(userId);
    }

    public async Task<bool> RevokeSessionAsync(string jti)
    {
        if (string.IsNullOrEmpty(jti))
        {
            _logger.LogWarning("⚠️ Se intentó revocar sesión con JTI vacío");
            return false;
        }

        var result = await _sessionRepository.RevokeSessionByJtiAsync(jti, "Logout solicitado por usuario");
        
        if (result)
        {
            _logger.LogInformation("✅ Sesión con JTI {Jti} revocada exitosamente", jti);
        }
        else
        {
            _logger.LogWarning("⚠️ No se encontró sesión activa con JTI {Jti} para revocar", jti);
        }

        return result;
    }

    public async Task<bool> RevokeSessionByRefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
        {
            _logger.LogWarning("⚠️ Se intentó revocar sesión con refresh token vacío");
            return false;
        }

        var session = await _sessionRepository.GetActiveByRefreshTokenAsync(refreshToken);
        
        if (session == null)
        {
            _logger.LogWarning("⚠️ No se encontró sesión activa con el refresh token proporcionado");
            return false;
        }

        var result = await _sessionRepository.RevokeSessionAsync(session.Id, "Logout solicitado por usuario");
        
        if (result)
        {
            _logger.LogInformation("✅ Sesión {SessionId} revocada exitosamente via refresh token", session.Id);
        }

        return result;
    }

    public async Task<int> RevokeAllUserSessionsAsync(Guid userId)
    {
        _logger.LogInformation("🔒 Revocando todas las sesiones del usuario {UserId}", userId);
        
        var count = await _sessionRepository.RevokeAllUserSessionsAsync(
            userId, 
            "Revocación masiva solicitada");
        
        _logger.LogInformation("✅ Se revocaron {Count} sesiones del usuario {UserId}", count, userId);
        
        return count;
    }

    public async Task<UserSession?> GetActiveSessionAsync(Guid userId)
    {
        return await _sessionRepository.GetActiveSessionByUserIdAsync(userId);
    }

    public async Task<UserSession?> RefreshSessionAsync(
        string refreshToken,
        string newTokenJti,
        string newRefreshToken,
        DateTime newExpiresAt)
    {
        if (string.IsNullOrEmpty(refreshToken))
        {
            _logger.LogWarning("⚠️ Se intentó refrescar sesión con refresh token vacío");
            return null;
        }

        var session = await _sessionRepository.GetActiveByRefreshTokenAsync(refreshToken);
        
        if (session == null)
        {
            _logger.LogWarning("⚠️ Refresh token no válido o sesión expirada");
            return null;
        }

        // Actualizar la sesión con los nuevos tokens
        session.TokenJti = newTokenJti;
        session.RefreshToken = newRefreshToken;
        session.ExpiresAt = newExpiresAt;

        var updatedSession = await _sessionRepository.UpdateAsync(session);
        
        _logger.LogInformation("✅ Sesión {SessionId} renovada exitosamente para usuario {UserId}", 
            session.Id, session.UserId);

        return updatedSession;
    }

    public async Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
        {
            _logger.LogWarning("⚠️ Se intentó buscar sesión con refresh token vacío");
            return null;
        }

        return await _sessionRepository.GetActiveByRefreshTokenAsync(refreshToken);
    }
}
