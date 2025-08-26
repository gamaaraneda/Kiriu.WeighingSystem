using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class CreatePermisoRequest
{
    [Required(ErrorMessage = "El nombre del permiso es requerido")]
    [StringLength(50, ErrorMessage = "El nombre no puede exceder los 50 caracteres")]
    public string Nombre { get; set; } = string.Empty;
    
    [StringLength(255, ErrorMessage = "La descripción no puede exceder los 255 caracteres")]
    public string? Descripcion { get; set; }
    
    [Required(ErrorMessage = "El tipo de permiso es requerido")]
    [StringLength(20, ErrorMessage = "El tipo no puede exceder los 20 caracteres")]
    public string Tipo { get; set; } = string.Empty; // CREATE, READ, UPDATE, DELETE, EXPORT
    
    public bool Activo { get; set; } = true;
}