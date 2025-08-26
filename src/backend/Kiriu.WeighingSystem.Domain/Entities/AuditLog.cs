using System.ComponentModel.DataAnnotations;

namespace Kiriu.WeighingSystem.Domain.Entities;

/// <summary>
/// Entidad para registrar auditoría de operaciones exitosas del sistema
/// Permite rastrear quién hizo qué cambios y cuándo para fines de control y trazabilidad
/// </summary>
public class AuditLog
{
    /// <summary>
    /// Identificador único del registro de auditoría
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// ID del usuario que realizó la operación (extraído del token JWT)
    /// </summary>
    [MaxLength(100)]
    public string UsuarioId { get; set; } = string.Empty;

    /// <summary>
    /// Nombre del usuario que realizó la operación (para facilitar lecturas)
    /// </summary>
    [MaxLength(200)]
    public string? NombreUsuario { get; set; }

    /// <summary>
    /// Tipo de operación realizada
    /// </summary>
    [MaxLength(10)]
    public string Operacion { get; set; } = string.Empty; // CREATE, UPDATE, DELETE

    /// <summary>
    /// Tabla o recurso afectado
    /// </summary>
    [MaxLength(100)]
    public string Recurso { get; set; } = string.Empty; // WeighingOperation, User, etc.

    /// <summary>
    /// ID del registro modificado, si aplica
    /// </summary>
    [MaxLength(50)]
    public string? RegistroId { get; set; }

    /// <summary>
    /// Fecha y hora exacta de la operación
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Contenido serializado del request (JSON)
    /// Solo se incluye información relevante y no sensible
    /// </summary>
    public string? Payload { get; set; }

    /// <summary>
    /// Dirección IP de origen de la petición
    /// </summary>
    [MaxLength(45)] // IPv6 puede ser hasta 45 caracteres
    public string? IpOrigen { get; set; }

    /// <summary>
    /// Resultado de la operación (siempre "success" para este log)
    /// </summary>
    [MaxLength(20)]
    public string Resultado { get; set; } = "success";

    /// <summary>
    /// Información adicional sobre la operación
    /// </summary>
    [MaxLength(500)]
    public string? Detalles { get; set; }

    /// <summary>
    /// Método HTTP utilizado
    /// </summary>
    [MaxLength(10)]
    public string? MetodoHttp { get; set; }

    /// <summary>
    /// Endpoint o ruta de la API llamada
    /// </summary>
    [MaxLength(200)]
    public string? RutaApi { get; set; }
}