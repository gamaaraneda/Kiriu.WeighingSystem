using Microsoft.AspNetCore.Mvc;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Application.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthApplicationService _authApplicationService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthApplicationService authApplicationService,
        ILogger<AuthController> logger)
    {
        _authApplicationService = authApplicationService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(LoginRequest request)
    {
        try
        {
            var response = await _authApplicationService.LoginAsync(request);

            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Data = response,
                Message = "Login exitoso"
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Credenciales inválidas",
                Errors = new List<string> { ex.Message }
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
            var response = await _authApplicationService.RefreshTokenAsync(request);

            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Data = response,
                Message = "Token renovado exitosamente"
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Refresh token inválido",
                Errors = new List<string> { ex.Message }
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
    public async Task<ActionResult<ApiResponse<object>>> Logout(LogoutRequest request)
    {
        try
        {
            await _authApplicationService.LogoutAsync(request);

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