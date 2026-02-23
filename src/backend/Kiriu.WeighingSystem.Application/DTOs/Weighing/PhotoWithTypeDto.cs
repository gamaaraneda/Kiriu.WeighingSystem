namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// DTO para representar una foto con su tipo (placa o carga)
/// </summary>
public class PhotoWithTypeDto
{
    /// <summary>
    /// URL de la foto
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Tipo de foto: "plate" (placa) o "cargo" (carga)
    /// </summary>
    public string Type { get; set; } = string.Empty;
}
