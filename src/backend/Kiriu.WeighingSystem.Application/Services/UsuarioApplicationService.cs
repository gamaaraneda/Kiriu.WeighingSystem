using Mapster;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Exceptions;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class UsuarioApplicationService : IUsuarioApplicationService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IPasswordService _passwordService;
    private readonly ILogger<UsuarioApplicationService> _logger;

    public UsuarioApplicationService(
        IUsuarioRepository usuarioRepository,
        IPasswordService passwordService,
        ILogger<UsuarioApplicationService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _passwordService = passwordService;
        _logger = logger;
    }

    public async Task<CreateUsuarioResponse> CreateUsuarioAsync(CreateUsuarioRequest request)
    {
        // Validar que el email no exista
        if (await _usuarioRepository.ExistsByEmailAsync(request.Email))
        {
            throw new ConflictException("Ya existe un usuario con este email");
        }

        // Validar que el rol existe
        if (!await _usuarioRepository.ExistsByRolIdAsync(request.RolId))
        {
            throw new ValidationException("El ID del rol proporcionado no es válido");
        }

        // Crear el hash de la contraseña
        var passwordHash = await _passwordService.HashPasswordAsync(request.GetPassword());
        _logger.LogInformation("🔐 HASH GENERADO para {Email}: {Hash}", request.Email, passwordHash);

        // Crear el usuario
        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Apellidos = request.Apellidos,
            Email = request.Email,
            PasswordHash = passwordHash,
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
            throw new NotFoundException("No se pudo recuperar la información del usuario");
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
            throw new NotFoundException("Usuario no encontrado");
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