namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// Response para entrada parcial de doble remolque
/// </summary>
public class PartialDoubleTrailerEntryResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string TrailerPlaca { get; set; } = string.Empty;
    public RemolqueResponseDto Remolque1 { get; set; } = new();
    public DateTime FechaHoraRegistroR1 { get; set; }
    public string UsuarioRegistroR1 { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "ENTRADA_PARCIAL_R1"
    public string UnitType { get; set; } = string.Empty;
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
}
