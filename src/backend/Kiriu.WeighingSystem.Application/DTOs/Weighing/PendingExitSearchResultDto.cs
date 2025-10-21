namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// DTO para resultados de búsqueda de entradas pendientes de salida
/// </summary>
public class PendingExitSearchResultDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string TrailerPlate { get; set; } = string.Empty;
    public string? TrailerPlate2 { get; set; }
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public decimal EntryWeight { get; set; }
    public DateTime CreatedAt { get; set; }
    public string TipoUnidad { get; set; } = string.Empty;

    /// <summary>
    /// Texto para mostrar en el dropdown del autocomplete
    /// Formato: "Folio: XXX | Placa: YYY | Cliente: ZZZ | Producto: AAA"
    /// </summary>
    public string DisplayText => $"Folio: {Folio} | Placa: {TrailerPlate} | Cliente: {ClientProviderName} | Producto: {Product}";
}
