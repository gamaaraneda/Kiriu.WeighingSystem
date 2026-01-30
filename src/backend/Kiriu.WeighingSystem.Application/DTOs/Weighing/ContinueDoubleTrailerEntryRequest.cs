namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// Request para continuar entrada de doble remolque con remolque 2
/// </summary>
public class ContinueDoubleTrailerEntryRequest
{
    public string Folio { get; set; } = string.Empty;
    public RemolqueDataDto Remolque2 { get; set; } = new();

    // Campos para rastrear edición manual
    public bool TieneEdicionesManuale { get; set; } = false;
    public string? UsuarioEditor { get; set; }
}
