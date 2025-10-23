using Kiriu.WeighingSystem.Api.Hubs;
using Kiriu.WeighingSystem.Application.DTOs.Anpr;
using Kiriu.WeighingSystem.Application.Services;
using Kiriu.WeighingSystem.Infrastructure.Services;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Kiriu.WeighingSystem.Api.Controllers;

/// <summary>
/// Controlador para recibir eventos de cámaras ANPR
/// </summary>
[ApiController]
[Route("api/anpr")]
public class AnprController : ControllerBase
{
    private readonly AnprParserService _parserService;
    private readonly AnprApplicationService _applicationService;
    private readonly IHubContext<PesoHub> _hubContext;
    private readonly IWeighingPhotoRepository _photoRepository;
    private readonly ILogger<AnprController> _logger;

    public AnprController(
        AnprParserService parserService,
        AnprApplicationService applicationService,
        IHubContext<PesoHub> hubContext,
        IWeighingPhotoRepository photoRepository,
        ILogger<AnprController> logger)
    {
        _parserService = parserService;
        _applicationService = applicationService;
        _hubContext = hubContext;
        _photoRepository = photoRepository;
        _logger = logger;
    }

    /// <summary>
    /// Endpoint para recibir eventos de la cámara de placa de tráiler
    /// </summary>
    [HttpPost("trailer")]
    public async Task<IActionResult> ReceiveTrailerPlate()
    {
        return await ProcessAnprEvent("trailer");
    }

    /// <summary>
    /// Endpoint para recibir eventos de la cámara de placa de remolque
    /// </summary>
    [HttpPost("remolque")]
    public async Task<IActionResult> ReceiveRemolquePlate()
    {
        return await ProcessAnprEvent("remolque");
    }

    /// <summary>
    /// Endpoint para recibir eventos de la cámara de placa de carga/contenedor
    /// </summary>
    [HttpPost("cargo")]
    public async Task<IActionResult> ReceiveCargoPlate()
    {
        return await ProcessAnprEvent("cargo");
    }

