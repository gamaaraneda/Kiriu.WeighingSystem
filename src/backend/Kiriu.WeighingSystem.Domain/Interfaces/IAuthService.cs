using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IAuthService
{
    Task<string> GenerateJwtTokenAsync(Usuario usuario);
    Task<string> GenerateRefreshTokenAsync();
    Task<bool> ValidatePasswordAsync(string password, string passwordHash);
    Task<string> HashPasswordAsync(string password);
    Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId);
} 