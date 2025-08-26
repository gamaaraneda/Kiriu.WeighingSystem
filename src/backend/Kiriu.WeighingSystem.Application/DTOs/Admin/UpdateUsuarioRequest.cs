using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class UpdateUsuarioRequest
{
    [Required(ErrorMessage = "El nombre es requerido")]
    [StringLength(100, ErrorMessage = "El nombre no puede exceder los 100 caracteres")]
    public string Nombre { get; set; } = string.Empty;
    
    [StringLength(100, ErrorMessage = "Los apellidos no pueden exceder los 100 caracteres")]
    public string? Apellidos { get; set; }
    
    [Required(ErrorMessage = "El email es requerido")]
    [EmailAddress(ErrorMessage = "El formato del email no es válido")]
    [StringLength(255, ErrorMessage = "El email no puede exceder los 255 caracteres")]
    public string Email { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "El rol es requerido")]
    public Guid RolId { get; set; }
    
    public bool Activo { get; set; } = true;
    
    [StringLength(255, MinimumLength = 6, ErrorMessage = "La contraseña debe tener entre 6 y 255 caracteres")]
    public string? NuevaContrasena { get; set; }
}