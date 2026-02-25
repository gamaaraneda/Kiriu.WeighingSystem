namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// Request para registrar salida parcial de doble remolque (solo remolque 1).
/// </summary>
public class CreatePartialDoubleTrailerExitRequest
{
    public string Folio { get; set; } = string.Empty;
    public string PlacaTrailer { get; set; } = string.Empty;
    public RemolqueExitDataDto Remolque1 { get; set; } = new();
    public DateTime FechaSalida { get; set; }
    public PartialDoubleTrailerExitPhotoDataDto Fotos { get; set; } = new();
    /// <summary>Usuario que registra la salida (email). Se asigna desde el controller desde JWT.</summary>
    public string? UsuarioRegistroSalida { get; set; }

    // Campos para rastrear edición manual durante el registro
    public bool TieneEdicionesManuale { get; set; } = false;
    public string? UsuarioEditor { get; set; }
}

/// <summary>
/// Fotos solo del remolque 1 para salida parcial.
/// </summary>
public class PartialDoubleTrailerExitPhotoDataDto
{
    public string TrailerPlate { get; set; } = string.Empty;
    public string Remolque1Plate { get; set; } = string.Empty;
    public string CargoRemolque1 { get; set; } = string.Empty;
}
