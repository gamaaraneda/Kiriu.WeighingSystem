namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public class CreateDoubleTrailerEntryRequest
{
    public string UnitType { get; set; } = string.Empty; // client, provider
    public string TipoUnidad { get; set; } = "doble-remolque"; // Siempre será doble-remolque para este endpoint
    public string TrailerPlaca { get; set; } = string.Empty;
    public List<RemolqueDataDto> Remolques { get; set; } = new();
    public decimal PesoBrutoTotal { get; set; }
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    
    // Campos para rastrear edición manual durante el registro
    public bool TieneEdicionesManuale { get; set; } = false;
    public string? UsuarioEditor { get; set; }
}

public class RemolqueDataDto
{
    public int Numero { get; set; }
    public string Placa { get; set; } = string.Empty;
    public decimal PesoBruto { get; set; }
    public List<string> Fotos { get; set; } = new();
    public bool PesoCapturado { get; set; }
    public bool FotosCapturadas { get; set; }
    public bool FotoCargaCapturada { get; set; }
    public bool FotoPlacaCapturada { get; set; }
}