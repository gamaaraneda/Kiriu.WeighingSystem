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
                PesoNeto = op.NetWeight,
                Estado = op.Status,
                FueEditado = op.FueEditado,
                FechaEdicion = op.FechaUltimaEdicion,
                PuedeReimprimir = op.Status == "SALIDA_REGISTRADA"
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
                ClienteProveedor = op.ClientProviderName,
                Producto = op.Product,
                Tipo = op.UnitType,
                TipoUnidad = op.TipoUnidad,
                PesoBruto = op.EntryWeight,
                PesoNeto = op.NetWeight,
                Estado = op.Status,
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
}