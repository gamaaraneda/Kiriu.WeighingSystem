namespace Kiriu.WeighingSystem.Application.DTOs.Users;

public class UsuarioDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public List<string> Permisos { get; set; } = new List<string>(); // Lista de códigos como PESAJES.CREATE
} 