using Microsoft.AspNetCore.Mvc;
using Mapster;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    // Almacenamiento en memoria para refresh tokens (NO localStorage)
    private static readonly Dictionary<string, string> _refreshTokens = new();

    public AuthController(
        IUsuarioRepository usuarioRepository,
        IAuthService authService,
        ILogger<AuthController> logger)
    {
        _usuarioRepository = usuarioRepository;
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(LoginRequest request)
    {
        try
        {
            var usuario = await _usuarioRepository.GetByEmailAsync(request.Email);
            if (usuario == null)
            {
                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Credenciales inválidas",
                    Errors = new List<string> { "Email o contraseña incorrectos" }
                });
            }

            var isValidPassword = await _authService.ValidatePasswordAsync(request.Password, usuario.PasswordHash);
            if (!isValidPassword)
            {
                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Credenciales inválidas",
                    Errors = new List<string> { "Email o contraseña incorrectos" }
                });
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

            var response = new LoginResponse
            {
                Token = token,
                RefreshToken = refreshToken,
                User = usuarioDto,
                ExpiresAt = DateTime.UtcNow.AddMinutes(60) // 60 minutos
            };

            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Data = response,
                Message = "Login exitoso"
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
            if (!_refreshTokens.TryGetValue(request.RefreshToken, out var userIdStr))
            {
                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Refresh token inválido",
                    Errors = new List<string> { "El refresh token no es válido o ha expirado" }
                });
            }

            if (!Guid.TryParse(userIdStr, out var userId))
            {
                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Refresh token inválido",
                    Errors = new List<string> { "El refresh token no es válido" }
                });
            }

            var usuario = await _usuarioRepository.GetByIdAsync(userId);
            if (usuario == null || !usuario.Activo)
            {
                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Usuario no encontrado",
                    Errors = new List<string> { "El usuario no existe o está inactivo" }
                });
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

            var response = new LoginResponse
            {
                Token = newToken,
                RefreshToken = newRefreshToken,
                User = usuarioDto,
                ExpiresAt = DateTime.UtcNow.AddMinutes(60)
            };

            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Data = response,
                Message = "Token renovado exitosamente"
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
    public ActionResult<ApiResponse<object>> Logout(LogoutRequest request)
    {
        try
        {
            // Remover refresh token de memoria
            _refreshTokens.Remove(request.RefreshToken);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Logout exitoso"
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
} 