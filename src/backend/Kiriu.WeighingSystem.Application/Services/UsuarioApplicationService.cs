using Mapster;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class UsuarioApplicationService : IUsuarioApplicationService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IAuthService _authService;
    private readonly ILogger<UsuarioApplicationService> _logger;

    public UsuarioApplicationService(
        IUsuarioRepository usuarioRepository,
        IAuthService authService,
        ILogger<UsuarioApplicationService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _authService = authService;
        _logger = logger;
    }

    public async Task<CreateUsuarioResponse> CreateUsuarioAsync(CreateUsuarioRequest request)
    {
        // Validar que el email no exista
        if (await _usuarioRepository.ExistsByEmailAsync(request.Email))
        {
            throw new InvalidOperationException("Ya existe un usuario con este email");
        }

        // Validar que el rol existe
        if (!await _usuarioRepository.ExistsByRolIdAsync(request.RolId))
        {
            throw new InvalidOperationException("El ID del rol proporcionado no es válido");
        }

        // Crear el usuario
        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Apellidos = request.Apellidos,
            Email = request.Email,
            PasswordHash = await _authService.HashPasswordAsync(request.Password),
            RolId = request.RolId,
            FechaCreacion = DateTime.UtcNow,
            Activo = true
        };

        // Guardar en la base de datos
        var usuarioCreado = await _usuarioRepository.AddAsync(usuario);

        // Obtener el usuario completo con rol
        var usuarioCompleto = await _usuarioRepository.GetByIdAsync(usuarioCreado.Id);
        if (usuarioCompleto == null)
        {
            throw new InvalidOperationException("No se pudo recuperar la información del usuario");
        }

        // Mapear a DTO de respuesta
        var response = usuarioCompleto.Adapt<CreateUsuarioResponse>();

        _logger.LogInformation("Usuario creado exitosamente: {Email}", request.Email);

        return response;
    }

    public async Task<UsuarioDto> GetUsuarioByIdAsync(Guid id)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(id);
        if (usuario == null)
        {
            throw new InvalidOperationException("Usuario no encontrado");
        }

        return usuario.Adapt<UsuarioDto>();
    }

    public async Task<IEnumerable<UsuarioDto>> GetAllUsuariosAsync()
    {
        var usuarios = await _usuarioRepository.GetAllAsync();
        return usuarios.Select(u => u.Adapt<UsuarioDto>());
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        return await _usuarioRepository.ExistsByEmailAsync(email);
    }

    public async Task<bool> ExistsByRolIdAsync(Guid rolId)
    {
        return await _usuarioRepository.ExistsByRolIdAsync(rolId);
    }
} 