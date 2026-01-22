using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class WeighingEditHistoryRepository : IWeighingEditHistoryRepository
{
    private readonly WeighingDbContext _context;

    public WeighingEditHistoryRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<WeighingEditHistory> CreateAsync(WeighingEditHistory historyEntry)
    {
        await _context.WeighingEditHistories.AddAsync(historyEntry);
        await _context.SaveChangesAsync();
        return historyEntry;
    }

    public async Task<List<WeighingEditHistory>> GetByOperationIdAsync(Guid operationId)
    {
        return await _context.WeighingEditHistories
            .Where(h => h.WeighingOperationId == operationId)
            .OrderByDescending(h => h.FechaEdicion)
            .ToListAsync();
    }
}
