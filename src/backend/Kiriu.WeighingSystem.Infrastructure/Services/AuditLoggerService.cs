using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

/// <summary>
/// Servicio de auditoría para registrar operaciones exitosas del sistema
/// Implementa IAuditLogger para proporcionar funcionalidad de logging y consulta
/// </summary>
public class AuditLoggerService : IAuditLogger
{
    private readonly WeighingDbContext _context;
    private readonly ILogger<AuditLoggerService> _logger;

    public AuditLoggerService(WeighingDbContext context, ILogger<AuditLoggerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task LogAsync(
        string usuarioId,
        string? nombreUsuario,
        string operacion,
        string recurso,
        string? registroId = null,
        string? payload = null,
        string? ipOrigen = null,
        string? detalles = null,
        string? metodoHttp = null,
        string? rutaApi = null)
    {
        try
        {
            var auditLog = new AuditLog
            {
                UsuarioId = usuarioId,
                NombreUsuario = nombreUsuario,
                Operacion = operacion.ToUpperInvariant(),
                Recurso = recurso,
                RegistroId = registroId,
                Timestamp = DateTime.UtcNow,
                Payload = payload,
                IpOrigen = ipOrigen,
                Detalles = detalles,
                MetodoHttp = metodoHttp,
                RutaApi = rutaApi,
                Resultado = "success"
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Audit log created: {Operacion} on {Recurso} by {UsuarioId}", 
                operacion, recurso, usuarioId);
        }
        catch (Exception ex)
        {
            // No debe fallar la operación principal si el logging falla
            _logger.LogError(ex, "Error creating audit log for operation {Operacion} on {Recurso} by {UsuarioId}",
                operacion, recurso, usuarioId);
        }
    }

    /// <inheritdoc />
    public async Task LogCreateAsync(
        string usuarioId,
        string? nombreUsuario,
        string recurso,
        string? registroId = null,
        string? payload = null,
        string? ipOrigen = null,
        string? rutaApi = null)
    {
        await LogAsync(usuarioId, nombreUsuario, "CREATE", recurso, registroId, payload, 
            ipOrigen, null, "POST", rutaApi);
    }

    /// <inheritdoc />
    public async Task LogUpdateAsync(
        string usuarioId,
        string? nombreUsuario,
        string recurso,
        string? registroId = null,
        string? payload = null,
        string? ipOrigen = null,
        string? rutaApi = null)
    {
        await LogAsync(usuarioId, nombreUsuario, "UPDATE", recurso, registroId, payload, 
            ipOrigen, null, "PUT", rutaApi);
    }

    /// <inheritdoc />
    public async Task LogDeleteAsync(
        string usuarioId,
        string? nombreUsuario,
        string recurso,
        string? registroId = null,
        string? ipOrigen = null,
        string? rutaApi = null)
    {
        await LogAsync(usuarioId, nombreUsuario, "DELETE", recurso, registroId, null, 
            ipOrigen, null, "DELETE", rutaApi);
    }

    /// <inheritdoc />
    public async Task<(List<AuditLog> logs, int total)> GetLogsAsync(
        int page = 1,
        int size = 50,
        string? usuarioId = null,
        string? recurso = null,
        string? operacion = null,
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null)
    {
        try
        {
            var query = _context.AuditLogs.AsQueryable();

            // Aplicar filtros
            if (!string.IsNullOrEmpty(usuarioId))
            {
                query = query.Where(log => log.UsuarioId == usuarioId);
            }

            if (!string.IsNullOrEmpty(recurso))
            {
                query = query.Where(log => log.Recurso == recurso);
            }

            if (!string.IsNullOrEmpty(operacion))
            {
                query = query.Where(log => log.Operacion == operacion.ToUpperInvariant());
            }

            if (fechaDesde.HasValue)
            {
                query = query.Where(log => log.Timestamp >= fechaDesde.Value);
            }

            if (fechaHasta.HasValue)
            {
                query = query.Where(log => log.Timestamp <= fechaHasta.Value);
            }

            // Obtener total de registros
            var total = await query.CountAsync();

            // Aplicar paginación y ordenar por fecha descendente
            var logs = await query
                .OrderByDescending(log => log.Timestamp)
                .Skip((page - 1) * size)
                .Take(size)
                .ToListAsync();

            return (logs, total);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit logs");
            return (new List<AuditLog>(), 0);
        }
    }

    /// <summary>
    /// Obtiene estadísticas de auditoría para un período específico
    /// </summary>
    /// <param name="fechaDesde">Fecha desde</param>
    /// <param name="fechaHasta">Fecha hasta</param>
    /// <returns>Diccionario con estadísticas por operación</returns>
    public async Task<Dictionary<string, int>> GetAuditStatsAsync(DateTime? fechaDesde = null, DateTime? fechaHasta = null)
    {
        try
        {
            var query = _context.AuditLogs.AsQueryable();

            if (fechaDesde.HasValue)
            {
                query = query.Where(log => log.Timestamp >= fechaDesde.Value);
            }

            if (fechaHasta.HasValue)
            {
                query = query.Where(log => log.Timestamp <= fechaHasta.Value);
            }

            var stats = await query
                .GroupBy(log => log.Operacion)
                .Select(group => new { Operacion = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.Operacion, x => x.Count);

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit stats");
            return new Dictionary<string, int>();
        }
    }

    /// <summary>
    /// Obtiene los usuarios más activos en un período específico
    /// </summary>
    /// <param name="fechaDesde">Fecha desde</param>
    /// <param name="fechaHasta">Fecha hasta</param>
    /// <param name="limit">Número máximo de usuarios a retornar</param>
    /// <returns>Lista de usuarios con su número de operaciones</returns>
    public async Task<List<(string UsuarioId, string? NombreUsuario, int OperacionesCount)>> GetMostActiveUsersAsync(
        DateTime? fechaDesde = null, DateTime? fechaHasta = null, int limit = 10)
    {
        try
        {
            var query = _context.AuditLogs.AsQueryable();

            if (fechaDesde.HasValue)
            {
                query = query.Where(log => log.Timestamp >= fechaDesde.Value);
            }

            if (fechaHasta.HasValue)
            {
                query = query.Where(log => log.Timestamp <= fechaHasta.Value);
            }

            var activeUsers = await query
                .GroupBy(log => new { log.UsuarioId, log.NombreUsuario })
                .Select(group => new 
                { 
                    UsuarioId = group.Key.UsuarioId, 
                    NombreUsuario = group.Key.NombreUsuario,
                    Count = group.Count() 
                })
                .OrderByDescending(x => x.Count)
                .Take(limit)
                .ToListAsync();

            return activeUsers.Select(x => (x.UsuarioId, x.NombreUsuario, x.Count)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving most active users");
            return new List<(string, string?, int)>();
        }
    }
}