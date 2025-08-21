using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/weighing/query")]
[Authorize]
public class WeighingQueryController : ControllerBase
{
    private readonly IWeighingQueryService _weighingQueryService;
    private readonly IExcelExportService _excelExportService;
    private readonly ILogger<WeighingQueryController> _logger;

    public WeighingQueryController(
        IWeighingQueryService weighingQueryService,
        IExcelExportService excelExportService,
        ILogger<WeighingQueryController> logger)
    {
        _weighingQueryService = weighingQueryService;
        _excelExportService = excelExportService;
        _logger = logger;
    }

    /// <summary>
    /// Consulta operaciones de pesaje con filtros
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> QueryOperations([FromQuery] WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Consultando operaciones de pesaje. Filtros: {@Filters}", filters);

            var result = await _weighingQueryService.QueryWeighingOperationsAsync(filters);

            if (!result.Success)
            {
                _logger.LogWarning("Error en consulta de operaciones: {Message}", result.Message);
                return BadRequest(result);
            }

            _logger.LogInformation("Consulta de operaciones exitosa. Total resultados: {Count}", 
                result.Data?.Resultados?.Count ?? 0);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado al consultar operaciones de pesaje");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Exporta operaciones de pesaje a Excel
    /// </summary>
    [HttpPost("export")]
    public async Task<IActionResult> ExportToExcel([FromBody] WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Exportando operaciones de pesaje a Excel. Filtros: {@Filters}", filters);

            var dataResult = await _weighingQueryService.GetWeighingOperationsForExportAsync(filters);

            if (!dataResult.Success || dataResult.Data == null)
            {
                _logger.LogWarning("Error al obtener datos para exportación: {Message}", dataResult.Message);
                return BadRequest(dataResult);
            }

            var excelBytes = await _excelExportService.ExportWeighingOperationsToExcelAsync(dataResult.Data);

            var fileName = $"Operaciones_Pesaje_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

            _logger.LogInformation("Exportación a Excel exitosa. Archivo: {FileName}, Registros: {Count}", 
                fileName, dataResult.Data.Count);

            return File(excelBytes, 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado al exportar operaciones de pesaje");
            return StatusCode(500, new { success = false, message = "Error interno del servidor al exportar" });
        }
    }

    /// <summary>
    /// Obtiene estadísticas básicas de las operaciones
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetOperationsStats([FromQuery] WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Obteniendo estadísticas de operaciones. Filtros: {@Filters}", filters);

            // Usar filtros pero sin paginación para obtener todas las operaciones
            var allDataFilters = filters with { Page = 1, Size = int.MaxValue };
            var result = await _weighingQueryService.QueryWeighingOperationsAsync(allDataFilters);

            if (!result.Success || result.Data?.Resultados == null)
            {
                return BadRequest(result);
            }

            var operations = result.Data.Resultados;
            
            var stats = new
            {
                TotalOperaciones = operations.Count,
                OperacionesEntrada = operations.Count(o => o.Estado == "ENTRADA_REGISTRADA"),
                OperacionesSalida = operations.Count(o => o.Estado == "SALIDA_REGISTRADA"),
                OperacionesEditadas = operations.Count(o => o.FueEditado),
                TotalPesoBruto = operations.Where(o => o.PesoBruto.HasValue).Sum(o => o.PesoBruto ?? 0),
                TotalPesoNeto = operations.Where(o => o.PesoNeto.HasValue).Sum(o => o.PesoNeto ?? 0),
                TiposUnidad = operations.GroupBy(o => o.TipoUnidad)
                    .Select(g => new { Tipo = g.Key, Cantidad = g.Count() })
                    .OrderByDescending(x => x.Cantidad)
                    .ToList()
            };

            _logger.LogInformation("Estadísticas obtenidas exitosamente. Total operaciones: {Total}", stats.TotalOperaciones);

            return Ok(new { success = true, data = stats, message = "Estadísticas obtenidas exitosamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado al obtener estadísticas");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }
}