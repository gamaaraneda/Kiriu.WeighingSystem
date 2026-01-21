using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

/// <summary>
/// Repositorio para gestión de sesiones de usuario
/// </summary>
public interface IUserSessionRepository
{
    /// <summary>
    /// Obtiene una sesión por su ID
    /// </summary>
    Task<UserSession?> GetByIdAsync(Guid id);
    
    /// <summary>
    /// Obtiene una sesión activa por su JTI (JWT ID)
    /// </summary>
    Task<UserSession?> GetActiveByJtiAsync(string jti);
    
    /// <summary>
    /// Obtiene una sesión activa por refresh token
    /// </summary>
    Task<UserSession?> GetActiveByRefreshTokenAsync(string refreshToken);
    
    /// <summary>
    /// Obtiene la sesión activa de un usuario (si existe)
    /// </summary>
    Task<UserSession?> GetActiveSessionByUserIdAsync(Guid userId);
    
    /// <summary>
    /// Obtiene todas las sesiones activas de un usuario
    /// </summary>
    Task<IEnumerable<UserSession>> GetActiveSessionsByUserIdAsync(Guid userId);
    
    /// <summary>
    /// Verifica si un usuario tiene una sesión activa
    /// </summary>
    Task<bool> HasActiveSessionAsync(Guid userId);
    
    /// <summary>
    /// Verifica si un JTI corresponde a una sesión activa
    /// </summary>
    Task<bool> IsSessionActiveByJtiAsync(string jti);
    
    /// <summary>
    /// Crea una nueva sesión
    /// </summary>
    Task<UserSession> CreateAsync(UserSession session);
    
    /// <summary>
    /// Actualiza una sesión existente
    /// </summary>
    Task<UserSession> UpdateAsync(UserSession session);
    
    /// <summary>
    /// Revoca una sesión específica
    /// </summary>
    Task<bool> RevokeSessionAsync(Guid sessionId, string reason);
    
    /// <summary>
    /// Revoca todas las sesiones activas de un usuario
    /// </summary>
    Task<int> RevokeAllUserSessionsAsync(Guid userId, string reason);
    
    /// <summary>
    /// Revoca una sesión por su JTI
    /// </summary>
    Task<bool> RevokeSessionByJtiAsync(string jti, string reason);
    
    /// <summary>
    /// Limpia sesiones expiradas (para mantenimiento)
    /// </summary>
    Task<int> CleanExpiredSessionsAsync();
}
