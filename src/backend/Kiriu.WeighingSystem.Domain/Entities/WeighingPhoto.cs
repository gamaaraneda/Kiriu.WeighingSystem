using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class WeighingPhoto
{
    public Guid Id { get; set; }

    public Guid? WeighingOperationId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string PhotoType { get; set; } = string.Empty; // trailerPlate, trailerPlate2, cargo, remolque1Plate, etc.

    /// <summary>
    /// Tipo FINAL de la foto según el request (trailerPlate, trailerPlate2, cargo, etc.)
    /// Este campo almacena el tipo real de la foto después de inversiones u otras transformaciones.
    /// </summary>
    [MaxLength(50)]
    public string? FinalPhotoType { get; set; }

    [Required]
    [MaxLength(500)]
    public string PhotoUrl { get; set; } = string.Empty;

    /// <summary>
    /// Datos binarios de la imagen (almacenados en BD)
    /// </summary>
    public byte[]? ImageData { get; set; }

    /// <summary>
    /// Tipo MIME de la imagen (image/jpeg, image/png)
    /// </summary>
    [MaxLength(50)]
    public string? ContentType { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public virtual WeighingOperation WeighingOperation { get; set; } = null!;
}