namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IHealthCheckService
{
    Task<bool> CanConnectToDatabaseAsync();
    Task<object> GetSystemMemoryInfoAsync();
} 