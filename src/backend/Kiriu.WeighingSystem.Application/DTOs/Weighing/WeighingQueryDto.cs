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
    public string? CreatedBy { get; set; }
    public string? ExitRegisteredBy { get; set; }
    public string? UsuarioEditor { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? EntryDate { get; set; }
    public DateTime? ExitDate { get; set; }
    public List<WeighingPhotoDto> Photos { get; set; } = new();
    public List<RemolqueInfoDto> Remolques { get; set; } = new();
}

public class WeighingPhotoDto
{
    public string Id { get; set; } = string.Empty;
    public string PhotoType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RemolqueInfoDto
{
    public int Numero { get; set; }
    public string Placa { get; set; } = string.Empty;
    public decimal PesoBruto { get; set; }
    public decimal? PesoTara { get; set; }
    public DateTime? FechaRegistro { get; set; }
    public string? RegistradoPor { get; set; }
    public DateTime? FechaSalida { get; set; }
    public string? RegistradoPorSalida { get; set; }
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
    public string PlacaT { get; set; } = string.Empty; // Placa del tráiler
    public string PlacaR { get; set; } = string.Empty; // Placa del remolque
    public string PlacaR2 { get; set; } = string.Empty; // Placa del remolque 2
    public string ClienteProveedor { get; set; } = string.Empty;
    public string Producto { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string TipoUnidad { get; set; } = string.Empty;
    public decimal? PesoBruto { get; set; }
    public decimal? PesoSalida { get; set; }
    public decimal? PesoNeto { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string PesadoEntradaPor { get; set; } = string.Empty; // CreatedBy sin dominio
    public string PesadoSalidaPor { get; set; } = string.Empty; // ExitRegisteredBy sin dominio
    public DateTime? FechaEntrada { get; set; }
    public DateTime? FechaSalida { get; set; }
    public string EditadoPor { get; set; } = string.Empty;
    public DateTime? FechaEdicion { get; set; }

    // Campos adicionales para doble remolque (fechas individuales de cada remolque)
    public DateTime? FechaEntradaRemolque1 { get; set; }
    public DateTime? FechaEntradaRemolque2 { get; set; }
    public DateTime? FechaSalidaRemolque1 { get; set; }
    public DateTime? FechaSalidaRemolque2 { get; set; }

    // Campos adicionales para doble remolque (pesos individuales de cada remolque)
    public decimal? PesoBrutoRemolque1 { get; set; }
    public decimal? PesoBrutoRemolque2 { get; set; }
    public decimal? PesoTaraRemolque1 { get; set; }
    public decimal? PesoTaraRemolque2 { get; set; }
}