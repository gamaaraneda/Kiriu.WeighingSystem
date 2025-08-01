namespace Kiriu.WeighingSystem.Domain.Entities;

public class RolePermiso
{
    public Guid RolId { get; set; }
    
    public Guid ModuloPermisoId { get; set; }
    
    public DateTime FechaAsignacion { get; set; }
    
    // Navigation properties
    public virtual Rol Rol { get; set; } = null!;
    public virtual ModuloPermiso ModuloPermiso { get; set; } = null!;
} 