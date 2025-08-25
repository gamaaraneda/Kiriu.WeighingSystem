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

    /// <summary>
    /// Genera ticket de reimpresión para una operación de salida
    /// </summary>
    [HttpPost("{operationId}/reprint")]
    public async Task<IActionResult> ReprintTicket(string operationId)
    {
        try
        {
            _logger.LogInformation("Generando ticket de reimpresión para operación: {OperationId}", operationId);

            if (!Guid.TryParse(operationId, out var id))
            {
                return BadRequest(new { success = false, message = "ID de operación inválido" });
            }

            // Obtener la operación usando el servicio de consulta con filtros amplios para buscar por ID
            var filters = new WeighingQueryFiltersDto { Page = 1, Size = 1000 }; // Buscar en más registros
            var result = await _weighingQueryService.QueryWeighingOperationsAsync(filters);

            if (!result.Success || result.Data?.Resultados == null)
            {
                return BadRequest(new { success = false, message = "Error al obtener datos de la operación" });
            }

            var operation = result.Data.Resultados.FirstOrDefault(o => o.Id == operationId);
            if (operation == null)
            {
                return NotFound(new { success = false, message = "Operación no encontrada" });
            }

            if (operation.Estado != "SALIDA_REGISTRADA")
            {
                return BadRequest(new { success = false, message = "Solo se pueden reimprimir operaciones de salida completadas" });
            }

            // Generar contenido del ticket
            var ticketContent = GenerateTicketContent(operation);
            var ticketBytes = System.Text.Encoding.UTF8.GetBytes(ticketContent);

            var fileName = $"Ticket_{operation.Folio}_{DateTime.Now:yyyyMMdd_HHmmss}.txt";

            _logger.LogInformation("Ticket generado exitosamente para operación: {Folio}", operation.Folio);

            return File(ticketBytes, "text/plain", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al generar ticket de reimpresión");
            return StatusCode(500, new { success = false, message = "Error interno del servidor al generar ticket" });
        }
    }

    private static string GenerateTicketContent(WeighingQueryResultDto operation)
    {
        var ticket = new System.Text.StringBuilder();
        var separator = new string('=', 45);
        var lineSeparator = new string('-', 45);
        
        ticket.AppendLine(separator);
        ticket.AppendLine("        SISTEMA DE PESAJE KIRIU");
        ticket.AppendLine("          TICKET DE PESAJE");
        ticket.AppendLine(separator);
        ticket.AppendLine();
        
        // Información básica
        ticket.AppendLine("INFORMACIÓN GENERAL:");
        ticket.AppendLine(lineSeparator);
        ticket.AppendLine($"Folio:        {operation.Folio}");
        ticket.AppendLine($"Fecha:        {operation.Fecha:dd/MM/yyyy HH:mm}");
        ticket.AppendLine($"Estado:       {GetEstadoDisplayName(operation.Estado)}");
        ticket.AppendLine();
        
        // Cliente/Proveedor
        ticket.AppendLine("CLIENTE/PROVEEDOR:");
        ticket.AppendLine(lineSeparator);
        ticket.AppendLine($"Nombre:       {operation.ClienteProveedor}");
        ticket.AppendLine($"Tipo:         {(operation.Tipo == "client" ? "Cliente" : "Proveedor")}");
        ticket.AppendLine();
        
        // Producto y unidad
        ticket.AppendLine("PRODUCTO Y UNIDAD:");
        ticket.AppendLine(lineSeparator);
        ticket.AppendLine($"Producto:     {operation.Producto}");
        ticket.AppendLine($"Tipo Unidad:  {GetTipoUnidadDisplayName(operation.TipoUnidad)}");
        ticket.AppendLine($"Placas:       {operation.Placas}");
        ticket.AppendLine();
        
        // Información de pesaje
        ticket.AppendLine("PESAJE:");
        ticket.AppendLine(lineSeparator);
        ticket.AppendLine($"Peso Bruto:   {operation.PesoBruto:N2} kg");
        ticket.AppendLine($"Peso Neto:    {operation.PesoNeto:N2} kg");
        
        var diferencia = (operation.PesoBruto ?? 0) - (operation.PesoNeto ?? 0);
        if (diferencia > 0)
        {
            ticket.AppendLine($"Tara:         {diferencia:N2} kg");
        }
        
        // Información de edición si aplica
        if (operation.FueEditado && operation.FechaEdicion.HasValue)
        {
            ticket.AppendLine();
            ticket.AppendLine("EDICIÓN:");
            ticket.AppendLine(lineSeparator);
            ticket.AppendLine($"Registro editado");
            ticket.AppendLine($"Fecha Edición: {operation.FechaEdicion:dd/MM/yyyy HH:mm}");
        }
        
        // Footer
        ticket.AppendLine();
        ticket.AppendLine(separator);
        ticket.AppendLine($"Fecha Reimpresión: {DateTime.Now:dd/MM/yyyy HH:mm}");
        ticket.AppendLine();
        ticket.AppendLine("       Gracias por usar nuestro servicio");
        ticket.AppendLine("         Sistema Kiriu - Versión 1.0");
        ticket.AppendLine(separator);
        
        return ticket.ToString();
    }

    private static string GetEstadoDisplayName(string estado)
    {
        return estado switch
        {
            "ENTRADA_REGISTRADA" => "Entrada",
            "SALIDA_REGISTRADA" => "Salida",
            _ => estado
        };
    }

    private static string GetTipoUnidadDisplayName(string tipoUnidad)
    {
        return tipoUnidad switch
        {
            "remolque" => "Remolque",
            "contenedor" => "Contenedor",
            "doble-remolque" => "2 Remolques",
            _ => tipoUnidad
        };
    }
}