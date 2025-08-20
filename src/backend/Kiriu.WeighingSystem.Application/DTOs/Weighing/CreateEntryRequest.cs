namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public class CreateEntryRequest
{
    public string UnitType { get; set; } = string.Empty; // client, provider
    public string OperationType { get; set; } = string.Empty; // entry
    public string TipoUnidad { get; set; } = string.Empty; // remolque, contenedor, doble-remolque
    public string TrailerPlate { get; set; } = string.Empty;
    public string? TrailerPlate2 { get; set; }
    public string? TrailerPlateContenedor { get; set; }
    public string? RemolquePlateContenedor { get; set; }
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public string? ClientProviderRfc { get; set; }
    public decimal EntryWeight { get; set; }
    public PhotoDataDto Photos { get; set; } = new();
}

public class PhotoDataDto
{
    public string? TrailerPlate { get; set; }
    public string? TrailerPlate2 { get; set; }
    public string Cargo { get; set; } = string.Empty;
    public string? Remolque1Plate { get; set; }
    public string? Remolque2Plate { get; set; }
    public string? CargoRemolque2 { get; set; }
}