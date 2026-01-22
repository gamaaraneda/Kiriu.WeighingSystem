using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

/// <summary>
/// Entidad que almacena el histórico de ediciones de operaciones de pesaje
/// </summary>
public class WeighingEditHistory
{
    public Guid Id { get; set; }

    [Required]
    public Guid WeighingOperationId { get; set; }

    [Required]
    [MaxLength(70)]
    public string Justificacion { get; set; } = string.Empty;

    /// <summary>
    /// JSON con los valores originales antes de la edición
    /// Formato: { "tipo": "cliente", "clienteProveedor": "ABC", ... }
    /// </summary>
    [Required]
    public string ValoresOriginales { get; set; } = string.Empty;

    public DateTime FechaEdicion { get; set; } = DateTime.UtcNow;

    [MaxLength(255)]
    public string? UsuarioEditor { get; set; }

    // Navigation properties
    public virtual WeighingOperation? WeighingOperation { get; set; }
}
