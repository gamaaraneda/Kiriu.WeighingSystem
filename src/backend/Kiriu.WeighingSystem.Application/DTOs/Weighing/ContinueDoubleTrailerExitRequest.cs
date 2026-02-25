namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// Request para continuar salida de doble remolque con remolque 2.
/// </summary>
public class ContinueDoubleTrailerExitRequest
{
    public string Folio { get; set; } = string.Empty;
    public RemolqueExitDataDto Remolque2 { get; set; } = new();
    public DateTime FechaSalida { get; set; }
    public ContinueDoubleTrailerExitPhotoDataDto Fotos { get; set; } = new();
    /// <summary>Usuario que registra la salida del remolque 2 (email). Se asigna desde el controller desde JWT.</summary>
    public string? UsuarioRegistroSalida { get; set; }

    // Campos para rastrear edición manual
    public bool TieneEdicionesManuale { get; set; } = false;
    public string? UsuarioEditor { get; set; }
}

/// <summary>
/// Fotos solo del remolque 2 para continue exit.
/// </summary>
public class ContinueDoubleTrailerExitPhotoDataDto
{
    public string Remolque2Plate { get; set; } = string.Empty;
    public string CargoRemolque2 { get; set; } = string.Empty;
}
