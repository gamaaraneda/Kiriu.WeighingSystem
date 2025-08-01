using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    public Guid RolId { get; set; }
    
    public DateTime FechaCreacion { get; set; }
    
    public DateTime? UltimoAcceso { get; set; }
    
    public bool Activo { get; set; }
    
    // Navigation properties
    public virtual Rol Rol { get; set; } = null!;
} 