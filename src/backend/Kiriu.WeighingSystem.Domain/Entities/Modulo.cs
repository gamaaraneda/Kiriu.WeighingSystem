using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class Modulo
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string Descripcion { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string Icono { get; set; } = string.Empty;
    
    public int Orden { get; set; }
    
    public bool Activo { get; set; }
} 