using System.Text.Json.Serialization;

namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public class UpdateWeighingOperationRequest
{
    public string? UnitType { get; set; }
    public string? TipoUnidad { get; set; }
    public string? TrailerPlate { get; set; }
    public string? TrailerPlate2 { get; set; }
    public string? TrailerPlateContenedor { get; set; }
    public string? RemolquePlateContenedor { get; set; }
    public string? PlacaRemolque1 { get; set; }
    public string? PlacaRemolque2 { get; set; }
    public string? Product { get; set; }
    public string? ClientProviderName { get; set; }
    public string? ClientProviderRfc { get; set; }
    public decimal? EntryWeight { get; set; }
    public decimal? ExitWeight { get; set; }

    /// <summary>
    /// Indica si esta actualización fue realizada manualmente por el usuario
    /// </summary>
    public bool EsEdicionManual { get; set; } = false;

    /// <summary>
    /// Usuario que realiza la edición (se obtiene automáticamente del token JWT)
    /// Este campo es asignado por el controlador, no debe ser enviado desde el frontend
    /// </summary>
    [JsonIgnore]
    public string? UsuarioEditor { get; set; }

    /// <summary>
    /// Justificación de la edición (obligatorio para ediciones manuales, máximo 70 caracteres)
    /// </summary>
    public string? Justificacion { get; set; }
}