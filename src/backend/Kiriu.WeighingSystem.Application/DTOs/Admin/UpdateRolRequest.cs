using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class UpdateRolRequest
{
    [Required(ErrorMessage = "El nombre del rol es requerido")]
    [StringLength(50, ErrorMessage = "El nombre no puede exceder los 50 caracteres")]
    public string Nombre { get; set; } = string.Empty;
    
    [StringLength(255, ErrorMessage = "La descripción no puede exceder los 255 caracteres")]
    public string? Descripcion { get; set; }
    
    public bool Activo { get; set; }
    
    public List<Guid> PermisosIds { get; set; } = new();
}