using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IModuloPermisoRepository
{
    Task<IEnumerable<ModuloPermiso>> GetAllAsync();
    Task<ModuloPermiso?> GetByIdAsync(Guid id);
    Task<IEnumerable<ModuloPermiso>> GetByModuloIdAsync(Guid moduloId);
    Task<IEnumerable<ModuloPermiso>> GetByPermisoIdAsync(Guid permisoId);
    Task<ModuloPermiso> CreateAsync(ModuloPermiso moduloPermiso);
    Task<ModuloPermiso> UpdateAsync(ModuloPermiso moduloPermiso);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ExistsByCodigoAsync(string codigo, Guid? excludeId = null);
}