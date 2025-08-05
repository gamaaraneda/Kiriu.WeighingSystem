using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Exceptions;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous] // Permitir acceso sin autenticación para endpoints de auth
public class AuthController : ControllerBase
{
    private readonly IAuthApplicationService _authApplicationService;
    private readonly IUsuarioApplicationService _usuarioApplicationService;
    private readonly WeighingDbContext _context;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthApplicationService authApplicationService,
        IUsuarioApplicationService usuarioApplicationService,
        WeighingDbContext context,
        ILogger<AuthController> logger)
    {
        _authApplicationService = authApplicationService;
        _usuarioApplicationService = usuarioApplicationService;
        _context = context;
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
        catch (UnauthorizedException ex)
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
        catch (UnauthorizedException ex)
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
        catch (UnauthorizedException ex)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Error en logout",
                Errors = new List<string> { ex.Message }
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

    /// <summary>
    /// Endpoint temporal para inicializar datos de prueba
    /// SOLO PARA DESARROLLO - ELIMINAR EN PRODUCCIÓN
    /// </summary>
    [HttpPost("init-test-data")]
    public async Task<ActionResult<ApiResponse<object>>> InitializeTestData()
    {
        try
        {
            // Verificar si ya existe un rol administrador
            var adminRol = await _context.Roles.FirstOrDefaultAsync(r => r.Nombre == "Administrador");
            
            if (adminRol == null)
            {
                // Crear rol administrador
                adminRol = new Domain.Entities.Rol
                {
                    Id = Guid.NewGuid(),
                    Nombre = "Administrador",
                    Descripcion = "Rol de administrador del sistema",
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                };
                _context.Roles.Add(adminRol);
                await _context.SaveChangesAsync();
            }

            // Eliminar usuario existente si existe (para recrear con hash correcto)
            var existingUser = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email == "admin@kiriu.com");
            if (existingUser != null)
            {
                _context.Usuarios.Remove(existingUser);
                await _context.SaveChangesAsync();
            }

            // Crear usuario administrador nuevo
            var createRequest = new CreateUsuarioRequest
            {
                Nombre = "Administrador",
                Apellidos = "Sistema",
                Email = "admin@kiriu.com",
                Password = "Admin123!",
                RolId = adminRol.Id
            };

            await _usuarioApplicationService.CreateUsuarioAsync(createRequest);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Datos de prueba inicializados correctamente",
                Data = new
                {
                    AdminEmail = "admin@kiriu.com",
                    AdminPassword = "Admin123!",
                    Message = "Usa estas credenciales para hacer login"
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing test data");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Error al inicializar datos de prueba",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    /// <summary>
    /// Endpoint temporal para verificar hash de contraseña
    /// SOLO PARA DESARROLLO - ELIMINAR EN PRODUCCIÓN
    /// </summary>
    [HttpPost("verify-password")]
    public async Task<ActionResult<ApiResponse<object>>> VerifyPassword([FromBody] LoginRequest request)
    {
        try
        {
            var user = await _context.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Email == request.Email && u.Activo);

            if (user == null)
            {
                return Ok(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Usuario no encontrado",
                    Data = new { Email = request.Email, UserExists = false }
                });
            }

            var passwordService = HttpContext.RequestServices.GetRequiredService<Domain.Interfaces.IPasswordService>();
            var isValid = await passwordService.ValidatePasswordAsync(request.Password, user.PasswordHash);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Verificación completada",
                Data = new
                {
                    Email = user.Email,
                    UserExists = true,
                    PasswordValid = isValid,
                    PasswordHash = user.PasswordHash,
                    UserId = user.Id,
                    UserName = user.Nombre,
                    UserRole = user.Rol?.Nombre
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying password");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Error al verificar contraseña",
                Errors = new List<string> { ex.Message }
            });
        }
    }
} 