using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

public class WeighingRemolque
{
    public Guid Id { get; set; }
    
    public Guid WeighingOperationId { get; set; }
    
    public int Numero { get; set; } // 1 o 2 para identificar remolque1 o remolque2
    
    [Required]
    [MaxLength(20)]
    public string Placa { get; set; } = string.Empty;
    
    public decimal PesoBruto { get; set; }
    
    public decimal? PesoTara { get; set; }
    
    public bool PesoCapturado { get; set; }
    
    public bool FotosCapturadas { get; set; }
    
    public bool FotoCargaCapturada { get; set; }
    
    public bool FotoPlacaCapturada { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation property
    public virtual WeighingOperation WeighingOperation { get; set; } = null!;
}