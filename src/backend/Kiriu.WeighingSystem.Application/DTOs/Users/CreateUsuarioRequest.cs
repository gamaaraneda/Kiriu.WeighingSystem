namespace Kiriu.WeighingSystem.Application.DTOs.Users;

public class CreateUsuarioRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Guid RolId { get; set; }
} 