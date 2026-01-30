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

    /// <summary>
    /// Usuario que registró este remolque (email del usuario)
    /// </summary>
    [MaxLength(255)]
    public string? RegistradoPor { get; set; }

    /// <summary>
    /// Fecha y hora en que se registró este remolque
    /// </summary>
    public DateTime? FechaRegistro { get; set; }

    /// <summary>
    /// Estado del remolque: PENDIENTE, REGISTRADO
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string Estado { get; set; } = "PENDIENTE";

    /// <summary>
    /// Fecha/hora en que se registró la salida de este remolque (salida en partes).
    /// </summary>
    public DateTime? FechaSalida { get; set; }

    /// <summary>
    /// Usuario que registró la salida de este remolque (email).
    /// </summary>
    [MaxLength(255)]
    public string? RegistradoPorSalida { get; set; }

    // Navigation property
    public virtual WeighingOperation WeighingOperation { get; set; } = null!;
}