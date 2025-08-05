using Mapster;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class AuthApplicationService : IAuthApplicationService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IAuthService _authService;
    private readonly ILogger<AuthApplicationService> _logger;

    // Almacenamiento en memoria para refresh tokens (NO localStorage)
    private static readonly Dictionary<string, string> _refreshTokens = new();

    public AuthApplicationService(
        IUsuarioRepository usuarioRepository,
        IAuthService authService,
        ILogger<AuthApplicationService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _authService = authService;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var usuario = await _usuarioRepository.GetByEmailAsync(request.Email);
        if (usuario == null)
        {
            throw new InvalidOperationException("Email o contraseña incorrectos");
        }

        var isValidPassword = await _authService.ValidatePasswordAsync(request.Password, usuario.PasswordHash);
        if (!isValidPassword)
        {
            throw new InvalidOperationException("Email o contraseña incorrectos");
        }

        // Actualizar último acceso
        usuario.UltimoAcceso = DateTime.UtcNow;
        await _usuarioRepository.UpdateAsync(usuario);

        // Generar tokens
        var token = await _authService.GenerateJwtTokenAsync(usuario);
        var refreshToken = await _authService.GenerateRefreshTokenAsync();

        // Almacenar refresh token en memoria
        _refreshTokens[refreshToken] = usuario.Id.ToString();

        // Mapear usuario a DTO
        var usuarioDto = usuario.Adapt<UsuarioDto>();
        var permissions = await _authService.GetUserPermissionsAsync(usuario.Id);
        usuarioDto.Permisos = permissions.ToList();

        return new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            User = usuarioDto,
            ExpiresAt = DateTime.UtcNow.AddMinutes(60) // 60 minutos
        };
    }

    public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        if (!_refreshTokens.TryGetValue(request.RefreshToken, out var userIdStr))
        {
            throw new InvalidOperationException("El refresh token no es válido o ha expirado");
        }

        if (!Guid.TryParse(userIdStr, out var userId))
        {
            throw new InvalidOperationException("El refresh token no es válido");
        }

        var usuario = await _usuarioRepository.GetByIdAsync(userId);
        if (usuario == null || !usuario.Activo)
        {
            throw new InvalidOperationException("El usuario no existe o está inactivo");
        }

        // Generar nuevos tokens
        var newToken = await _authService.GenerateJwtTokenAsync(usuario);
        var newRefreshToken = await _authService.GenerateRefreshTokenAsync();

        // Remover refresh token anterior y agregar el nuevo
        _refreshTokens.Remove(request.RefreshToken);
        _refreshTokens[newRefreshToken] = usuario.Id.ToString();

        // Mapear usuario a DTO
        var usuarioDto = usuario.Adapt<UsuarioDto>();
        var permissions = await _authService.GetUserPermissionsAsync(usuario.Id);
        usuarioDto.Permisos = permissions.ToList();

        return new LoginResponse
        {
            Token = newToken,
            RefreshToken = newRefreshToken,
            User = usuarioDto,
            ExpiresAt = DateTime.UtcNow.AddMinutes(60)
        };
    }

    public Task<bool> LogoutAsync(LogoutRequest request)
    {
        // Remover refresh token de memoria
        _refreshTokens.Remove(request.RefreshToken);
        return Task.FromResult(true);
    }
} 