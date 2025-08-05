using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class HealthCheckApplicationService : IHealthCheckApplicationService
{
    private readonly IHealthCheckService _healthCheckService;
    private readonly ILogger<HealthCheckApplicationService> _logger;

    public HealthCheckApplicationService(IHealthCheckService healthCheckService, ILogger<HealthCheckApplicationService> logger)
    {
        _healthCheckService = healthCheckService;
        _logger = logger;
    }

    public Task<object> GetBasicHealthAsync()
    {
        var healthInfo = new
        {
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Service = "Kiriu Weighing System API",
            Version = "1.0.0",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"
        };

        return Task.FromResult<object>(healthInfo);
    }

    public async Task<object> GetDetailedHealthAsync()
    {
        var healthChecks = new List<object>();
        var isHealthy = true;

        // Verificar conectividad de base de datos
        try
        {
            var dbConnection = await _healthCheckService.CanConnectToDatabaseAsync();
            healthChecks.Add(new
            {
                Component = "Database",
                Status = dbConnection ? "Healthy" : "Unhealthy",
                Message = dbConnection ? "Conexión exitosa" : "No se puede conectar a la base de datos"
            });

            if (!dbConnection)
                isHealthy = false;
        }
        catch (Exception dbEx)
        {
            healthChecks.Add(new
            {
                Component = "Database",
                Status = "Unhealthy",
                Message = $"Error de conexión: {dbEx.Message}"
            });
            isHealthy = false;
        }

        // Verificar memoria del sistema
        var memoryInfo = await _healthCheckService.GetSystemMemoryInfoAsync();
        var memoryData = (dynamic)memoryInfo;
        healthChecks.Add(new
        {
            Component = "Memory",
            Status = "Healthy",
            Message = $"Memoria disponible: {memoryData.TotalAvailableMemoryMB} MB"
        });

        var detailedHealthInfo = new
        {
            Status = isHealthy ? "Healthy" : "Unhealthy",
            Timestamp = DateTime.UtcNow,
            Service = "Kiriu Weighing System API",
            Version = "1.0.0",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
            Components = healthChecks
        };

        return detailedHealthInfo;
    }

    public string GetPingResponse()
    {
        return "OK";
    }
} 