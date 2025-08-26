using Kiriu.WeighingSystem.Application.DTOs.Admin;
using Kiriu.WeighingSystem.Application.DTOs.Users;

namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IAdminApplicationService
{
    // Gestión de Roles
    Task<IEnumerable<RolDto>> GetAllRolesAsync();
    Task<SearchRolesResponse> SearchRolesAsync(SearchRolesRequest request);
    Task<RolDto> GetRolByIdAsync(Guid id);
    Task<RolDto> CreateRolAsync(CreateRolRequest request);
    Task<RolDto> UpdateRolAsync(Guid id, UpdateRolRequest request);
    Task<bool> DeleteRolAsync(Guid id);

    // Gestión de Permisos
    Task<IEnumerable<PermisoDto>> GetAllPermisosAsync();
    Task<PermisoDto> GetPermisoByIdAsync(Guid id);
    Task<PermisoDto> CreatePermisoAsync(CreatePermisoRequest request);
    Task<PermisoDto> UpdatePermisoAsync(Guid id, CreatePermisoRequest request);
    Task<bool> DeletePermisoAsync(Guid id);
    Task<IEnumerable<PermisoDto>> GetPermisosByTipoAsync(string tipo);

    // Gestión de Módulos
    Task<IEnumerable<ModuloDto>> GetAllModulosAsync();
    Task<ModuloDto> GetModuloByIdAsync(Guid id);
    Task<ModuloDto> CreateModuloAsync(CreateModuloRequest request);
    Task<ModuloDto> UpdateModuloAsync(Guid id, CreateModuloRequest request);
    Task<bool> DeleteModuloAsync(Guid id);

    // Gestión de Usuarios (funcionalidad extendida)
    Task<IEnumerable<UsuarioDto>> GetAllUsuariosWithRolesAsync();
    Task<SearchUsuariosResponse> SearchUsuariosAsync(SearchUsuariosRequest request);
    Task<CreateUsuarioResponse> CreateUsuarioAsync(CreateUsuarioRequest request);
    Task<UsuarioDto> UpdateUsuarioAsync(Guid id, UpdateUsuarioRequest request);
    Task<bool> DeleteUsuarioAsync(Guid id);

    // Asignación de Permisos a Roles
    Task<bool> AsignarPermisosARolAsync(AsignarPermisosRequest request);
    Task<IEnumerable<ModuloPermisoDto>> GetPermisosDeRolAsync(Guid rolId);
    Task<IEnumerable<RolDto>> GetRolesWithPermisosAsync();
}