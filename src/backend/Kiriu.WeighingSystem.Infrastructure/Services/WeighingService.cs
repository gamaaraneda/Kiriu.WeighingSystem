using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

public class WeighingService : IWeighingService
{
    private readonly IWeighingOperationRepository _weighingRepository;

    public WeighingService(IWeighingOperationRepository weighingRepository)
    {
        _weighingRepository = weighingRepository;
    }

    public string GenerateFolio()
    {
        // Generate folio with format: KWS-YYYYMMDD-HHMMSS-XXX
        var now = DateTime.UtcNow;
        var randomSuffix = new Random().Next(100, 999);
        return $"KWS-{now:yyyyMMdd}-{now:HHmmss}-{randomSuffix}";
    }


    public async Task<bool> ValidateUniqueEntryAsync(string plate)
    {
        return !await _weighingRepository.HasActiveEntryAsync(plate);
    }

    public async Task<WeighingOperation?> FindActiveEntryAsync(string plate)
    {
        return await _weighingRepository.GetActiveEntryByPlateAsync(plate);
    }

    public async Task<List<string>> GetAllPlatesFromOperation(WeighingOperation operation)
    {
        var plates = new List<string>();

        if (!string.IsNullOrEmpty(operation.TrailerPlate))
            plates.Add(operation.TrailerPlate);
            
        if (!string.IsNullOrEmpty(operation.TrailerPlate2))
            plates.Add(operation.TrailerPlate2);
            
        if (!string.IsNullOrEmpty(operation.TrailerPlateContenedor))
            plates.Add(operation.TrailerPlateContenedor);
            
        if (!string.IsNullOrEmpty(operation.RemolquePlateContenedor))
            plates.Add(operation.RemolquePlateContenedor);
            
        if (!string.IsNullOrEmpty(operation.PlacaRemolque1))
            plates.Add(operation.PlacaRemolque1);
            
        if (!string.IsNullOrEmpty(operation.PlacaRemolque2))
            plates.Add(operation.PlacaRemolque2);

        // Add remolque plates
        plates.AddRange(operation.Remolques.Select(r => r.Placa));

        return plates.Distinct().ToList();
    }
}