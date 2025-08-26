using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IRolePermisoRepository
{
    Task<IEnumerable<RolePermiso>> GetByRolIdAsync(Guid rolId);
    Task<IEnumerable<RolePermiso>> GetByModuloPermisoIdAsync(Guid moduloPermisoId);
    Task<RolePermiso> CreateAsync(RolePermiso rolePermiso);
    Task<bool> DeleteAsync(Guid rolId, Guid moduloPermisoId);
    Task<bool> DeleteAllByRolIdAsync(Guid rolId);
    Task<bool> ExistsAsync(Guid rolId, Guid moduloPermisoId);
    Task<IEnumerable<RolePermiso>> GetPermisosForRolAsync(Guid rolId);
}