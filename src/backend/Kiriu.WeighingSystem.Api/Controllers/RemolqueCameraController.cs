using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.Http.Headers;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/remolque-camera")]
public class RemolqueCameraController : ControllerBase
{
    private readonly ILogger<RemolqueCameraController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IWeighingPhotoRepository _photoRepository;
    private readonly IWebHostEnvironment _environment;

    public RemolqueCameraController(
        ILogger<RemolqueCameraController> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IWeighingPhotoRepository photoRepository,
        IWebHostEnvironment environment)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _photoRepository = photoRepository;
        _environment = environment;
    }

    /// <summary>
    /// Captura una foto desde la cámara de remolque
    /// </summary>
    [HttpGet("capture")]
    public async Task<IActionResult> CaptureRemolquePhoto()
    {
        try
        {
            var cameraUrl = _configuration["RemolqueCamera:Url"] ?? "http://192.168.110.91:5003/ISAPI/Streaming/channels/1/picture";
            var username = _configuration["RemolqueCamera:Username"] ?? "admin";
            var password = _configuration["RemolqueCamera:Password"] ?? "Admin123";

            _logger.LogInformation("Capturing photo from remolque camera: {CameraUrl}", cameraUrl);

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
                return StatusCode((int)response.StatusCode, new { success = false, message = "Error al capturar foto desde la cámara de remolque" });
            }

            var imageBytes = await response.Content.ReadAsByteArrayAsync();
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";

            _logger.LogInformation("Remolque photo captured successfully. Size: {Size} bytes", imageBytes.Length);

            // Retornar la imagen directamente
            return File(imageBytes, contentType);
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("Timeout capturing photo from remolque camera");
            return StatusCode(504, new { success = false, message = "Timeout al capturar foto desde la cámara de remolque" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error capturing photo from remolque camera");
            return StatusCode(500, new { success = false, message = $"Error al capturar foto: {ex.Message}" });
        }
    }

    /// <summary>
    /// Captura una foto desde la cámara de remolque y la guarda en el servidor
    /// Patrón similar a ANPR: guarda en BD como huérfana y retorna URL
    /// </summary>
    [HttpPost("capture-and-save")]
    public async Task<IActionResult> CaptureAndSaveRemolquePhoto([FromBody] CapturePhotoRequest request)
    {
        try
        {
            var cameraUrl = _configuration["RemolqueCamera:Url"] ?? "http://192.168.110.91:5003/ISAPI/Streaming/channels/1/picture";
            var username = _configuration["RemolqueCamera:Username"] ?? "admin";
            var password = _configuration["RemolqueCamera:Password"] ?? "Admin123";

            _logger.LogInformation("Capturing and saving photo from remolque camera for {PhotoType}", request.PhotoType);

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
                return StatusCode((int)response.StatusCode, new { success = false, message = "Error al capturar foto desde la cámara de remolque" });
            }

            var imageBytes = await response.Content.ReadAsByteArrayAsync();

            // Crear registro de foto huérfana en la base de datos (patrón ANPR)
            var photoId = Guid.NewGuid();
            var photoUrl = $"/api/weighing/photos/{photoId}";

            var orphanPhoto = new WeighingPhoto
            {
                Id = photoId,
                WeighingOperationId = null, // Huérfana - se vinculará después en entrada/salida
                PhotoType = request.PhotoType,
                PhotoUrl = photoUrl,
                ImageData = imageBytes, // Guardar la imagen en la BD como blob
                ContentType = "image/jpeg",
                Description = "Placa ANPR: unknown - Cámara: remolque", // Formato igual que ANPR
                CreatedAt = DateTime.UtcNow
            };

            await _photoRepository.AddAsync(orphanPhoto);

            _logger.LogInformation("Remolque photo saved successfully. URL: {PhotoUrl}, Size: {Size} bytes",
                photoUrl, imageBytes.Length);

            return Ok(new { photoUrl = photoUrl, success = true });
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("Timeout capturing photo from remolque camera");
            return StatusCode(504, new { success = false, message = "Timeout al capturar foto desde la cámara de remolque" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error capturing and saving photo from remolque camera");
            return StatusCode(500, new { success = false, message = $"Error al capturar y guardar foto: {ex.Message}" });
        }
    }
}
