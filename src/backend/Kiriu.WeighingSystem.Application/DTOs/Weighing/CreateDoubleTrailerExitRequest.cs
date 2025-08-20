namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public class CreateDoubleTrailerExitRequest
{
    public string Folio { get; set; } = string.Empty;
    public string PlacaTrailer { get; set; } = string.Empty;
    public RemolqueExitDataDto Remolque1 { get; set; } = new();
    public RemolqueExitDataDto Remolque2 { get; set; } = new();
    public decimal PesoBrutoTotal { get; set; }
    public decimal PesoNetoCalculado { get; set; }
    public DateTime FechaSalida { get; set; }
    public DoubleTrailerExitPhotoDataDto Fotos { get; set; } = new();
}

public class RemolqueExitDataDto
{
    public string Placa { get; set; } = string.Empty;
    public decimal PesoTara { get; set; }
    public bool FotoCargaCapturada { get; set; }
}

public class DoubleTrailerExitPhotoDataDto
{
    public string TrailerPlate { get; set; } = string.Empty;
    public string Remolque1Plate { get; set; } = string.Empty;
    public string Remolque2Plate { get; set; } = string.Empty;
    public string CargoRemolque1 { get; set; } = string.Empty;
    public string CargoRemolque2 { get; set; } = string.Empty;
}