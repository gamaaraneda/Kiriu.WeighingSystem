using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

/// <summary>
/// Servicio de dominio para gestión de sesiones de usuario.
/// Implementa la lógica de negocio para control de sesiones concurrentes.
/// </summary>
public interface IUserSessionService
{
    /// <summary>
    /// Crea una nueva sesión para el usuario, revocando cualquier sesión activa previa.
    /// Esto garantiza que solo haya una sesión activa por usuario.
    /// </summary>
    /// <param name="userId">ID del usuario</param>
    /// <param name="tokenJti">JTI del JWT generado</param>
    /// <param name="refreshToken">Refresh token generado</param>
    /// <param name="expiresAt">Fecha de expiración de la sesión</param>
    /// <param name="deviceInfo">Información del dispositivo (User-Agent)</param>
    /// <param name="ipAddress">Dirección IP del cliente</param>
    /// <returns>La sesión creada</returns>
    Task<UserSession> CreateSessionAsync(
        Guid userId, 
        string tokenJti, 
        string refreshToken,
        DateTime expiresAt,
        string? deviceInfo = null, 
        string? ipAddress = null);
    
    /// <summary>
    /// Verifica si una sesión (por JTI) está activa y válida
    /// </summary>
    /// <param name="jti">JWT ID a verificar</param>
    /// <returns>True si la sesión está activa</returns>
    Task<bool> IsSessionActiveAsync(string jti);
    
    /// <summary>
    /// Verifica si el usuario tiene una sesión activa
    /// </summary>
    /// <param name="userId">ID del usuario</param>
    /// <returns>True si tiene sesión activa</returns>
    Task<bool> HasActiveSessionAsync(Guid userId);
    
    /// <summary>
    /// Revoca la sesión actual del usuario (logout)
    /// </summary>
    /// <param name="jti">JTI de la sesión a revocar</param>
    /// <returns>True si se revocó exitosamente</returns>
    Task<bool> RevokeSessionAsync(string jti);
    
    /// <summary>
    /// Revoca la sesión por refresh token (logout)
    /// </summary>
    /// <param name="refreshToken">Refresh token de la sesión</param>
    /// <returns>True si se revocó exitosamente</returns>
    Task<bool> RevokeSessionByRefreshTokenAsync(string refreshToken);
    
    /// <summary>
    /// Revoca todas las sesiones de un usuario
    /// </summary>
    /// <param name="userId">ID del usuario</param>
    /// <returns>Número de sesiones revocadas</returns>
    Task<int> RevokeAllUserSessionsAsync(Guid userId);
    
    /// <summary>
    /// Obtiene información de la sesión activa de un usuario
    /// </summary>
    /// <param name="userId">ID del usuario</param>
    /// <returns>Sesión activa o null</returns>
    Task<UserSession?> GetActiveSessionAsync(Guid userId);
    
    /// <summary>
    /// Valida y renueva una sesión usando el refresh token
    /// </summary>
    /// <param name="refreshToken">Refresh token actual</param>
    /// <param name="newTokenJti">Nuevo JTI para el JWT renovado</param>
    /// <param name="newRefreshToken">Nuevo refresh token</param>
    /// <param name="newExpiresAt">Nueva fecha de expiración</param>
    /// <returns>La sesión actualizada o null si el refresh token no es válido</returns>
    Task<UserSession?> RefreshSessionAsync(
        string refreshToken, 
        string newTokenJti, 
        string newRefreshToken,
        DateTime newExpiresAt);
    
    /// <summary>
    /// Obtiene una sesión activa por su refresh token
    /// </summary>
    /// <param name="refreshToken">Refresh token</param>
    /// <returns>Sesión activa o null</returns>
    Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken);
}
