using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class WeighingPhoto
{
    public Guid Id { get; set; }
    
    public Guid WeighingOperationId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string PhotoType { get; set; } = string.Empty; // trailerPlate, trailerPlate2, cargo, remolque1Plate, etc.
    
    [Required]
    [MaxLength(500)]
    public string PhotoUrl { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public virtual WeighingOperation WeighingOperation { get; set; } = null!;
}