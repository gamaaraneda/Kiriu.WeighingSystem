namespace Kiriu.WeighingSystem.Application.Exceptions;

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message) { }
}

public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}

/// <summary>
/// Excepción que se lanza cuando un usuario intenta iniciar sesión
/// pero ya tiene una sesión activa en otro dispositivo.
/// </summary>
public class ActiveSessionExistsException : Exception
{
    /// <summary>
    /// Información del dispositivo donde está activa la sesión
    /// </summary>
    public string? DeviceInfo { get; }
    
    /// <summary>
    /// Dirección IP donde está activa la sesión
    /// </summary>
    public string? IpAddress { get; }
    
    /// <summary>
    /// Fecha de creación de la sesión activa
    /// </summary>
    public DateTime? SessionCreatedAt { get; }

    public ActiveSessionExistsException(string message) : base(message) { }
    
    public ActiveSessionExistsException(
        string message, 
        string? deviceInfo = null, 
        string? ipAddress = null,
        DateTime? sessionCreatedAt = null) : base(message)
    {
        DeviceInfo = deviceInfo;
        IpAddress = ipAddress;
        SessionCreatedAt = sessionCreatedAt;
    }
} 