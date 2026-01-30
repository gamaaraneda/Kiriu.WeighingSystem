namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// DTO para resultados de búsqueda de operaciones con salida parcial (pendientes de remolque 2).
/// </summary>
public class PendingDoubleTrailerExitSearchResultDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string TrailerPlaca { get; set; } = string.Empty;
    public string PlacaRemolque1 { get; set; } = string.Empty;
    public string PlacaRemolque2 { get; set; } = string.Empty;
    public DateTime FechaSalidaR1 { get; set; }
    public string UsuarioRegistroSalidaR1 { get; set; } = string.Empty;
    public decimal PesoBrutoR1 { get; set; }
    public decimal PesoTaraR1 { get; set; }
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string UnitType { get; set; } = string.Empty;
}
