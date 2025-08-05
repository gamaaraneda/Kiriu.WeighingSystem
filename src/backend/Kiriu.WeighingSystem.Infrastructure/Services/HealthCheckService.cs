using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

public class HealthCheckService : IHealthCheckService
{
    private readonly WeighingDbContext _context;
    private readonly ILogger<HealthCheckService> _logger;

    public HealthCheckService(WeighingDbContext context, ILogger<HealthCheckService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> CanConnectToDatabaseAsync()
    {
        try
        {
            return await _context.Database.CanConnectAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking database connectivity");
            return false;
        }
    }

    public Task<object> GetSystemMemoryInfoAsync()
    {
        var memoryInfo = GC.GetGCMemoryInfo();
        var memoryData = new
        {
            TotalAvailableMemoryBytes = memoryInfo.TotalAvailableMemoryBytes,
            TotalAvailableMemoryMB = memoryInfo.TotalAvailableMemoryBytes / 1024 / 1024
        };

        return Task.FromResult<object>(memoryData);
    }
} 