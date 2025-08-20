using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeighingController : ControllerBase
{
    private readonly IWeighingApplicationService _weighingService;
    private readonly ILogger<WeighingController> _logger;

    public WeighingController(
        IWeighingApplicationService weighingService,
        ILogger<WeighingController> logger)
    {
        _weighingService = weighingService;
        _logger = logger;
    }

    /// <summary>
    /// Crear Operación de Entrada
    /// </summary>
    /// <param name="request">Datos de la operación de entrada</param>
    /// <returns>Operación de entrada creada</returns>
    [HttpPost("entry")]
    public async Task<IActionResult> CreateEntry([FromBody] CreateEntryRequest request)
    {
        try
        {
            _logger.LogInformation("Creando operación de entrada para placa: {TrailerPlate}", request.TrailerPlate);
            
            var result = await _weighingService.CreateEntryAsync(request);
            
            if (!result.Success)
            {
                return result.Message switch
                {
                    "Placa ya registrada en entrada previa" => Conflict(result),
                    _ => BadRequest(result)
                };
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear operación de entrada");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Crear Operación de Entrada con Doble Remolque
    /// </summary>
    /// <param name="request">Datos de la operación de entrada con doble remolque</param>
    /// <returns>Operación de entrada con doble remolque creada</returns>
    [HttpPost("entry/double-trailer")]
    public async Task<IActionResult> CreateDoubleTrailerEntry([FromBody] CreateDoubleTrailerEntryRequest request)
    {
        try
        {
            _logger.LogInformation("Creando entrada con doble remolque para trailer: {TrailerPlaca}", request.TrailerPlaca);
            
            var result = await _weighingService.CreateDoubleTrailerEntryAsync(request);
            
            if (!result.Success)
            {
                return result.Message.Contains("ya registrada") ? Conflict(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear entrada con doble remolque");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Buscar Entrada por Placa
    /// </summary>
    /// <param name="placa">Placa del vehículo a buscar</param>
    /// <returns>Registro de entrada encontrado</returns>
    [HttpGet("entry/search")]
    public async Task<IActionResult> SearchEntryByPlate([FromQuery] string placa)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(placa))
            {
                return BadRequest(new { success = false, message = "La placa es requerida" });
            }

            _logger.LogInformation("Buscando entrada por placa: {Placa}", placa);
            
            var result = await _weighingService.SearchEntryByPlateAsync(placa);
            
            if (!result.Success)
            {
                return result.Message == "Registro no encontrado" ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar entrada por placa: {Placa}", placa);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Registrar Salida
    /// </summary>
    /// <param name="request">Datos del registro de salida</param>
    /// <returns>Registro de salida completado</returns>
    [HttpPost("exit")]
    public async Task<IActionResult> CreateExit([FromBody] CreateExitRequest request)
    {
        try
        {
            _logger.LogInformation("Registrando salida para folio: {Folio}", request.Folio);
            
            var result = await _weighingService.CreateExitAsync(request);
            
            if (!result.Success)
            {
                return result.Message.Contains("no encontrado") ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar salida para folio: {Folio}", request.Folio);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Registrar Salida con Doble Remolque
    /// </summary>
    /// <param name="request">Datos del registro de salida con doble remolque</param>
    /// <returns>Registro de salida completado</returns>
    [HttpPost("exit/double-trailer")]
    public async Task<IActionResult> CreateDoubleTrailerExit([FromBody] CreateDoubleTrailerExitRequest request)
    {
        try
        {
            _logger.LogInformation("Registrando salida con doble remolque para folio: {Folio}", request.Folio);
            
            var result = await _weighingService.CreateDoubleTrailerExitAsync(request);
            
            if (!result.Success)
            {
                return result.Message.Contains("no encontrado") ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar salida con doble remolque para folio: {Folio}", request.Folio);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtener Operaciones Existentes
    /// </summary>
    /// <param name="page">Número de página</param>
    /// <param name="size">Tamaño de página</param>
    /// <param name="status">Filtrar por estado</param>
    /// <param name="unitType">Filtrar por tipo de unidad</param>
    /// <param name="dateFrom">Fecha desde</param>
    /// <param name="dateTo">Fecha hasta</param>
    /// <returns>Lista paginada de operaciones</returns>
    [HttpGet("operations")]
    public async Task<IActionResult> GetOperations(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? unitType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        try
        {
            _logger.LogInformation("Obteniendo operaciones - Página: {Page}, Tamaño: {Size}", page, size);
            
            var result = await _weighingService.GetOperationsAsync(page, size, status, unitType, dateFrom, dateTo);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operaciones");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtener Operación por Placa
    /// </summary>
    /// <param name="placa">Placa del vehículo</param>
    /// <returns>Operación encontrada</returns>
    [HttpGet("operations/plate/{placa}")]
    public async Task<IActionResult> GetOperationByPlate(string placa)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(placa))
            {
                return BadRequest(new { success = false, message = "La placa es requerida" });
            }

            _logger.LogInformation("Obteniendo operación por placa: {Placa}", placa);
            
            var result = await _weighingService.GetOperationByPlateAsync(placa);
            
            if (!result.Success)
            {
                return result.Message == "Operación no encontrada" ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operación por placa: {Placa}", placa);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Validar si se puede Registrar Salida
    /// </summary>
    /// <param name="placa">Placa del vehículo</param>
    /// <returns>Validación de salida</returns>
    [HttpGet("exit/validate/{placa}")]
    public async Task<IActionResult> ValidateExit(string placa)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(placa))
            {
                return BadRequest(new { success = false, message = "La placa es requerida" });
            }

            _logger.LogInformation("Validando posibilidad de salida para placa: {Placa}", placa);
            
            var result = await _weighingService.ValidateExitAsync(placa);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al validar salida para placa: {Placa}", placa);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }
}