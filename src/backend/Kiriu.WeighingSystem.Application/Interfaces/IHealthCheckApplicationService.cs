namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IHealthCheckApplicationService
{
    Task<object> GetBasicHealthAsync();
    Task<object> GetDetailedHealthAsync();
    string GetPingResponse();
} 