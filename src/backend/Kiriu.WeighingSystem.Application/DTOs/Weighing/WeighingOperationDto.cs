namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public class WeighingOperationDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string UnitType { get; set; } = string.Empty;
    public string OperationType { get; set; } = string.Empty;
    public string TrailerPlate { get; set; } = string.Empty;
    public string? TrailerPlate2 { get; set; }
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public decimal? EntryWeight { get; set; }
    public decimal? ExitWeight { get; set; }
    public decimal? NetWeight { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class EntrySearchDataDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string TipoUnidad { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    public string Product { get; set; } = string.Empty;
    public decimal EntryWeight { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PlacaTrailer { get; set; }
    public string? PlacaRemolque { get; set; }
    public string? PlacaRemolque1 { get; set; }
    public string? PlacaRemolque2 { get; set; }
    public string? PlacaTrailerContenedor { get; set; }
    public string? PlacaRemolqueContenedor { get; set; }
    public EntryPhotosDto Fotos { get; set; } = new();
}

public class EntryPhotosDto
{
    public string? FotoEntradaTrailer { get; set; }
    public string? FotoEntradaRemolque { get; set; }
    public string? FotoEntradaRemolque1 { get; set; }
    public string? FotoEntradaRemolque2 { get; set; }
    public string FotoCargaEntrada { get; set; } = string.Empty;
}

public class ExitValidationDto
{
    public bool CanExit { get; set; }
    public EntryOperationDto? EntryOperation { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class EntryOperationDto
{
    public string Id { get; set; } = string.Empty;
    public decimal EntryWeight { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ExitResponseDto
{
    public string Folio { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaSalida { get; set; }
    public decimal PesoNeto { get; set; }
    public string Mensaje { get; set; } = string.Empty;
}

public class DoubleTrailerEntryResponseDto
{
    public string Folio { get; set; } = string.Empty;
    public string TrailerPlaca { get; set; } = string.Empty;
    public List<RemolqueResponseDto> Remolques { get; set; } = new();
    public decimal PesoBrutoTotal { get; set; }
    public DateTime FechaHoraEntrada { get; set; }
    public string UnitType { get; set; } = string.Empty;
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
}

public class RemolqueResponseDto
{
    public int Numero { get; set; }
    public string Placa { get; set; } = string.Empty;
    public decimal PesoBruto { get; set; }
    public List<string> Fotos { get; set; } = new();
}

public class PaginatedWeighingOperationsDto
{
    public List<WeighingOperationDto> Operations { get; set; } = new();
    public PaginationDto Pagination { get; set; } = new();
}

public class PaginationDto
{
    public int Page { get; set; }
    public int Size { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}