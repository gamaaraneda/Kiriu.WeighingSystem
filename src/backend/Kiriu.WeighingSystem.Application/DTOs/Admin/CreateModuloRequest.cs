using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class CreateModuloRequest
{
    [Required(ErrorMessage = "El nombre del módulo es requerido")]
    [StringLength(50, ErrorMessage = "El nombre no puede exceder los 50 caracteres")]
    public string Nombre { get; set; } = string.Empty;
    
    [StringLength(255, ErrorMessage = "La descripción no puede exceder los 255 caracteres")]
    public string? Descripcion { get; set; }
    
    [StringLength(50, ErrorMessage = "El ícono no puede exceder los 50 caracteres")]
    public string? Icono { get; set; }
    
    public int Orden { get; set; }
    
    public bool Activo { get; set; } = true;
}