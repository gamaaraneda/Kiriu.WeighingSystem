using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IRolRepository
{
    Task<IEnumerable<Rol>> GetAllAsync();
    Task<Rol?> GetByIdAsync(Guid id);
    Task<Rol?> GetByIdWithPermisosAsync(Guid id);
    Task<Rol?> GetByNombreAsync(string nombre);
    Task<Rol> CreateAsync(Rol rol);
    Task<Rol> UpdateAsync(Rol rol);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ExistsByNombreAsync(string nombre, Guid? excludeId = null);
    Task<bool> HasUsuariosAsignadosAsync(Guid rolId);
    Task<int> GetUsuariosCountAsync(Guid rolId);
}