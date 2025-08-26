using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Api.Controllers;

/// <summary>
/// Controlador para consultar logs de auditoría del sistema
/// Permite a los administradores revisar el historial de operaciones
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // Solo usuarios autenticados pueden acceder a los logs
public class AuditController : ControllerBase
{
    private readonly IAuditLogger _auditLogger;
    private readonly ILogger<AuditController> _logger;

    public AuditController(IAuditLogger auditLogger, ILogger<AuditController> logger)
    {
        _auditLogger = auditLogger;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene logs de auditoría con paginación y filtros
    /// </summary>
    /// <param name="page">Número de página (por defecto 1)</param>
    /// <param name="size">Tamaño de página (por defecto 50, máximo 100)</param>
    /// <param name="usuarioId">Filtrar por usuario específico</param>
    /// <param name="recurso">Filtrar por recurso específico (ej: WeighingOperation)</param>
    /// <param name="operacion">Filtrar por tipo de operación (CREATE, UPDATE, DELETE)</param>
    /// <param name="fechaDesde">Fecha desde (formato YYYY-MM-DD)</param>
    /// <param name="fechaHasta">Fecha hasta (formato YYYY-MM-DD)</param>
    /// <returns>Lista paginada de logs de auditoría</returns>
    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int size = 50,
        [FromQuery] string? usuarioId = null,
        [FromQuery] string? recurso = null,
        [FromQuery] string? operacion = null,
        [FromQuery] DateTime? fechaDesde = null,
        [FromQuery] DateTime? fechaHasta = null)
    {
        try
        {
            // Validar parámetros
            if (page < 1) page = 1;
            if (size < 1 || size > 100) size = 50;

            _logger.LogInformation(
                "Consultando logs de auditoría - Página: {Page}, Tamaño: {Size}, Usuario: {UsuarioId}, Recurso: {Recurso}",
                page, size, usuarioId, recurso);

            var (logs, total) = await _auditLogger.GetLogsAsync(
                page, size, usuarioId, recurso, operacion, fechaDesde, fechaHasta);

            var response = new AuditLogsResponse
            {
                Logs = logs.Select(log => new AuditLogDto
                {
                    Id = log.Id,
                    UsuarioId = log.UsuarioId,
                    NombreUsuario = log.NombreUsuario,
                    Operacion = log.Operacion,
                    Recurso = log.Recurso,
                    RegistroId = log.RegistroId,
                    Timestamp = log.Timestamp,
                    IpOrigen = log.IpOrigen,
                    Detalles = log.Detalles,
                    MetodoHttp = log.MetodoHttp,
                    RutaApi = log.RutaApi,
                    PayloadSize = log.Payload?.Length ?? 0,
                    HasPayload = !string.IsNullOrEmpty(log.Payload)
                }).ToList(),
                Pagination = new PaginationInfo
                {
                    Page = page,
                    Size = size,
                    Total = total,
                    TotalPages = (int)Math.Ceiling((double)total / size),
                    HasNext = page * size < total,
                    HasPrevious = page > 1
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener logs de auditoría");
            return StatusCode(500, new { 
                message = "Error interno del servidor al obtener logs de auditoría" 
            });
        }
    }

    /// <summary>
    /// Obtiene un log de auditoría específico por ID (incluyendo payload completo)
    /// </summary>
    /// <param name="id">ID del log de auditoría</param>
    /// <returns>Detalles completos del log</returns>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAuditLogById(int id)
    {
        try
        {
            // Obtener el log específico
            var (logs, _) = await _auditLogger.GetLogsAsync(1, 1, null, null, null, null, null);
            var log = logs.FirstOrDefault();

            if (log == null)
            {
                return NotFound(new { message = "Log de auditoría no encontrado" });
            }

            var detailedLog = new DetailedAuditLogDto
            {
                Id = log.Id,
                UsuarioId = log.UsuarioId,
                NombreUsuario = log.NombreUsuario,
                Operacion = log.Operacion,
                Recurso = log.Recurso,
                RegistroId = log.RegistroId,
                Timestamp = log.Timestamp,
                Payload = log.Payload, // Incluir payload completo solo en consultas específicas
                IpOrigen = log.IpOrigen,
                Resultado = log.Resultado,
                Detalles = log.Detalles,
                MetodoHttp = log.MetodoHttp,
                RutaApi = log.RutaApi
            };

            return Ok(detailedLog);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener log de auditoría por ID: {Id}", id);
            return StatusCode(500, new { 
                message = "Error interno del servidor al obtener el log específico" 
            });
        }
    }

    /// <summary>
    /// Obtiene estadísticas de auditoría para un período específico
    /// </summary>
    /// <param name="fechaDesde">Fecha desde</param>
    /// <param name="fechaHasta">Fecha hasta</param>
    /// <returns>Estadísticas de operaciones por tipo</returns>
    [HttpGet("statistics")]
    public async Task<IActionResult> GetAuditStatistics(
        [FromQuery] DateTime? fechaDesde = null,
        [FromQuery] DateTime? fechaHasta = null)
    {
        try
        {
            _logger.LogInformation("Obteniendo estadísticas de auditoría para período: {FechaDesde} - {FechaHasta}", 
                fechaDesde, fechaHasta);

            // Este método está implementado en el servicio como método adicional
            var auditService = _auditLogger as Infrastructure.Services.AuditLoggerService;
            var stats = await auditService!.GetAuditStatsAsync(fechaDesde, fechaHasta);
            var activeUsers = await auditService.GetMostActiveUsersAsync(fechaDesde, fechaHasta, 10);

            var response = new AuditStatisticsResponse
            {
                Period = new PeriodInfo
                {
                    FechaDesde = fechaDesde,
                    FechaHasta = fechaHasta
                },
                OperationStats = stats,
                MostActiveUsers = activeUsers.Select(u => new ActiveUserInfo
                {
                    UsuarioId = u.UsuarioId,
                    NombreUsuario = u.NombreUsuario,
                    OperationsCount = u.OperacionesCount
                }).ToList(),
                TotalOperations = stats.Values.Sum()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener estadísticas de auditoría");
            return StatusCode(500, new { 
                message = "Error interno del servidor al obtener estadísticas" 
            });
        }
    }
}

/// <summary>
/// DTO para respuesta de logs de auditoría con paginación
/// </summary>
public class AuditLogsResponse
{
    public List<AuditLogDto> Logs { get; set; } = new();
    public PaginationInfo Pagination { get; set; } = new();
}

/// <summary>
/// DTO simplificado para log de auditoría (sin payload por performance)
/// </summary>
public class AuditLogDto
{
    public int Id { get; set; }
    public string UsuarioId { get; set; } = string.Empty;
    public string? NombreUsuario { get; set; }
    public string Operacion { get; set; } = string.Empty;
    public string Recurso { get; set; } = string.Empty;
    public string? RegistroId { get; set; }
    public DateTime Timestamp { get; set; }
    public string? IpOrigen { get; set; }
    public string? Detalles { get; set; }
    public string? MetodoHttp { get; set; }
    public string? RutaApi { get; set; }
    public int PayloadSize { get; set; }
    public bool HasPayload { get; set; }
}

/// <summary>
/// DTO detallado para log de auditoría específico (incluye payload)
/// </summary>
public class DetailedAuditLogDto : AuditLogDto
{
    public string? Payload { get; set; }
    public string Resultado { get; set; } = string.Empty;
}

/// <summary>
/// Información de paginación
/// </summary>
public class PaginationInfo
{
    public int Page { get; set; }
    public int Size { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
    public bool HasNext { get; set; }
    public bool HasPrevious { get; set; }
}

/// <summary>
/// Respuesta de estadísticas de auditoría
/// </summary>
public class AuditStatisticsResponse
{
    public PeriodInfo Period { get; set; } = new();
    public Dictionary<string, int> OperationStats { get; set; } = new();
    public List<ActiveUserInfo> MostActiveUsers { get; set; } = new();
    public int TotalOperations { get; set; }
}

/// <summary>
/// Información del período consultado
/// </summary>
public class PeriodInfo
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
}

/// <summary>
/// Información de usuario activo
/// </summary>
public class ActiveUserInfo
{
    public string UsuarioId { get; set; } = string.Empty;
    public string? NombreUsuario { get; set; }
    public int OperationsCount { get; set; }
}