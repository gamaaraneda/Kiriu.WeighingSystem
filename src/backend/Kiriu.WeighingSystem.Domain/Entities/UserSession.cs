using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

/// <summary>
/// Representa una sesión activa de usuario para control de sesiones concurrentes.
/// Solo se permite una sesión activa por usuario a la vez.
/// </summary>
public class UserSession
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// ID del usuario propietario de la sesión
    /// </summary>
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Identificador único del JWT (JWT ID claim)
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string TokenJti { get; set; } = string.Empty;
    
    /// <summary>
    /// Refresh token asociado a esta sesión
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string RefreshToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Información del dispositivo (User-Agent)
    /// </summary>
    [MaxLength(500)]
    public string? DeviceInfo { get; set; }
    
    /// <summary>
    /// Dirección IP desde donde se inició la sesión
    /// </summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// Fecha y hora de creación de la sesión
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Fecha y hora de expiración de la sesión
    /// </summary>
    public DateTime ExpiresAt { get; set; }
    
    /// <summary>
    /// Fecha y hora en que la sesión fue revocada (si aplica)
    /// </summary>
    public DateTime? RevokedAt { get; set; }
    
    /// <summary>
    /// Indica si la sesión está activa
    /// </summary>
    public bool IsActive { get; set; }
    
    /// <summary>
    /// Razón de revocación (si aplica)
    /// </summary>
    [MaxLength(200)]
    public string? RevocationReason { get; set; }
    
    // Navigation properties
    public virtual Usuario Usuario { get; set; } = null!;
}
