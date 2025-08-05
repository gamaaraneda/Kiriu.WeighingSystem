namespace Kiriu.WeighingSystem.Application.DTOs.Users;

public class CreateUsuarioResponse
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; }
} 