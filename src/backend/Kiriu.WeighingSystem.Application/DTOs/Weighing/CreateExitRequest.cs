namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public class CreateExitRequest
{
    public string Folio { get; set; } = string.Empty;
    public decimal PesoBruto { get; set; }
    public decimal PesoTara { get; set; }
    public decimal PesoNeto { get; set; }
    public string PlacaTrailer { get; set; } = string.Empty;
    public string? PlacaRemolque { get; set; }
    public string? PlacaContenedor { get; set; }
    public string? PlacaTrailerContenedor { get; set; }
    public string? PlacaRemolqueContenedor { get; set; }
    public ExitPhotoDataDto Fotos { get; set; } = new();
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaSalida { get; set; }
    public string TipoUnidad { get; set; } = string.Empty;

    // Campos para rastrear edición manual durante el registro
    public bool TieneEdicionesManuale { get; set; } = false;
    public string? UsuarioEditor { get; set; }
}

public class ExitPhotoDataDto
{
    public string? TrailerPlate { get; set; }
    public string? TrailerPlate2 { get; set; }
    public string CargoState { get; set; } = string.Empty;
    public string? ContainerPlate { get; set; }
}