    /// <summary>
    /// Método privado reutilizable para procesar eventos ANPR
    /// </summary>
    private async Task<IActionResult> ProcessAnprEvent(string cameraType)
    {
        try
        {
            Console.WriteLine("\n");
            Console.WriteLine("╔══════════════════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║                         REQUEST ANPR RECIBIDO                                ║");
            Console.WriteLine("╚══════════════════════════════════════════════════════════════════════════════╝");
            Console.WriteLine($"📷 Cámara: {cameraType}");
            Console.WriteLine($"📅 Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}");
            Console.WriteLine();
            Console.WriteLine("────────────────────────── INFORMACIÓN DEL REQUEST ──────────────────────────");
            Console.WriteLine($"🔹 Method: {Request.Method}");
            Console.WriteLine($"🔹 Path: {Request.Path}");
            Console.WriteLine($"🔹 Content-Type: {Request.ContentType ?? "⚠️ NULL"}");
            Console.WriteLine($"🔹 Content-Length: {Request.ContentLength?.ToString() ?? "⚠️ NULL"} bytes");
            Console.WriteLine($"🔹 Protocol: {Request.Protocol}");
            Console.WriteLine($"🔹 Scheme: {Request.Scheme}");
            Console.WriteLine($"🔹 Host: {Request.Host}");
            Console.WriteLine();
            Console.WriteLine("────────────────────────────── HEADERS ──────────────────────────────────────");
            foreach (var header in Request.Headers)
            {
                Console.WriteLine($"  {header.Key}: {header.Value}");
            }

            // Leer el body para inspeccionarlo
            Request.EnableBuffering();
            var bodyContent = string.Empty;
            using (var reader = new StreamReader(Request.Body, leaveOpen: true))
            {
                bodyContent = await reader.ReadToEndAsync();
                Request.Body.Position = 0;
            }

            Console.WriteLine();
            Console.WriteLine("───────────────────────────── BODY CONTENT ───────────────────────────────────");
            Console.WriteLine($"🔹 Body Length: {bodyContent.Length} bytes");
            if (bodyContent.Length > 0)
            {
                Console.WriteLine($"🔹 Primeros 1000 caracteres:");
                Console.WriteLine(bodyContent.Length > 1000 ? bodyContent.Substring(0, 1000) + "..." : bodyContent);
            }
            else
            {
                Console.WriteLine("⚠️ BODY VACÍO");
            }
            Console.WriteLine("══════════════════════════════════════════════════════════════════════════════");
            Console.WriteLine();

            _logger.LogInformation("Recibiendo evento ANPR de cámara: {CameraType}", cameraType);

            // Obtener content-type
            var contentType = Request.ContentType ?? string.Empty;

            if (string.IsNullOrEmpty(contentType))
            {
                Console.WriteLine("❌ ERROR: Content-Type está vacío o nulo");
                _logger.LogError("Content-Type está vacío o nulo");
                return BadRequest(new { success = false, message = "Content-Type requerido" });
            }

            // *** DETECTAR Y IGNORAR EVENTOS DE HEARTBEAT ***
            if (contentType.Contains("application/xml", StringComparison.OrdinalIgnoreCase))
            {
                // Verificar si es un evento de heartbeat
                if (bodyContent.Contains("<eventType>heartBeat</eventType>", StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine("💓 HEARTBEAT detectado - Ignorando evento de status");
                    Console.WriteLine("✅ Heartbeat recibido correctamente");
                    Console.WriteLine("══════════════════════════════════════════════════════════════════════════════");
                    Console.WriteLine();

                    _logger.LogInformation("Heartbeat recibido de cámara: {CameraType}", cameraType);
                    return Ok(new { success = true, message = "Heartbeat recibido", eventType = "heartbeat" });
                }
            }

            // *** VALIDAR QUE SEA MULTIPART/FORM-DATA (EVENTO ANPR REAL) ***
            if (!contentType.Contains("multipart/form-data", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine($"⚠️ ADVERTENCIA: Content-Type no es multipart/form-data: {contentType}");
                Console.WriteLine("⚠️ Solo se procesan eventos ANPR con multipart/form-data");
                Console.WriteLine("══════════════════════════════════════════════════════════════════════════════");
                Console.WriteLine();

                return Ok(new { success = true, message = "Evento recibido pero no es ANPR multipart", contentType = contentType });
            }

            Console.WriteLine($"✅ Content-Type válido: {contentType}");
            Console.WriteLine($"🔄 Iniciando parseo del payload multipart ANPR...");

            // Parsear payload multipart
            var (anprEvent, imageData) = await _parserService.ParseAnprPayloadAsync(Request.Body, contentType);

            if (anprEvent == null)
            {
                Console.WriteLine("❌ ERROR: No se pudo parsear el evento ANPR");
                _logger.LogWarning("No se pudo parsear el evento ANPR de cámara: {CameraType}", cameraType);
                return BadRequest(new { success = false, message = "No se pudo parsear el evento ANPR" });
            }

            Console.WriteLine($"✅ Evento parseado exitosamente: Placa={anprEvent.LicensePlate}");
            Console.WriteLine($"🔄 Procesando evento...");

            // Procesar evento
            var processedEvent = await _applicationService.ProcessAnprEventAsync(anprEvent, imageData, cameraType);

            Console.WriteLine($"✅ Evento procesado");

            // Validar que la imagen tenga datos antes de guardar en BD
            if (imageData == null || imageData.Length == 0)
            {
                Console.WriteLine($"⚠️ Petición sin datos de imagen - NO se guardará en BD");
                _logger.LogWarning(
                    "Evento ANPR recibido sin imagen de cámara: {CameraType}, Placa: {Plate}",
                    cameraType,
                    processedEvent.LicensePlate);

                return Ok(new
                {
                    success = true,
                    message = "Evento ANPR procesado sin imagen (no guardado en BD)",
                    hasImage = false
                });
            }

            Console.WriteLine($"🔄 Guardando imagen en base de datos como huérfana...");

            // Guardar imagen en BD como "huérfana" (sin WeighingOperationId)
            // Se vinculará posteriormente cuando se cree la operación de pesaje
            var photoId = Guid.NewGuid();
            var photoType = GetPhotoTypeFromCameraType(cameraType);

            var orphanPhoto = new WeighingPhoto
            {
                Id = photoId,
                WeighingOperationId = null, // Huérfana - se vinculará después
                PhotoType = photoType,
                PhotoUrl = $"/api/weighing/photos/{photoId}", // URL para acceder a la imagen
                ImageData = imageData,
                ContentType = "image/jpeg",
                Description = $"Placa ANPR: {anprEvent.LicensePlate} - Cámara: {cameraType}",
                CreatedAt = DateTime.UtcNow
            };

            var savedPhoto = await _photoRepository.AddAsync(orphanPhoto);

            // Actualizar la URL en el evento procesado
            processedEvent.ImageUrl = orphanPhoto.PhotoUrl;

            Console.WriteLine($"✅ Imagen guardada en BD:");
            Console.WriteLine($"   - ID: {photoId}");
            Console.WriteLine($"   - PhotoType: {photoType}");
            Console.WriteLine($"   - PhotoUrl: {orphanPhoto.PhotoUrl}");
            Console.WriteLine($"   - ImageData size: {imageData?.Length ?? 0} bytes");
            Console.WriteLine($"   - WeighingOperationId: {savedPhoto.WeighingOperationId?.ToString() ?? "NULL (huérfana)"}");
            Console.WriteLine($"🔄 Notificando al frontend vía SignalR...");

            // Notificar al frontend vía SignalR
            await NotifyFrontend(processedEvent);

            Console.WriteLine($"✅ Frontend notificado");
            Console.WriteLine("╔══════════════════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║                    ✅ PROCESO ANPR COMPLETADO EXITOSAMENTE                   ║");
            Console.WriteLine("╚══════════════════════════════════════════════════════════════════════════════╝");
            Console.WriteLine();

            _logger.LogInformation(
                "Evento ANPR procesado exitosamente: Placa={Plate}, Cámara={Camera}",
                processedEvent.LicensePlate,
                cameraType);

            return Ok(new
            {
                success = true,
                message = "Evento ANPR procesado exitosamente",
                data = new
                {
                    licensePlate = processedEvent.LicensePlate,
                    cameraType = processedEvent.CameraType,
                    confidenceLevel = processedEvent.ConfidenceLevel,
                    imageUrl = processedEvent.ImageUrl
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine("\n");
            Console.WriteLine("╔══════════════════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║                          ❌ ERROR EN PROCESO ANPR                            ║");
            Console.WriteLine("╚══════════════════════════════════════════════════════════════════════════════╝");
            Console.WriteLine($"❌ Cámara: {cameraType}");
            Console.WriteLine($"❌ Error: {ex.Message}");
            Console.WriteLine($"❌ StackTrace:");
            Console.WriteLine(ex.StackTrace);
            if (ex.InnerException != null)
            {
                Console.WriteLine($"❌ Inner Exception: {ex.InnerException.Message}");
            }
            Console.WriteLine("══════════════════════════════════════════════════════════════════════════════");
            Console.WriteLine();

            _logger.LogError(ex, "Error procesando evento ANPR de cámara: {CameraType}", cameraType);
            return StatusCode(500, new
            {
                success = false,
                message = "Error procesando evento ANPR",
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    /// <summary>
    /// Notifica al frontend sobre el nuevo evento ANPR
    /// </summary>
    private async Task NotifyFrontend(AnprEventDto anprEvent)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("anprEventReceived", new
            {
                licensePlate = anprEvent.LicensePlate,
                cameraType = anprEvent.CameraType,
                imageUrl = anprEvent.ImageUrl,
                confidenceLevel = anprEvent.ConfidenceLevel,
                direction = anprEvent.Direction,
                cameraName = anprEvent.CameraName,
                vehicleBrand = anprEvent.VehicleBrand,
                vehicleColor = anprEvent.VehicleColor,
                vehicleType = anprEvent.VehicleType,
                capturedAt = anprEvent.CapturedAt
            });

            _logger.LogInformation("Evento ANPR notificado al frontend vía SignalR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notificando evento ANPR al frontend");
        }
    }

    /// <summary>
    /// Endpoint de prueba para verificar que el controlador está funcionando
    /// </summary>
    [HttpGet("test/{cameraType}")]
    public IActionResult Test(string cameraType)
    {
        return Ok(new
        {
            success = true,
            message = $"Endpoint ANPR para cámara '{cameraType}' está funcionando",
            endpoint = $"/api/anpr/{cameraType}",
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Endpoint DEBUG para recibir cualquier Content-Type y ver qué envía la cámara
    /// </summary>
    [HttpPost("debug/{cameraType}")]
    public async Task<IActionResult> DebugAnprEvent(string cameraType)
    {
        Console.WriteLine($"\n========== DEBUG ANPR REQUEST ==========");
        Console.WriteLine($"Cámara: {cameraType}");
        Console.WriteLine($"Content-Type: {Request.ContentType ?? "NULL"}");
        Console.WriteLine($"Content-Length: {Request.ContentLength ?? 0}");
        Console.WriteLine($"Method: {Request.Method}");
        Console.WriteLine($"Path: {Request.Path}");

        Console.WriteLine($"\nHeaders:");
        foreach (var header in Request.Headers)
        {
            Console.WriteLine($"  {header.Key}: {header.Value}");
        }

        Console.WriteLine($"\nQuery String:");
        foreach (var query in Request.Query)
        {
            Console.WriteLine($"  {query.Key}: {query.Value}");
        }

        // Leer el body completo
        Request.EnableBuffering();
        var body = await new StreamReader(Request.Body).ReadToEndAsync();
        Request.Body.Position = 0;

        Console.WriteLine($"\nBody (primeros 500 caracteres):");
        Console.WriteLine(body.Length > 500 ? body.Substring(0, 500) + "..." : body);
        Console.WriteLine($"Body Length: {body.Length} bytes");
        Console.WriteLine($"========================================\n");

        return Ok(new
        {
            success = true,
            message = "Debug info logged to console",
            receivedContentType = Request.ContentType,
            bodyLength = body.Length,
            hasBody = !string.IsNullOrEmpty(body)
        });
    }

    /// <summary>
    /// Mapea el tipo de cámara al tipo de foto en la BD
    /// </summary>
    private string GetPhotoTypeFromCameraType(string cameraType)
    {
        return cameraType.ToLower() switch
        {
            "trailer" => "trailerPlate",
            "remolque" => "remolque1Plate",
            "cargo" => "cargo",
            _ => "trailerPlate"
        };
    }
}
