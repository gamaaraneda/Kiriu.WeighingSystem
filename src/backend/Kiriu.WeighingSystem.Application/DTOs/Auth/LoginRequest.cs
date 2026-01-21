namespace Kiriu.WeighingSystem.Application.DTOs.Auth;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    
    /// <summary>
    /// Información del dispositivo (User-Agent). Se captura automáticamente del contexto HTTP.
    /// </summary>
    public string? DeviceInfo { get; set; }
    
    /// <summary>
    /// Dirección IP del cliente. Se captura automáticamente del contexto HTTP.
    /// </summary>
    public string? IpAddress { get; set; }
} 