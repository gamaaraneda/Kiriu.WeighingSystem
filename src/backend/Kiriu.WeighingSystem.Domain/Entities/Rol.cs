using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class Rol
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string Descripcion { get; set; } = string.Empty;
    
    public DateTime FechaCreacion { get; set; }
    
    public bool Activo { get; set; }
    
    // Navigation properties
    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    public virtual ICollection<RolePermiso> RolePermisos { get; set; } = new List<RolePermiso>();
} 