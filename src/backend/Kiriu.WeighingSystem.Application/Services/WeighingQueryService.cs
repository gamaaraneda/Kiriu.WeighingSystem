using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Kiriu.WeighingSystem.Application.Services;

public class WeighingQueryService : IWeighingQueryService
{
    private readonly IWeighingOperationRepository _weighingRepository;
    private readonly ILogger<WeighingQueryService> _logger;

    public WeighingQueryService(
        IWeighingOperationRepository weighingRepository,
        ILogger<WeighingQueryService> logger)
    {
        _weighingRepository = weighingRepository;
        _logger = logger;
    }

    public async Task<ApiResponse<WeighingQueryResponseDto>> QueryWeighingOperationsAsync(WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Consultando operaciones de pesaje con filtros: {@Filters}", filters);

            var operations = await _weighingRepository.QueryOperationsAsync(
                filters.FechaDesde,
                filters.FechaHasta,
                filters.Folio,
                filters.Placa,
                filters.Estado,
                filters.EdicionPosterior,
                filters.Page,
                filters.Size
            );

            var totalCount = await _weighingRepository.CountOperationsAsync(
                filters.FechaDesde,
                filters.FechaHasta,
                filters.Folio,
                filters.Placa,
                filters.Estado,
                filters.EdicionPosterior
            );

            var resultados = operations.Select(op => new WeighingQueryResultDto
            {
                Id = op.Id.ToString(),
                Folio = op.Folio,
                Fecha = op.CreatedAt,
                Placas = BuildPlacasString(op),
                ClienteProveedor = op.ClientProviderName,
                Producto = op.Product,
                Tipo = op.UnitType,
                TipoUnidad = op.TipoUnidad,
                PesoBruto = op.EntryWeight,
                PesoSalida = op.ExitWeight,
                PesoNeto = op.NetWeight,
                Estado = op.Status,
                FueEditado = op.FueEditado,
                FechaEdicion = op.FechaUltimaEdicion,
                PuedeReimprimir = op.Status == "SALIDA_REGISTRADA",
                CreatedBy = op.CreatedBy,
                ExitRegisteredBy = op.ExitRegisteredBy,
                UsuarioEditor = op.UsuarioEditor,
                UpdatedAt = op.UpdatedAt,
                Photos = op.Photos?.Select(p => new WeighingPhotoDto
                {
                    Id = p.Id.ToString(),
                    PhotoType = p.PhotoType,
                    Description = p.Description
                }).ToList() ?? new List<WeighingPhotoDto>()
            }).ToList();

            var response = new WeighingQueryResponseDto
            {
                Resultados = resultados,
                Pagination = new PaginationDto
                {
                    Page = filters.Page,
                    Size = filters.Size,
                    Total = totalCount,
                    TotalPages = (int)Math.Ceiling((double)totalCount / filters.Size)
                }
            };

            return ApiResponse<WeighingQueryResponseDto>.CreateSuccess(response, "Consulta realizada exitosamente");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar operaciones de pesaje");
            return ApiResponse<WeighingQueryResponseDto>.CreateError("Error interno del servidor al consultar operaciones");
        }
    }

    public async Task<ApiResponse<List<WeighingExportDto>>> GetWeighingOperationsForExportAsync(WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Obteniendo datos para exportación con filtros: {@Filters}", filters);

            var operations = await _weighingRepository.QueryOperationsAsync(
                filters.FechaDesde,
                filters.FechaHasta,
                filters.Folio,
                filters.Placa,
                filters.Estado,
                filters.EdicionPosterior,
                1,
                int.MaxValue // Para exportar todos los resultados
            );

            var exportData = operations.Select(op => new WeighingExportDto
            {
                Folio = op.Folio,
                Fecha = op.CreatedAt,
                Placas = BuildPlacasString(op),
                PlacaT = GetPlacaTrailer(op),
                PlacaR = GetPlacaRemolque(op),
                PlacaR2 = GetPlacaRemolque2(op),
                ClienteProveedor = op.ClientProviderName,
                Producto = op.Product,
                Tipo = op.UnitType,
                TipoUnidad = op.TipoUnidad,
                PesoBruto = op.EntryWeight,
                PesoSalida = op.ExitWeight,
                PesoNeto = op.NetWeight,
                Estado = op.Status,
                PesadoEntradaPor = FormatUsername(op.CreatedBy),
                PesadoSalidaPor = FormatUsername(op.ExitRegisteredBy),
                FechaEntrada = op.EntryDate,
                FechaSalida = op.ExitDate,
                EditadoPor = op.UsuarioEditor ?? "",
                FechaEdicion = op.FechaUltimaEdicion
            }).ToList();

            return ApiResponse<List<WeighingExportDto>>.CreateSuccess(exportData, "Datos de exportación obtenidos exitosamente");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener datos para exportación");
            return ApiResponse<List<WeighingExportDto>>.CreateError("Error interno del servidor al obtener datos de exportación");
        }
    }

    private static string BuildPlacasString(Domain.Entities.WeighingOperation operation)
    {
        var placas = new List<string>();

        if (!string.IsNullOrEmpty(operation.TrailerPlate))
            placas.Add(operation.TrailerPlate);

        if (!string.IsNullOrEmpty(operation.TrailerPlate2))
            placas.Add(operation.TrailerPlate2);

        if (!string.IsNullOrEmpty(operation.TrailerPlateContenedor))
            placas.Add(operation.TrailerPlateContenedor);

        if (!string.IsNullOrEmpty(operation.RemolquePlateContenedor))
            placas.Add(operation.RemolquePlateContenedor);

        if (!string.IsNullOrEmpty(operation.PlacaRemolque1))
            placas.Add(operation.PlacaRemolque1);

        if (!string.IsNullOrEmpty(operation.PlacaRemolque2))
            placas.Add(operation.PlacaRemolque2);

        return string.Join(", ", placas.Where(p => !string.IsNullOrEmpty(p)));
    }

    private static string GetPlacaTrailer(Domain.Entities.WeighingOperation operation)
    {
        // La placa del tráiler es siempre la primera placa disponible
        return operation.TrailerPlate ?? operation.TrailerPlateContenedor ?? string.Empty;
    }

    private static string GetPlacaRemolque(Domain.Entities.WeighingOperation operation)
    {
        // La placa del remolque depende del tipo de unidad
        if (operation.TipoUnidad == "doble-remolque")
        {
            return operation.PlacaRemolque1 ?? string.Empty;
        }

        // Para remolque simple y contenedor
        return operation.TrailerPlate2 ?? operation.RemolquePlateContenedor ?? string.Empty;
    }

    private static string GetPlacaRemolque2(Domain.Entities.WeighingOperation operation)
    {
        // Solo para doble-remolque
        if (operation.TipoUnidad == "doble-remolque")
        {
            return operation.PlacaRemolque2 ?? string.Empty;
        }

        return string.Empty;
    }

    private static string FormatUsername(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return string.Empty;

        // Extraer solo el nombre de usuario antes del @
        var atIndex = email.IndexOf('@');
        return atIndex > 0 ? email.Substring(0, atIndex) : email;
    }
}