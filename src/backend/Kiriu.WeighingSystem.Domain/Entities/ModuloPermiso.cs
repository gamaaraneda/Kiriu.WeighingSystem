using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class ModuloPermiso
{
    public Guid Id { get; set; }
    
    public Guid ModuloId { get; set; }
    
    public Guid PermisoId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Codigo { get; set; } = string.Empty; // PESAJES.CREATE, etc.
    
    [MaxLength(255)]
    public string Descripcion { get; set; } = string.Empty;
    
    // Navigation properties
    public virtual Modulo Modulo { get; set; } = null!;
    public virtual Permiso Permiso { get; set; } = null!;
} 