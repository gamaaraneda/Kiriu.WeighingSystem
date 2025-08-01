using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class Permiso
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string Descripcion { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Tipo { get; set; } = string.Empty;
    
    public DateTime FechaCreacion { get; set; }
    
    public bool Activo { get; set; }
} 