using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.Http.Headers;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/cargo-camera")]
public class CargoCameraController : ControllerBase
{
    private readonly ILogger<CargoCameraController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public CargoCameraController(
        ILogger<CargoCameraController> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Captura una foto desde la cámara de carga
    /// </summary>
    [HttpGet("capture")]
    public async Task<IActionResult> CaptureCargoPhoto()
    {
        try
        {
            var cameraUrl = _configuration["CargoCamera:Url"] ?? "http://192.168.1.49/ISAPI/Streaming/channels/1/picture";
            var username = _configuration["CargoCamera:Username"] ?? "admin";
            var password = _configuration["CargoCamera:Password"] ?? "Admin123";

            _logger.LogInformation("Capturing photo from cargo camera: {CameraUrl}", cameraUrl);

            // Crear HttpClientHandler con autenticación Digest
            var handler = new HttpClientHandler
            {
                Credentials = new NetworkCredential(username, password),
                PreAuthenticate = true
            };

            using var httpClient = new HttpClient(handler);
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            var response = await httpClient.GetAsync(cameraUrl);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to capture photo. Status: {StatusCode}", response.StatusCode);
                return StatusCode((int)response.StatusCode, new { success = false, message = "Error al capturar foto desde la cámara" });
            }

            var imageBytes = await response.Content.ReadAsByteArrayAsync();
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";

            _logger.LogInformation("Photo captured successfully. Size: {Size} bytes", imageBytes.Length);

            // Retornar la imagen directamente
            return File(imageBytes, contentType);
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("Timeout capturing photo from cargo camera");
            return StatusCode(504, new { success = false, message = "Timeout al capturar foto desde la cámara" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error capturing photo from cargo camera");
            return StatusCode(500, new { success = false, message = $"Error al capturar foto: {ex.Message}" });
        }
    }
}
