namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IPasswordService
{
    Task<string> HashPasswordAsync(string password);
    Task<bool> ValidatePasswordAsync(string password, string hash);
} 