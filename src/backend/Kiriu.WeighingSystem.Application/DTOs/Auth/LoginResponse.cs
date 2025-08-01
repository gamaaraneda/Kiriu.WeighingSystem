using Kiriu.WeighingSystem.Application.DTOs.Users;

namespace Kiriu.WeighingSystem.Application.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public UsuarioDto User { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
} 