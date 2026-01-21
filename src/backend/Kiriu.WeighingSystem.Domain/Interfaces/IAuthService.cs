using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IAuthService
{
    /// <summary>
    /// Genera un JWT token para el usuario con un JTI específico para control de sesiones
    /// </summary>
    /// <param name="usuario">Usuario para generar el token</param>
    /// <param name="jti">JWT ID único para identificar la sesión (opcional, se genera automáticamente si no se proporciona)</param>
    /// <returns>Token JWT y el JTI utilizado</returns>
    Task<(string Token, string Jti)> GenerateJwtTokenAsync(Usuario usuario, string? jti = null);
    
    Task<string> GenerateRefreshTokenAsync();
    Task<bool> ValidatePasswordAsync(string password, string passwordHash);
    Task<string> HashPasswordAsync(string password);
    Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId);
} 