using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IModuloRepository
{
    Task<IEnumerable<Modulo>> GetAllAsync();
    Task<Modulo?> GetByIdAsync(Guid id);
    Task<Modulo?> GetByNombreAsync(string nombre);
    Task<Modulo> CreateAsync(Modulo modulo);
    Task<Modulo> UpdateAsync(Modulo modulo);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ExistsByNombreAsync(string nombre, Guid? excludeId = null);
    Task<IEnumerable<Modulo>> GetActivosAsync();
    Task<IEnumerable<Modulo>> GetByOrdenAsync();
}