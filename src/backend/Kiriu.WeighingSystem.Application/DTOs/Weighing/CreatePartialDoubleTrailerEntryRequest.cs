namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// Request para crear entrada parcial de doble remolque (solo remolque 1)
/// </summary>
public class CreatePartialDoubleTrailerEntryRequest
{
    public string UnitType { get; set; } = string.Empty; // client, provider
    public string TipoUnidad { get; set; } = "doble-remolque";
    public string TrailerPlaca { get; set; } = string.Empty;
    public string? TrailerPlacaFoto { get; set; } // URL de la foto ANPR del tráiler
    public RemolqueDataDto Remolque1 { get; set; } = new();
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public string? ClientProviderRfc { get; set; }

    // Campos para rastrear edición manual durante el registro
    public bool TieneEdicionesManuale { get; set; } = false;
    public string? UsuarioEditor { get; set; }
}
