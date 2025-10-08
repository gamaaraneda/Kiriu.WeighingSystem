using Kiriu.WeighingSystem.Application.DTOs.Anpr;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Kiriu.WeighingSystem.Application.Services;

/// <summary>
/// Servicio de aplicación para procesar eventos ANPR y almacenar imágenes de placas
/// </summary>
public class AnprApplicationService
{
    private readonly ILogger<AnprApplicationService> _logger;
    private readonly string _imageStoragePath;

    public AnprApplicationService(
        ILogger<AnprApplicationService> logger,
        string imageStoragePath)
    {
        _logger = logger;
        _imageStoragePath = imageStoragePath;
    }

    /// <summary>
    /// Procesa un evento ANPR y prepara los datos de la imagen
    /// NOTA: La imagen ahora se guarda en BD, no en disco
    /// </summary>
    public async Task<AnprEventDto> ProcessAnprEventAsync(
        AnprEventDto anprEvent,
        byte[]? imageData,
        string cameraType)
    {
        try
        {
            anprEvent.CameraType = cameraType;

            // Si hay imagen, guardar los datos binarios en el DTO
            if (imageData != null && imageData.Length > 0)
            {
                // En lugar de guardar en disco, guardamos los datos binarios en el DTO
                // La URL será generada cuando se guarde en BD (será el ID del registro)
                anprEvent.ImageData = imageData;
                anprEvent.ImageUrl = $"pending-{Guid.NewGuid()}"; // Temporal, se actualizará al guardar en BD
            }

            _logger.LogInformation(
                "Evento ANPR procesado: Placa={Plate}, Cámara={Camera}, Confianza={Confidence}%",
                anprEvent.LicensePlate,
                cameraType,
                anprEvent.ConfidenceLevel);

            return anprEvent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error procesando evento ANPR para cámara {CameraType}", cameraType);
            throw;
        }
    }

    /// <summary>
    /// Guarda la imagen de la placa en el sistema de archivos
    /// </summary>
    private async Task<string> SavePlateImageAsync(byte[] imageData, string licensePlate, string cameraType)
    {
        try
        {
            // Crear directorio si no existe
            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", _imageStoragePath);
            Directory.CreateDirectory(fullPath);

            // Generar nombre único para la imagen
            var sanitizedPlate = SanitizeFileName(licensePlate);
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var fileName = $"{cameraType}_{sanitizedPlate}_{timestamp}.jpg";
            var filePath = Path.Combine(fullPath, fileName);

            // Guardar imagen
            await File.WriteAllBytesAsync(filePath, imageData);

            // Retornar URL relativa
            var relativeUrl = $"/{_imageStoragePath}/{fileName}".Replace("\\", "/");

            _logger.LogInformation("Imagen de placa guardada: {FilePath}", relativeUrl);

            return relativeUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error guardando imagen de placa");
            throw;
        }
    }

    /// <summary>
    /// Limpia caracteres no válidos de un nombre de archivo
    /// </summary>
    private string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        return string.Join("_", fileName.Split(invalidChars, StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>
    /// Crea un registro de foto en WeighingPhotos asociado a una operación
    /// </summary>
    public WeighingPhoto CreatePlatePhotoRecord(
        Guid weighingOperationId,
        string photoType,
        string photoUrl,
        string licensePlate)
    {
        return new WeighingPhoto
        {
            Id = Guid.NewGuid(),
            WeighingOperationId = weighingOperationId,
            PhotoType = photoType,
            PhotoUrl = photoUrl,
            Description = $"Placa: {licensePlate}",
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Determina el tipo de foto según el tipo de cámara
    /// </summary>
    public string GetPhotoTypeFromCameraType(string cameraType)
    {
        return cameraType.ToLower() switch
        {
            "trailer" => "trailerPlate",
            "remolque" => "remolque1Plate",
            "cargo" => "containerPlate",
            _ => "trailerPlate"
        };
    }
}
