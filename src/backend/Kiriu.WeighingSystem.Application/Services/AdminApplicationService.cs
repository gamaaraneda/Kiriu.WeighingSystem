using Mapster;
using Kiriu.WeighingSystem.Application.DTOs.Admin;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Exceptions;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class AdminApplicationService : IAdminApplicationService
{
    private readonly IRolRepository _rolRepository;
    private readonly IPermisoRepository _permisoRepository;
    private readonly IModuloRepository _moduloRepository;
    private readonly IModuloPermisoRepository _moduloPermisoRepository;
    private readonly IRolePermisoRepository _rolePermisoRepository;
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IPasswordService _passwordService;

    public AdminApplicationService(
        IRolRepository rolRepository,
        IPermisoRepository permisoRepository,
        IModuloRepository moduloRepository,
        IModuloPermisoRepository moduloPermisoRepository,
        IRolePermisoRepository rolePermisoRepository,
        IUsuarioRepository usuarioRepository,
        IPasswordService passwordService)
    {
        _rolRepository = rolRepository;
        _permisoRepository = permisoRepository;
        _moduloRepository = moduloRepository;
        _moduloPermisoRepository = moduloPermisoRepository;
        _rolePermisoRepository = rolePermisoRepository;
        _usuarioRepository = usuarioRepository;
        _passwordService = passwordService;
    }

    #region Gestión de Roles

    public async Task<IEnumerable<RolDto>> GetAllRolesAsync()
    {
        var roles = await _rolRepository.GetAllAsync();
        var rolesDto = new List<RolDto>();

        foreach (var rol in roles)
        {
            var rolDto = rol.Adapt<RolDto>();
            rolDto.UsuariosAsignados = await _rolRepository.GetUsuariosCountAsync(rol.Id);
            rolesDto.Add(rolDto);
        }

        return rolesDto;
    }

    public async Task<RolDto> GetRolByIdAsync(Guid id)
    {
        var rol = await _rolRepository.GetByIdWithPermisosAsync(id);
        if (rol == null)
            throw new NotFoundException($"Rol con ID {id} no encontrado");

        var rolDto = rol.Adapt<RolDto>();
        rolDto.UsuariosAsignados = await _rolRepository.GetUsuariosCountAsync(id);

        return rolDto;
    }

    public async Task<RolDto> CreateRolAsync(CreateRolRequest request)
    {
        if (await _rolRepository.ExistsByNombreAsync(request.Nombre))
            throw new ConflictException($"Ya existe un rol con el nombre '{request.Nombre}'");

        var rol = request.Adapt<Rol>();
        rol = await _rolRepository.CreateAsync(rol);

        // Asignar permisos si se proporcionaron
        if (request.PermisosIds?.Any() == true)
        {
            await AsignarPermisosARolInternalAsync(rol.Id, request.PermisosIds);
        }

        return await GetRolByIdAsync(rol.Id);
    }

    public async Task<RolDto> UpdateRolAsync(Guid id, UpdateRolRequest request)
    {
        var rol = await _rolRepository.GetByIdAsync(id);
        if (rol == null)
            throw new NotFoundException($"Rol con ID {id} no encontrado");

        if (await _rolRepository.ExistsByNombreAsync(request.Nombre, id))
            throw new ConflictException($"Ya existe un rol con el nombre '{request.Nombre}'");

        rol.Nombre = request.Nombre;
        rol.Descripcion = request.Descripcion ?? string.Empty;
        rol.Activo = request.Activo;

        await _rolRepository.UpdateAsync(rol);

        // Actualizar permisos
        await _rolePermisoRepository.DeleteAllByRolIdAsync(id);
        if (request.PermisosIds?.Any() == true)
        {
            await AsignarPermisosARolInternalAsync(id, request.PermisosIds);
        }

        return await GetRolByIdAsync(id);
    }

    public async Task<bool> DeleteRolAsync(Guid id)
    {
        var rol = await _rolRepository.GetByIdAsync(id);
        if (rol == null)
            throw new NotFoundException($"Rol con ID {id} no encontrado");

        if (await _rolRepository.HasUsuariosAsignadosAsync(id))
            throw new ConflictException("No se puede eliminar un rol que tiene usuarios asignados");

        await _rolePermisoRepository.DeleteAllByRolIdAsync(id);
        return await _rolRepository.DeleteAsync(id);
    }

    #endregion

    #region Gestión de Permisos

    public async Task<IEnumerable<PermisoDto>> GetAllPermisosAsync()
    {
        var permisos = await _permisoRepository.GetAllAsync();
        return permisos.Adapt<IEnumerable<PermisoDto>>();
    }

    public async Task<PermisoDto> GetPermisoByIdAsync(Guid id)
    {
        var permiso = await _permisoRepository.GetByIdAsync(id);
        if (permiso == null)
            throw new NotFoundException($"Permiso con ID {id} no encontrado");

        return permiso.Adapt<PermisoDto>();
    }

    public async Task<PermisoDto> CreatePermisoAsync(CreatePermisoRequest request)
    {
        if (await _permisoRepository.ExistsByNombreAsync(request.Nombre))
            throw new ConflictException($"Ya existe un permiso con el nombre '{request.Nombre}'");

        var permiso = request.Adapt<Permiso>();
        permiso = await _permisoRepository.CreateAsync(permiso);

        return permiso.Adapt<PermisoDto>();
    }

    public async Task<PermisoDto> UpdatePermisoAsync(Guid id, CreatePermisoRequest request)
    {
        var permiso = await _permisoRepository.GetByIdAsync(id);
        if (permiso == null)
            throw new NotFoundException($"Permiso con ID {id} no encontrado");

        if (await _permisoRepository.ExistsByNombreAsync(request.Nombre, id))
            throw new ConflictException($"Ya existe un permiso con el nombre '{request.Nombre}'");

        permiso.Nombre = request.Nombre;
        permiso.Descripcion = request.Descripcion ?? string.Empty;
        permiso.Tipo = request.Tipo;
        permiso.Activo = request.Activo;

        await _permisoRepository.UpdateAsync(permiso);
        return permiso.Adapt<PermisoDto>();
    }

    public async Task<bool> DeletePermisoAsync(Guid id)
    {
        var permiso = await _permisoRepository.GetByIdAsync(id);
        if (permiso == null)
            throw new NotFoundException($"Permiso con ID {id} no encontrado");

        return await _permisoRepository.DeleteAsync(id);
    }

    public async Task<IEnumerable<PermisoDto>> GetPermisosByTipoAsync(string tipo)
    {
        var permisos = await _permisoRepository.GetByTipoAsync(tipo);
        return permisos.Adapt<IEnumerable<PermisoDto>>();
    }

    #endregion

    #region Gestión de Módulos

    public async Task<IEnumerable<ModuloDto>> GetAllModulosAsync()
    {
        var modulos = await _moduloRepository.GetAllAsync();
        var modulosDto = new List<ModuloDto>();

        foreach (var modulo in modulos)
        {
            var moduloDto = modulo.Adapt<ModuloDto>();
            var permisos = await _moduloPermisoRepository.GetByModuloIdAsync(modulo.Id);
            moduloDto.Permisos = permisos.Adapt<List<ModuloPermisoDto>>();
            modulosDto.Add(moduloDto);
        }

        return modulosDto;
    }

    public async Task<ModuloDto> GetModuloByIdAsync(Guid id)
    {
        var modulo = await _moduloRepository.GetByIdAsync(id);
        if (modulo == null)
            throw new NotFoundException($"Módulo con ID {id} no encontrado");

        var moduloDto = modulo.Adapt<ModuloDto>();
        var permisos = await _moduloPermisoRepository.GetByModuloIdAsync(id);
        moduloDto.Permisos = permisos.Adapt<List<ModuloPermisoDto>>();

        return moduloDto;
    }

    public async Task<ModuloDto> CreateModuloAsync(CreateModuloRequest request)
    {
        if (await _moduloRepository.ExistsByNombreAsync(request.Nombre))
            throw new ConflictException($"Ya existe un módulo con el nombre '{request.Nombre}'");

        var modulo = request.Adapt<Modulo>();
        modulo = await _moduloRepository.CreateAsync(modulo);

        return await GetModuloByIdAsync(modulo.Id);
    }

    public async Task<ModuloDto> UpdateModuloAsync(Guid id, CreateModuloRequest request)
    {
        var modulo = await _moduloRepository.GetByIdAsync(id);
        if (modulo == null)
            throw new NotFoundException($"Módulo con ID {id} no encontrado");

        if (await _moduloRepository.ExistsByNombreAsync(request.Nombre, id))
            throw new ConflictException($"Ya existe un módulo con el nombre '{request.Nombre}'");

        modulo.Nombre = request.Nombre;
        modulo.Descripcion = request.Descripcion ?? string.Empty;
        modulo.Icono = request.Icono ?? string.Empty;
        modulo.Orden = request.Orden;
        modulo.Activo = request.Activo;

        await _moduloRepository.UpdateAsync(modulo);
        return await GetModuloByIdAsync(id);
    }

    public async Task<bool> DeleteModuloAsync(Guid id)
    {
        var modulo = await _moduloRepository.GetByIdAsync(id);
        if (modulo == null)
            throw new NotFoundException($"Módulo con ID {id} no encontrado");

        return await _moduloRepository.DeleteAsync(id);
    }

    #endregion

    #region Gestión de Usuarios

    public async Task<IEnumerable<UsuarioDto>> GetAllUsuariosWithRolesAsync()
    {
        var usuarios = await _usuarioRepository.GetAllWithRolesAsync();
        return usuarios.Adapt<IEnumerable<UsuarioDto>>();
    }

    public async Task<SearchUsuariosResponse> SearchUsuariosAsync(SearchUsuariosRequest request)
    {
        var (usuarios, totalCount) = await _usuarioRepository.SearchUsuariosAsync(
            search: request.Search,
            rolId: request.RolId,
            activo: request.Activo,
            pageNumber: request.PageNumber,
            pageSize: request.PageSize);

        var usuariosDto = usuarios.Adapt<IEnumerable<UsuarioDto>>();
        
        var totalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);

        return new SearchUsuariosResponse
        {
            Usuarios = usuariosDto,
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalPages = totalPages,
            HasPreviousPage = request.PageNumber > 1,
            HasNextPage = request.PageNumber < totalPages
        };
    }

    public async Task<CreateUsuarioResponse> CreateUsuarioAsync(CreateUsuarioRequest request)
    {
        // Validar que el email no exista
        if (await _usuarioRepository.ExistsByEmailAsync(request.Email))
        {
            throw new ConflictException("Ya existe un usuario con este email");
        }

        // Validar que el rol existe
        var rol = await _rolRepository.GetByIdAsync(request.RolId);
        if (rol == null)
        {
            throw new ValidationException("El ID del rol proporcionado no es válido");
        }

        // Crear el usuario
        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Apellidos = request.Apellidos,
            Email = request.Email,
            PasswordHash = await _passwordService.HashPasswordAsync(request.Password),
            RolId = request.RolId,
            FechaCreacion = DateTime.UtcNow,
            Activo = true
        };

        // Guardar en la base de datos
        var usuarioCreado = await _usuarioRepository.AddAsync(usuario);

        // Obtener el usuario completo con rol
        var usuarioCompleto = await _usuarioRepository.GetByIdWithRolAsync(usuarioCreado.Id);
        if (usuarioCompleto == null)
        {
            throw new NotFoundException("No se pudo recuperar la información del usuario");
        }

        // Mapear a DTO de respuesta
        return usuarioCompleto.Adapt<CreateUsuarioResponse>();
    }

    public async Task<UsuarioDto> UpdateUsuarioAsync(Guid id, UpdateUsuarioRequest request)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(id);
        if (usuario == null)
            throw new NotFoundException($"Usuario con ID {id} no encontrado");

        if (await _usuarioRepository.GetByEmailAsync(request.Email) is Usuario existingUser && existingUser.Id != id)
            throw new ConflictException($"Ya existe un usuario con el email '{request.Email}'");

        usuario.Nombre = request.Nombre;
        usuario.Apellidos = request.Apellidos;
        usuario.Email = request.Email;
        usuario.RolId = request.RolId;
        usuario.Activo = request.Activo;

        if (!string.IsNullOrEmpty(request.NuevaContrasena))
        {
            usuario.PasswordHash = await _passwordService.HashPasswordAsync(request.NuevaContrasena);
        }

        await _usuarioRepository.UpdateAsync(usuario);
        var updatedUsuario = await _usuarioRepository.GetByIdWithRolAsync(id) 
            ?? throw new NotFoundException($"Usuario con ID {id} no encontrado después de la actualización");
        
        return updatedUsuario.Adapt<UsuarioDto>();
    }

    public async Task<bool> DeleteUsuarioAsync(Guid id)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(id);
        if (usuario == null)
            throw new NotFoundException($"Usuario con ID {id} no encontrado");

        return await _usuarioRepository.DeleteAsync(id);
    }

    #endregion

    #region Asignación de Permisos

    public async Task<bool> AsignarPermisosARolAsync(AsignarPermisosRequest request)
    {
        await AsignarPermisosARolInternalAsync(request.RolId, request.ModuloPermisosIds);
        return true;
    }

    private async Task AsignarPermisosARolInternalAsync(Guid rolId, List<Guid> moduloPermisosIds)
    {
        var rol = await _rolRepository.GetByIdAsync(rolId);
        if (rol == null)
            throw new NotFoundException($"Rol con ID {rolId} no encontrado");

        // Eliminar permisos existentes
        await _rolePermisoRepository.DeleteAllByRolIdAsync(rolId);

        // Agregar nuevos permisos
        foreach (var moduloPermisoId in moduloPermisosIds)
        {
            var rolePermiso = new RolePermiso
            {
                RolId = rolId,
                ModuloPermisoId = moduloPermisoId
            };

            await _rolePermisoRepository.CreateAsync(rolePermiso);
        }
    }

    public async Task<IEnumerable<ModuloPermisoDto>> GetPermisosDeRolAsync(Guid rolId)
    {
        var rolePermisos = await _rolePermisoRepository.GetByRolIdAsync(rolId);
        return rolePermisos.Select(rp => rp.ModuloPermiso.Adapt<ModuloPermisoDto>());
    }

    public async Task<IEnumerable<RolDto>> GetRolesWithPermisosAsync()
    {
        var roles = await _rolRepository.GetAllAsync();
        var rolesDto = new List<RolDto>();

        foreach (var rol in roles)
        {
            var rolDto = rol.Adapt<RolDto>();
            var rolePermisos = await _rolePermisoRepository.GetByRolIdAsync(rol.Id);
            rolDto.Permisos = rolePermisos.Select(rp => rp.ModuloPermiso.Permiso.Adapt<PermisoDto>()).ToList();
            rolDto.UsuariosAsignados = await _rolRepository.GetUsuariosCountAsync(rol.Id);
            rolesDto.Add(rolDto);
        }

        return rolesDto;
    }

    #endregion
}