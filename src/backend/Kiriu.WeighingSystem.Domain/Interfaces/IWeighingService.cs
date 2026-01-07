using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IWeighingService
{
    Task<string> GenerateFolioAsync();
    Task<bool> ValidateUniqueEntryAsync(string plate);
    Task<WeighingOperation?> FindActiveEntryAsync(string plate);
    Task<List<string>> GetAllPlatesFromOperation(WeighingOperation operation);
}