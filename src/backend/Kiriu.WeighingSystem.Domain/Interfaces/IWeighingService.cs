using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IWeighingService
{
    string GenerateFolio();
    string DetermineTipoUnidad(string? trailerPlate, string? trailerPlateContenedor, bool hasMultipleRemolques);
    Task<bool> ValidateUniqueEntryAsync(string plate);
    Task<WeighingOperation?> FindActiveEntryAsync(string plate);
    Task<List<string>> GetAllPlatesFromOperation(WeighingOperation operation);
}