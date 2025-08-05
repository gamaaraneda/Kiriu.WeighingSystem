using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthCheckController : ControllerBase
{
    private readonly WeighingDbContext _context;
    private readonly ILogger<HealthCheckController> _logger;

    public HealthCheckController(WeighingDbContext context, ILogger<HealthCheckController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Health check básico para verificar que el API esté funcionando
    /// </summary>
    [HttpGet]
    public ActionResult<ApiResponse<object>> Get()
    {
        try
        {
            var healthInfo = new
            {
                Status = "Healthy",
                Timestamp = DateTime.UtcNow,
                Service = "Kiriu Weighing System API",
                Version = "1.0.0",
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"
            };

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = healthInfo,
                Message = "API funcionando correctamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en health check básico");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Error en health check",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    /// <summary>
    /// Health check completo que incluye verificación de base de datos
    /// </summary>
    [HttpGet("detailed")]
    public async Task<ActionResult<ApiResponse<object>>> GetDetailed()
    {
        try
        {
            var healthChecks = new List<object>();
            var isHealthy = true;

            // Verificar conectividad de base de datos
            try
            {
                var dbConnection = await _context.Database.CanConnectAsync();
                healthChecks.Add(new
                {
                    Component = "Database",
                    Status = dbConnection ? "Healthy" : "Unhealthy",
                    Message = dbConnection ? "Conexión exitosa" : "No se puede conectar a la base de datos"
                });

                if (!dbConnection)
                    isHealthy = false;
            }
            catch (Exception dbEx)
            {
                healthChecks.Add(new
                {
                    Component = "Database",
                    Status = "Unhealthy",
                    Message = $"Error de conexión: {dbEx.Message}"
                });
                isHealthy = false;
            }

            // Verificar memoria del sistema
            var memoryInfo = GC.GetGCMemoryInfo();
            healthChecks.Add(new
            {
                Component = "Memory",
                Status = "Healthy",
                Message = $"Memoria disponible: {memoryInfo.TotalAvailableMemoryBytes / 1024 / 1024} MB"
            });

            var detailedHealthInfo = new
            {
                Status = isHealthy ? "Healthy" : "Unhealthy",
                Timestamp = DateTime.UtcNow,
                Service = "Kiriu Weighing System API",
                Version = "1.0.0",
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
                Components = healthChecks
            };

            var statusCode = isHealthy ? 200 : 503; // 503 Service Unavailable si hay problemas

            return StatusCode(statusCode, new ApiResponse<object>
            {
                Success = isHealthy,
                Data = detailedHealthInfo,
                Message = isHealthy ? "Todos los componentes funcionando correctamente" : "Algunos componentes tienen problemas"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en health check detallado");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Error en health check detallado",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    /// <summary>
    /// Health check simple para balanceadores de carga (solo texto)
    /// </summary>
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok("OK");
    }
} 