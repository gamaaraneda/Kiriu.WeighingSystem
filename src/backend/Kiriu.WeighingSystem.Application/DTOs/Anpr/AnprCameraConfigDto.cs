namespace Kiriu.WeighingSystem.Application.DTOs.Anpr;

/// <summary>
/// DTO para configuración de cámaras ANPR
/// </summary>
public class AnprCameraConfigDto
{
    /// <summary>
    /// Puerto donde escucha el endpoint HTTP para esta cámara
    /// </summary>
    public int Port { get; set; }

    /// <summary>
    /// Timeout en segundos para esperar respuesta de la cámara
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Indica si la cámara está habilitada
    /// </summary>
    public bool Enabled { get; set; } = true;
}

/// <summary>
/// DTO para configuración completa del sistema ANPR
/// </summary>
public class AnprSystemConfigDto
{
    /// <summary>
    /// Configuración de la cámara de placa de tráiler
    /// </summary>
    public AnprCameraConfigDto TrailerCamera { get; set; } = new();

    /// <summary>
    /// Configuración de la cámara de placa de remolque
    /// </summary>
    public AnprCameraConfigDto RemolqueCamera { get; set; } = new();

    /// <summary>
    /// Configuración de la cámara de placa de carga/contenedor
    /// </summary>
    public AnprCameraConfigDto CargoCamera { get; set; } = new();

    /// <summary>
    /// Ruta base donde se almacenarán las imágenes de placas
    /// </summary>
    public string ImageStoragePath { get; set; } = "uploads/plates";
}
