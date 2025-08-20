using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class WeighingOperation
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Folio { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string UnitType { get; set; } = string.Empty; // client, provider
    
    [Required]
    [MaxLength(20)]
    public string OperationType { get; set; } = string.Empty; // entry, exit
    
    [MaxLength(20)]
    public string? TrailerPlate { get; set; }
    
    [MaxLength(20)]
    public string? TrailerPlate2 { get; set; }
    
    [MaxLength(20)]
    public string? TrailerPlateContenedor { get; set; }
    
    [MaxLength(20)]
    public string? RemolquePlateContenedor { get; set; }
    
    [MaxLength(20)]
    public string? PlacaRemolque1 { get; set; }
    
    [MaxLength(20)]
    public string? PlacaRemolque2 { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Product { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string ClientProviderName { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? ClientProviderRfc { get; set; }
    
    public decimal? EntryWeight { get; set; }
    
    public decimal? ExitWeight { get; set; }
    
    public decimal? NetWeight { get; set; }
    
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = string.Empty; // ENTRADA_REGISTRADA, SALIDA_REGISTRADA
    
    [Required]
    [MaxLength(30)]
    public string TipoUnidad { get; set; } = string.Empty; // remolque, contenedor, doble-remolque
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public DateTime? EntryDate { get; set; }
    
    public DateTime? ExitDate { get; set; }
    
    // Navigation properties
    public virtual ICollection<WeighingPhoto> Photos { get; set; } = new List<WeighingPhoto>();
    public virtual ICollection<WeighingRemolque> Remolques { get; set; } = new List<WeighingRemolque>();
}