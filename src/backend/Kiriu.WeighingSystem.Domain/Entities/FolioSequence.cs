using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

/// <summary>
/// Entidad para almacenar el consecutivo global de folios
/// Solo debe existir un registro en esta tabla
/// </summary>
public class FolioSequence
{
    [Key]
    public int Id { get; set; } = 1; // Siempre será 1, solo un registro
    
    /// <summary>
    /// Consecutivo global actual para folios
    /// Se incrementa cada vez que se registra una nueva entrada
    /// </summary>
    [Required]
    public long CurrentSequence { get; set; } = 0;
    
    /// <summary>
    /// Fecha de última actualización
    /// </summary>
    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

