using Microsoft.AspNetCore.Mvc;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthCheckController : ControllerBase
{
    private readonly IHealthCheckApplicationService _healthCheckApplicationService;
    private readonly ILogger<HealthCheckController> _logger;

    public HealthCheckController(IHealthCheckApplicationService healthCheckApplicationService, ILogger<HealthCheckController> logger)
    {
        _healthCheckApplicationService = healthCheckApplicationService;
        _logger = logger;
    }

    /// <summary>
    /// Health check básico para verificar que el API esté funcionando
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> Get()
    {
        try
        {
            var healthInfo = await _healthCheckApplicationService.GetBasicHealthAsync();

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
            var detailedHealthInfo = await _healthCheckApplicationService.GetDetailedHealthAsync();
            
            // Determinar el código de estado basado en el estado de salud
            var isHealthy = ((dynamic)detailedHealthInfo).Status == "Healthy";
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
        return Ok(_healthCheckApplicationService.GetPingResponse());
    }
} 