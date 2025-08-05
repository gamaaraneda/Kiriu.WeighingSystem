using Microsoft.AspNetCore.Mvc;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioApplicationService _usuarioApplicationService;
    private readonly ILogger<UsuariosController> _logger;

    public UsuariosController(
        IUsuarioApplicationService usuarioApplicationService,
        ILogger<UsuariosController> logger)
    {
        _usuarioApplicationService = usuarioApplicationService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CreateUsuarioResponse>>> CreateUsuario(CreateUsuarioRequest request)
    {
        try
        {
            var response = await _usuarioApplicationService.CreateUsuarioAsync(request);

            return CreatedAtAction(nameof(GetById), new { id = response.Id }, new ApiResponse<CreateUsuarioResponse>
            {
                Success = true,
                Data = response,
                Message = "Usuario creado exitosamente"
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<CreateUsuarioResponse>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear usuario: {Email}", request.Email);
            return StatusCode(500, new ApiResponse<CreateUsuarioResponse>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UsuarioDto>>> GetById(Guid id)
    {
        try
        {
            var usuarioDto = await _usuarioApplicationService.GetUsuarioByIdAsync(id);

            return Ok(new ApiResponse<UsuarioDto>
            {
                Success = true,
                Data = usuarioDto,
                Message = "Usuario encontrado"
            });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ApiResponse<UsuarioDto>
            {
                Success = false,
                Message = "Usuario no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener usuario: {Id}", id);
            return StatusCode(500, new ApiResponse<UsuarioDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<UsuarioDto>>>> GetAll()
    {
        try
        {
            var usuariosDto = await _usuarioApplicationService.GetAllUsuariosAsync();

            return Ok(new ApiResponse<IEnumerable<UsuarioDto>>
            {
                Success = true,
                Data = usuariosDto,
                Message = "Usuarios obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener usuarios");
            return StatusCode(500, new ApiResponse<IEnumerable<UsuarioDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }
} 