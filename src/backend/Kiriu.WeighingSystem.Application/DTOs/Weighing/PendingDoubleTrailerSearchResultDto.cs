namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// DTO para resultados de búsqueda de operaciones parciales de doble remolque
/// </summary>
public class PendingDoubleTrailerSearchResultDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string TrailerPlaca { get; set; } = string.Empty;
    public string PlacaRemolque1 { get; set; } = string.Empty;
    public DateTime FechaRegistroR1 { get; set; }
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public decimal PesoBrutoR1 { get; set; }
    public string UsuarioRegistroR1 { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string UnitType { get; set; } = string.Empty;
}
