using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Kiriu.WeighingSystem.Api.Hubs;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SignalRTestController : ControllerBase
{
    private readonly IHubContext<PesoHub> _hubContext;
    private readonly ILogger<SignalRTestController> _logger;

    public SignalRTestController(IHubContext<PesoHub> hubContext, ILogger<SignalRTestController> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpGet("test")]
    public async Task<IActionResult> TestSignalR()
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("testMessage", new
            {
                message = "Test from API",
                timestamp = DateTime.UtcNow
            });

            return Ok(new { success = true, message = "SignalR test message sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing SignalR");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            success = true,
            message = "SignalR Hub is configured",
            hubPath = "/hubs/peso",
            negotiationUrl = "/hubs/peso/negotiate",
            timestamp = DateTime.UtcNow
        });
    }

    [HttpPost("negotiate")]
    public IActionResult TestNegotiate()
    {
        // Simular respuesta de negociación
        return Ok(new
        {
            connectionId = Guid.NewGuid().ToString(),
            availableTransports = new[]
            {
                new { transport = "WebSockets", transferFormats = new[] { "Text", "Binary" } }
            }
        });
    }
}