using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IAuthService _authService;
    private readonly IMapper _mapper;
    private readonly ILogger<UsuariosController> _logger;

    public UsuariosController(
        IUsuarioRepository usuarioRepository,
        IAuthService authService,
        IMapper mapper,
        ILogger<UsuariosController> logger)
    {
        _usuarioRepository = usuarioRepository;
        _authService = authService;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CreateUsuarioResponse>>> CreateUsuario(CreateUsuarioRequest request)
    {
        try
        {
            // Validar que el email no exista
            if (await _usuarioRepository.ExistsByEmailAsync(request.Email))
            {
                return BadRequest(new ApiResponse<CreateUsuarioResponse>
                {
                    Success = false,
                    Message = "El email ya está registrado",
                    Errors = new List<string> { "Ya existe un usuario con este email" }
                });
            }

            // Validar que el rol existe
            if (!await _usuarioRepository.ExistsByRolIdAsync(request.RolId))
            {
                return BadRequest(new ApiResponse<CreateUsuarioResponse>
                {
                    Success = false,
                    Message = "El rol especificado no existe",
                    Errors = new List<string> { "El ID del rol proporcionado no es válido" }
                });
            }

            // Crear el usuario
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                Nombre = request.Nombre,
                Email = request.Email,
                PasswordHash = await _authService.HashPasswordAsync(request.Password),
                RolId = request.RolId,
                FechaCreacion = DateTime.UtcNow,
                Activo = true
            };

            // Guardar en la base de datos
            var usuarioCreado = await _usuarioRepository.AddAsync(usuario);

            // Obtener el rol para la respuesta
            var usuarioCompleto = await _usuarioRepository.GetByIdAsync(usuarioCreado.Id);
            if (usuarioCompleto == null)
            {
                return StatusCode(500, new ApiResponse<CreateUsuarioResponse>
                {
                    Success = false,
                    Message = "Error al recuperar el usuario creado",
                    Errors = new List<string> { "No se pudo recuperar la información del usuario" }
                });
            }

            // Mapear a DTO de respuesta
            var response = new CreateUsuarioResponse
            {
                Id = usuarioCompleto.Id,
                Nombre = usuarioCompleto.Nombre,
                Email = usuarioCompleto.Email,
                Rol = usuarioCompleto.Rol.Nombre,
                FechaCreacion = usuarioCompleto.FechaCreacion
            };

            _logger.LogInformation("Usuario creado exitosamente: {Email}", request.Email);

            return CreatedAtAction(nameof(GetById), new { id = response.Id }, new ApiResponse<CreateUsuarioResponse>
            {
                Success = true,
                Data = response,
                Message = "Usuario creado exitosamente"
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
            var usuario = await _usuarioRepository.GetByIdAsync(id);
            if (usuario == null || !usuario.Activo)
            {
                return NotFound(new ApiResponse<UsuarioDto>
                {
                    Success = false,
                    Message = "Usuario no encontrado",
                    Errors = new List<string> { "El usuario especificado no existe o está inactivo" }
                });
            }

            // Mapear a DTO
            var usuarioDto = _mapper.Map<UsuarioDto>(usuario);
            var permissions = await _authService.GetUserPermissionsAsync(usuario.Id);
            usuarioDto.Permisos = permissions.ToList();

            return Ok(new ApiResponse<UsuarioDto>
            {
                Success = true,
                Data = usuarioDto,
                Message = "Usuario encontrado"
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
            var usuarios = await _usuarioRepository.GetAllAsync();
            var usuariosDto = new List<UsuarioDto>();

            foreach (var usuario in usuarios)
            {
                var usuarioDto = _mapper.Map<UsuarioDto>(usuario);
                var permissions = await _authService.GetUserPermissionsAsync(usuario.Id);
                usuarioDto.Permisos = permissions.ToList();
                usuariosDto.Add(usuarioDto);
            }

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