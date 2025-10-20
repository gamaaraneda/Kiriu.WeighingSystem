using Kiriu.WeighingSystem.SerialGateway.Models;

namespace Kiriu.WeighingSystem.SerialGateway.Services;

public interface ISerialWeighingService : IDisposable
{
    Task<WeightReading> GetWeightAsync(CancellationToken cancellationToken = default);
}
