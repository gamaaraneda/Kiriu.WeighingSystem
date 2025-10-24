using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Interfaces;
using System.Security.Claims;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeighingController : ControllerBase
{
    private readonly IWeighingApplicationService _weighingService;
    private readonly IWeighingPhotoRepository _photoRepository;
    private readonly ILogger<WeighingController> _logger;

    public WeighingController(
        IWeighingApplicationService weighingService,
        IWeighingPhotoRepository photoRepository,
        ILogger<WeighingController> logger)
    {
        _weighingService = weighingService;
        _photoRepository = photoRepository;
        _logger = logger;
    }

    /// <summary>
    /// Crear Operación de Entrada
    /// </summary>
    /// <param name="request">Datos de la operación de entrada</param>
    /// <returns>Operación de entrada creada</returns>
    [HttpPost("entry")]
    public async Task<IActionResult> CreateEntry([FromBody] CreateEntryRequest request)
    {
        try
        {
            _logger.LogInformation("Creando operación de entrada para placa: {TrailerPlate}", request.TrailerPlate);
            
            // Obtener el usuario actual del token JWT
            var currentUser = GetCurrentUser();
            
            // Si tiene ediciones manuales, asignar el usuario actual
            if (request.TieneEdicionesManuale && !string.IsNullOrEmpty(currentUser))
            {
                request.UsuarioEditor = currentUser;
            }
            
            var result = await _weighingService.CreateEntryAsync(request);
            
            if (!result.Success)
            {
                return result.Message switch
                {
                    "Placa ya registrada en entrada previa" => Conflict(result),
                    _ => BadRequest(result)
                };
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear operación de entrada");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Crear Operación de Entrada con Doble Remolque
    /// </summary>
    /// <param name="request">Datos de la operación de entrada con doble remolque</param>
    /// <returns>Operación de entrada con doble remolque creada</returns>
    [HttpPost("entry/double-trailer")]
    public async Task<IActionResult> CreateDoubleTrailerEntry([FromBody] CreateDoubleTrailerEntryRequest request)
    {
        try
        {
            _logger.LogInformation("Creando entrada con doble remolque para trailer: {TrailerPlaca}", request.TrailerPlaca);
            
            // Obtener el usuario actual del token JWT
            var currentUser = GetCurrentUser();
            
            // Si tiene ediciones manuales, asignar el usuario actual
            if (request.TieneEdicionesManuale && !string.IsNullOrEmpty(currentUser))
            {
                request.UsuarioEditor = currentUser;
            }
            
            var result = await _weighingService.CreateDoubleTrailerEntryAsync(request);
            
            if (!result.Success)
            {
                return result.Message?.Contains("ya registrada") == true ? Conflict(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear entrada con doble remolque");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Buscar Entrada por Placa
    /// </summary>
    /// <param name="placa">Placa del vehículo a buscar</param>
    /// <returns>Registro de entrada encontrado</returns>
    [HttpGet("entry/search")]
    public async Task<IActionResult> SearchEntryByPlate([FromQuery] string placa)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(placa))
            {
                return BadRequest(new { success = false, message = "La placa es requerida" });
            }

            _logger.LogInformation("Buscando entrada por placa: {Placa}", placa);
            
            var result = await _weighingService.SearchEntryByPlateAsync(placa);
            
            if (!result.Success)
            {
                return result.Message == "Registro no encontrado" ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar entrada por placa: {Placa}", placa);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Registrar Salida
    /// </summary>
    /// <param name="request">Datos del registro de salida</param>
    /// <returns>Registro de salida completado</returns>
    [HttpPost("exit")]
    public async Task<IActionResult> CreateExit([FromBody] CreateExitRequest request)
    {
        try
        {
            _logger.LogInformation("Registrando salida para folio: {Folio}", request.Folio);
            
            var result = await _weighingService.CreateExitAsync(request);
            
            if (!result.Success)
            {
                return result.Message?.Contains("no encontrado") == true ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar salida para folio: {Folio}", request.Folio);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Registrar Salida con Doble Remolque
    /// </summary>
    /// <param name="request">Datos del registro de salida con doble remolque</param>
    /// <returns>Registro de salida completado</returns>
    [HttpPost("exit/double-trailer")]
    public async Task<IActionResult> CreateDoubleTrailerExit([FromBody] CreateDoubleTrailerExitRequest request)
    {
        try
        {
            _logger.LogInformation("Registrando salida con doble remolque para folio: {Folio}", request.Folio);
            
            var result = await _weighingService.CreateDoubleTrailerExitAsync(request);
            
            if (!result.Success)
            {
                return result.Message?.Contains("no encontrado") == true ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar salida con doble remolque para folio: {Folio}", request.Folio);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtener Operaciones Existentes
    /// </summary>
    /// <param name="page">Número de página</param>
    /// <param name="size">Tamaño de página</param>
    /// <param name="status">Filtrar por estado</param>
    /// <param name="unitType">Filtrar por tipo de unidad</param>
    /// <param name="dateFrom">Fecha desde</param>
    /// <param name="dateTo">Fecha hasta</param>
    /// <returns>Lista paginada de operaciones</returns>
    [HttpGet("operations")]
    public async Task<IActionResult> GetOperations(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? unitType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        try
        {
            _logger.LogInformation("Obteniendo operaciones - Página: {Page}, Tamaño: {Size}", page, size);
            
            var result = await _weighingService.GetOperationsAsync(page, size, status, unitType, dateFrom, dateTo);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operaciones");
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtener Operación por Placa
    /// </summary>
    /// <param name="placa">Placa del vehículo</param>
    /// <returns>Operación encontrada</returns>
    [HttpGet("operations/plate/{placa}")]
    public async Task<IActionResult> GetOperationByPlate(string placa)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(placa))
            {
                return BadRequest(new { success = false, message = "La placa es requerida" });
            }

            _logger.LogInformation("Obteniendo operación por placa: {Placa}", placa);

            var result = await _weighingService.GetOperationByPlateAsync(placa);

            if (!result.Success)
            {
                return result.Message == "Operación no encontrada" ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operación por placa: {Placa}", placa);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtener operación por ID
    /// </summary>
    /// <param name="id">ID de la operación</param>
    /// <returns>Operación completa</returns>
    [HttpGet("operations/{id}")]
    public async Task<IActionResult> GetOperationById(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new { success = false, message = "El ID es requerido" });
            }

            _logger.LogInformation("Obteniendo operación por ID: {Id}", id);

            var result = await _weighingService.GetOperationByIdAsync(id);

            if (!result.Success)
            {
                return result.Message == "Operación no encontrada" ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operación por ID: {Id}", id);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Validar si se puede Registrar Salida
    /// </summary>
    /// <param name="placa">Placa del vehículo</param>
    /// <returns>Validación de salida</returns>
    [HttpGet("exit/validate/{placa}")]
    public async Task<IActionResult> ValidateExit(string placa)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(placa))
            {
                return BadRequest(new { success = false, message = "La placa es requerida" });
            }

            _logger.LogInformation("Validando posibilidad de salida para placa: {Placa}", placa);
            
            var result = await _weighingService.ValidateExitAsync(placa);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al validar salida para placa: {Placa}", placa);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Actualizar Operación de Pesaje
    /// </summary>
    /// <param name="operationId">ID de la operación</param>
    /// <param name="request">Datos a actualizar</param>
    /// <returns>Operación actualizada</returns>
    [HttpPut("operations/{operationId}")]
    public async Task<IActionResult> UpdateWeighingOperation(Guid operationId, [FromBody] UpdateWeighingOperationRequest request)
    {
        try
        {
            _logger.LogInformation("Actualizando operación de pesaje: {OperationId}", operationId);
            
            // Obtener el usuario actual del token JWT
            var currentUser = GetCurrentUser();
            
            // Si es una edición manual, asignar el usuario actual
            if (request.EsEdicionManual && !string.IsNullOrEmpty(currentUser))
            {
                request.UsuarioEditor = currentUser;
            }
            
            var result = await _weighingService.UpdateWeighingOperationAsync(operationId, request);
            
            if (!result.Success)
            {
                return result.Message?.Contains("no encontrada") == true ? NotFound(result) : BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar operación de pesaje: {OperationId}", operationId);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtiene el nombre del usuario actual desde el token JWT
    /// </summary>
    private string? GetCurrentUser()
    {
        try
        {
            // Intentar obtener el nombre del usuario desde diferentes claims
            var userName = User.Identity?.Name;
            if (!string.IsNullOrEmpty(userName))
                return userName;

            // Si no está en Identity.Name, intentar con el claim "name"
            var nameClaim = User.FindFirst(ClaimTypes.Name)?.Value;
            if (!string.IsNullOrEmpty(nameClaim))
                return nameClaim;

            // Si no está en "name", intentar con el claim "sub" (subject)
            var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(subClaim))
                return subClaim;

            // Como último recurso, intentar con "username" o "email"
            var usernameClaim = User.FindFirst("username")?.Value ?? User.FindFirst("email")?.Value;
            if (!string.IsNullOrEmpty(usernameClaim))
                return usernameClaim;

            // Si ninguno está disponible, usar un identificador genérico
            return "Sistema";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al obtener usuario actual del token JWT");
            return "Sistema";
        }
    }

    /// <summary>
    /// Buscar productos por texto (autocompletado)
    /// </summary>
    /// <param name="searchTerm">Término de búsqueda</param>
    /// <param name="limit">Límite de resultados (default: 10)</param>
    /// <returns>Lista de productos que coinciden</returns>
    [HttpGet("products/search")]
    public async Task<IActionResult> SearchProducts([FromQuery] string searchTerm, [FromQuery] int limit = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
            {
                return Ok(new { success = true, data = new List<string>() });
            }

            _logger.LogInformation("Buscando productos con término: {SearchTerm}", searchTerm);

            var result = await _weighingService.SearchProductsAsync(searchTerm, limit);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar productos con término: {SearchTerm}", searchTerm);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Buscar clientes/proveedores por texto (autocompletado)
    /// </summary>
    /// <param name="searchTerm">Término de búsqueda</param>
    /// <param name="limit">Límite de resultados (default: 10)</param>
    /// <returns>Lista de clientes/proveedores que coinciden</returns>
    [HttpGet("clients/search")]
    public async Task<IActionResult> SearchClients([FromQuery] string searchTerm, [FromQuery] int limit = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
            {
                return Ok(new { success = true, data = new List<string>() });
            }

            _logger.LogInformation("Buscando clientes/proveedores con término: {SearchTerm}", searchTerm);

            var result = await _weighingService.SearchClientsAsync(searchTerm, limit);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar clientes/proveedores con término: {SearchTerm}", searchTerm);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Buscar entradas pendientes de salida por placa o folio (autocompletado)
    /// </summary>
    /// <param name="searchTerm">Término de búsqueda (placa o folio)</param>
    /// <param name="limit">Límite de resultados (default: 10)</param>
    /// <param name="unitType">Tipo de unidad (client/provider) para filtrar resultados</param>
    /// <returns>Lista de entradas pendientes que coinciden</returns>
    [HttpGet("pending-exits/search")]
    public async Task<IActionResult> SearchPendingExits([FromQuery] string searchTerm, [FromQuery] int limit = 10, [FromQuery] string? unitType = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
            {
                return Ok(new { success = true, data = new List<object>() });
            }

            _logger.LogInformation("Buscando entradas pendientes con término: {SearchTerm}, unitType: {UnitType}", searchTerm, unitType);

            var result = await _weighingService.SearchPendingExitsAsync(searchTerm, limit, unitType);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar entradas pendientes con término: {SearchTerm}", searchTerm);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtener imagen de una foto de pesaje desde la base de datos
    /// </summary>
    /// <param name="photoId">ID de la foto</param>
    /// <returns>Imagen en formato binario</returns>
    [HttpGet("photos/{photoId}")]
    [AllowAnonymous] // Permitir acceso sin autenticación para mostrar imágenes
    public async Task<IActionResult> GetPhoto(Guid photoId)
    {
        try
        {
            Console.WriteLine($"\n🔍 ===== SOLICITANDO IMAGEN =====");
            Console.WriteLine($"📷 Photo ID: {photoId}");
            _logger.LogInformation("Obteniendo imagen de foto: {PhotoId}", photoId);

            var photoData = await _weighingService.GetPhotoDataAsync(photoId);

            if (photoData == null)
            {
                Console.WriteLine($"❌ Foto NO encontrada en BD");
                _logger.LogWarning("Foto no encontrada: {PhotoId}", photoId);
                return NotFound(new { success = false, message = "Foto no encontrada" });
            }

            Console.WriteLine($"✅ Foto encontrada:");
            Console.WriteLine($"   - ContentType: {photoData.ContentType}");
            Console.WriteLine($"   - ImageData size: {photoData.ImageData.Length} bytes");
            Console.WriteLine($"🔍 ===== FIN SOLICITUD IMAGEN =====\n");

            // Retornar la imagen con el content-type correcto
            var contentType = photoData.ContentType ?? "image/jpeg";
            return File(photoData.ImageData, contentType);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ ERROR obteniendo imagen: {ex.Message}");
            Console.WriteLine($"   StackTrace: {ex.StackTrace}");
            _logger.LogError(ex, "Error al obtener imagen de foto: {PhotoId}", photoId);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }

    /// <summary>
    /// Obtiene la última foto huérfana disponible por tipo
    /// </summary>
    /// <param name="photoType">Tipo de foto (trailerPlate, remolque1Plate, cargo, etc.)</param>
    /// <returns>Información de la última foto huérfana disponible</returns>
    [HttpGet("photos/orphan/latest/{photoType}")]
    public async Task<IActionResult> GetLatestOrphanPhoto(string photoType)
    {
        try
        {
            _logger.LogInformation("Buscando última foto huérfana para tipo: {PhotoType}", photoType);

            var photo = await _photoRepository.GetLatestOrphanPhotoByTypeAsync(photoType);

            if (photo == null)
            {
                _logger.LogInformation("No se encontró foto huérfana para tipo: {PhotoType}", photoType);
                return NotFound(new
                {
                    success = false,
                    message = "No hay fotos disponibles para este tipo"
                });
            }

            _logger.LogInformation("Foto huérfana encontrada: {PhotoId}, CreatedAt: {CreatedAt}", photo.Id, photo.CreatedAt);

            return Ok(new
            {
                success = true,
                data = new
                {
                    photoId = photo.Id,
                    photoUrl = photo.PhotoUrl,
                    createdAt = photo.CreatedAt,
                    photoType = photo.PhotoType,
                    source = "database"
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener última foto huérfana para tipo: {PhotoType}", photoType);
            return StatusCode(500, new { success = false, message = "Error interno del servidor" });
        }
    }
}