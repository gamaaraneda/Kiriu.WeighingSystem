using System.Text.Json.Serialization;

namespace Kiriu.WeighingSystem.Application.DTOs.Users;

public class CreateUsuarioRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string Email { get; set; } = string.Empty;
    
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
    
    // Campo adicional para compatibilidad con el frontend que envía "contrasena"
    [JsonPropertyName("contrasena")]
    public string Contrasena { get; set; } = string.Empty;
    
    public Guid RolId { get; set; }
    
    // Propiedad calculada que devuelve la contraseña correcta
    public string GetPassword()
    {
        return !string.IsNullOrEmpty(Password) ? Password : Contrasena;
    }
} 