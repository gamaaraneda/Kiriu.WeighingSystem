using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IWeighingEditHistoryRepository
{
    Task<WeighingEditHistory> CreateAsync(WeighingEditHistory historyEntry);
    Task<List<WeighingEditHistory>> GetByOperationIdAsync(Guid operationId);
}
