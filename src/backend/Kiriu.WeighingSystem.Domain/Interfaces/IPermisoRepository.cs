using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IPermisoRepository
{
    Task<IEnumerable<Permiso>> GetAllAsync();
    Task<Permiso?> GetByIdAsync(Guid id);
    Task<Permiso?> GetByNombreAsync(string nombre);
    Task<Permiso> CreateAsync(Permiso permiso);
    Task<Permiso> UpdateAsync(Permiso permiso);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ExistsByNombreAsync(string nombre, Guid? excludeId = null);
    Task<IEnumerable<Permiso>> GetByTipoAsync(string tipo);
}