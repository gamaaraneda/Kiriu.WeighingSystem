using Kiriu.WeighingSystem.Application.DTOs.Auth;

namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IAuthApplicationService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task<bool> LogoutAsync(LogoutRequest request);
} 