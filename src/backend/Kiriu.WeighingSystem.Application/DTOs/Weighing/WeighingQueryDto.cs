namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

public record WeighingQueryFiltersDto
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public string? Folio { get; set; }
    public string? Placa { get; set; }
    public string? Estado { get; set; } // ENTRADA_REGISTRADA, SALIDA_REGISTRADA
    public string? EdicionPosterior { get; set; } // Todos, Editado, NoEditado
    public int Page { get; set; } = 1;
    public int Size { get; set; } = 10;
}

public class WeighingQueryResultDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string Placas { get; set; } = string.Empty;
    public string ClienteProveedor { get; set; } = string.Empty;
    public string Producto { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty; // client/provider
    public string TipoUnidad { get; set; } = string.Empty; // remolque/contenedor/doble-remolque
    public decimal? PesoBruto { get; set; }
    public decimal? PesoSalida { get; set; }
    public decimal? PesoNeto { get; set; }
    public string Estado { get; set; } = string.Empty;
    public bool FueEditado { get; set; }
    public DateTime? FechaEdicion { get; set; }
    public bool PuedeReimprimir { get; set; }
    public List<WeighingPhotoDto> Photos { get; set; } = new();
}

public class WeighingPhotoDto
{
    public string Id { get; set; } = string.Empty;
    public string PhotoType { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class WeighingQueryResponseDto
{
    public List<WeighingQueryResultDto> Resultados { get; set; } = new();
    public PaginationDto Pagination { get; set; } = new();
}

public class WeighingExportDto
{
    public string Folio { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string Placas { get; set; } = string.Empty;
    public string ClienteProveedor { get; set; } = string.Empty;
    public string Producto { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string TipoUnidad { get; set; } = string.Empty;
    public decimal? PesoBruto { get; set; }
    public decimal? PesoSalida { get; set; }
    public decimal? PesoNeto { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime? FechaEntrada { get; set; }
    public DateTime? FechaSalida { get; set; }
    public string EditadoPor { get; set; } = string.Empty;
    public DateTime? FechaEdicion { get; set; }
}