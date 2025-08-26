using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

/// <summary>
/// Interfaz para el servicio de auditoría del sistema
/// Permite registrar operaciones exitosas para fines de control y trazabilidad
/// </summary>
public interface IAuditLogger
{
    /// <summary>
    /// Registra una operación exitosa en el log de auditoría
    /// </summary>
    /// <param name="usuarioId">ID del usuario que realizó la operación</param>
    /// <param name="nombreUsuario">Nombre del usuario (opcional)</param>
    /// <param name="operacion">Tipo de operación (CREATE, UPDATE, DELETE)</param>
    /// <param name="recurso">Tabla o recurso afectado</param>
    /// <param name="registroId">ID del registro modificado (opcional)</param>
    /// <param name="payload">Contenido del request serializado (opcional)</param>
    /// <param name="ipOrigen">IP de origen de la petición (opcional)</param>
    /// <param name="detalles">Información adicional (opcional)</param>
    /// <param name="metodoHttp">Método HTTP utilizado (opcional)</param>
    /// <param name="rutaApi">Ruta de la API llamada (opcional)</param>
    /// <returns>Task para operación asíncrona</returns>
    Task LogAsync(
        string usuarioId,
        string? nombreUsuario,
        string operacion,
        string recurso,
        string? registroId = null,
        string? payload = null,
        string? ipOrigen = null,
        string? detalles = null,
        string? metodoHttp = null,
        string? rutaApi = null,
        string? dispositivo = null);

    /// <summary>
    /// Registra una operación CREATE exitosa
    /// </summary>
    /// <param name="usuarioId">ID del usuario</param>
    /// <param name="nombreUsuario">Nombre del usuario</param>
    /// <param name="recurso">Recurso creado</param>
    /// <param name="registroId">ID del registro creado</param>
    /// <param name="payload">Datos de la creación</param>
    /// <param name="ipOrigen">IP de origen</param>
    /// <param name="rutaApi">Ruta de la API</param>
    /// <returns>Task para operación asíncrona</returns>
    Task LogCreateAsync(
        string usuarioId,
        string? nombreUsuario,
        string recurso,
        string? registroId = null,
        string? payload = null,
        string? ipOrigen = null,
        string? rutaApi = null,
        string? dispositivo = null);

    /// <summary>
    /// Registra una operación UPDATE exitosa
    /// </summary>
    /// <param name="usuarioId">ID del usuario</param>
    /// <param name="nombreUsuario">Nombre del usuario</param>
    /// <param name="recurso">Recurso actualizado</param>
    /// <param name="registroId">ID del registro actualizado</param>
    /// <param name="payload">Datos de la actualización</param>
    /// <param name="ipOrigen">IP de origen</param>
    /// <param name="rutaApi">Ruta de la API</param>
    /// <returns>Task para operación asíncrona</returns>
    Task LogUpdateAsync(
        string usuarioId,
        string? nombreUsuario,
        string recurso,
        string? registroId = null,
        string? payload = null,
        string? ipOrigen = null,
        string? rutaApi = null,
        string? dispositivo = null);

    /// <summary>
    /// Registra una operación DELETE exitosa
    /// </summary>
    /// <param name="usuarioId">ID del usuario</param>
    /// <param name="nombreUsuario">Nombre del usuario</param>
    /// <param name="recurso">Recurso eliminado</param>
    /// <param name="registroId">ID del registro eliminado</param>
    /// <param name="ipOrigen">IP de origen</param>
    /// <param name="rutaApi">Ruta de la API</param>
    /// <returns>Task para operación asíncrona</returns>
    Task LogDeleteAsync(
        string usuarioId,
        string? nombreUsuario,
        string recurso,
        string? registroId = null,
        string? ipOrigen = null,
        string? rutaApi = null,
        string? dispositivo = null);

    /// <summary>
    /// Obtiene los logs de auditoría con paginación
    /// </summary>
    /// <param name="page">Número de página</param>
    /// <param name="size">Tamaño de página</param>
    /// <param name="usuarioId">Filtrar por usuario (opcional)</param>
    /// <param name="recurso">Filtrar por recurso (opcional)</param>
    /// <param name="operacion">Filtrar por operación (opcional)</param>
    /// <param name="fechaDesde">Fecha desde (opcional)</param>
    /// <param name="fechaHasta">Fecha hasta (opcional)</param>
    /// <returns>Lista paginada de logs de auditoría</returns>
    Task<(List<AuditLog> logs, int total)> GetLogsAsync(
        int page = 1,
        int size = 50,
        string? usuarioId = null,
        string? recurso = null,
        string? operacion = null,
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null);
}