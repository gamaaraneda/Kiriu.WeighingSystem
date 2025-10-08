namespace Kiriu.WeighingSystem.Application.DTOs.Anpr;

/// <summary>
/// DTO para eventos de lectura de placas desde cámaras ANPR
/// </summary>
public class AnprEventDto
{
    /// <summary>
    /// Placa del vehículo leída por la cámara
    /// </summary>
    public string LicensePlate { get; set; } = string.Empty;

    /// <summary>
    /// Tipo de cámara que envió el evento (trailer, remolque, cargo)
    /// </summary>
    public string CameraType { get; set; } = string.Empty;

    /// <summary>
    /// URL de la imagen de la placa capturada
    /// </summary>
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// Nivel de confianza de la lectura (0-100)
    /// </summary>
    public int ConfidenceLevel { get; set; }

    /// <summary>
    /// Dirección de lectura (forward, backward)
    /// </summary>
    public string Direction { get; set; } = string.Empty;

    /// <summary>
    /// Nombre de la cámara que capturó la imagen
    /// </summary>
    public string CameraName { get; set; } = string.Empty;

    /// <summary>
    /// Marca del vehículo detectada
    /// </summary>
    public string? VehicleBrand { get; set; }

    /// <summary>
    /// Color del vehículo detectado
    /// </summary>
    public string? VehicleColor { get; set; }

    /// <summary>
    /// Tipo de vehículo (SUVMPV, Truck, etc.)
    /// </summary>
    public string? VehicleType { get; set; }

    /// <summary>
    /// Fecha y hora de captura del evento
    /// </summary>
    public DateTime CapturedAt { get; set; }

    /// <summary>
    /// Datos binarios de la imagen (para almacenar en BD)
    /// </summary>
    public byte[]? ImageData { get; set; }
}
