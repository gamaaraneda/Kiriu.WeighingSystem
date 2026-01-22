namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// DTO para representar una entrada del historial de ediciones
/// </summary>
public class WeighingEditHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string WeighingOperationId { get; set; } = string.Empty;
    public string Justificacion { get; set; } = string.Empty;
    public DateTime FechaEdicion { get; set; }
    public string? UsuarioEditor { get; set; }

    /// <summary>
    /// Valores originales deserializados para fácil acceso en frontend
    /// </summary>
    public OriginalValuesDto? ValoresOriginales { get; set; }
}

/// <summary>
/// DTO para representar los valores originales antes de editar
/// </summary>
public class OriginalValuesDto
{
    public string? Tipo { get; set; }
    public string? TipoUnidad { get; set; }
    public string? ClienteProveedor { get; set; }
    public string? Producto { get; set; }
    public string? TrailerPlate { get; set; }
    public string? TrailerPlate2 { get; set; }
    public string? PlacaRemolque1 { get; set; }
    public string? PlacaRemolque2 { get; set; }
    public string? TrailerPlateContenedor { get; set; }
    public string? RemolquePlateContenedor { get; set; }
}

/// <summary>
/// Request para crear una entrada de historial
/// </summary>
public class CreateEditHistoryRequest
{
    public string Justificacion { get; set; } = string.Empty;
}
