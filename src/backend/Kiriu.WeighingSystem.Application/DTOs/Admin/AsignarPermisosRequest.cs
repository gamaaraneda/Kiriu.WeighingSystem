using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class AsignarPermisosRequest
{
    [Required(ErrorMessage = "El ID del rol es requerido")]
    public Guid RolId { get; set; }
    
    [Required(ErrorMessage = "La lista de permisos es requerida")]
    public List<Guid> ModuloPermisosIds { get; set; } = new();
}