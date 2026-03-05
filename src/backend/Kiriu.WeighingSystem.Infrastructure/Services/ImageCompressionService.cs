using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

/// <summary>
/// Servicio para comprimir imágenes antes de guardarlas en la base de datos.
/// Reduce el tamaño de las imágenes manteniendo calidad suficiente para evidencia.
/// </summary>
public class ImageCompressionService
{
    private readonly ILogger<ImageCompressionService> _logger;
    private readonly ImageCompressionSettings _settings;

    public ImageCompressionService(
        ILogger<ImageCompressionService> logger,
        IOptions<ImageCompressionSettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
    }

    /// <summary>
    /// Comprime una imagen JPEG reduciendo tamaño y/o resolución.
    /// </summary>
    /// <param name="imageData">Datos binarios de la imagen original</param>
    /// <returns>Datos binarios de la imagen comprimida</returns>
    public byte[] CompressImage(byte[] imageData)
    {
        // Si la compresión está deshabilitada, retornar original
        if (!_settings.EnableCompression)
        {
            _logger.LogDebug("Compresión deshabilitada, retornando imagen original");
            return imageData;
        }

        try
        {
            var originalSize = imageData.Length;
            _logger.LogDebug("Iniciando compresión de imagen. Tamaño original: {OriginalSize} bytes", originalSize);

            using var inputStream = new MemoryStream(imageData);
            using var image = Image.Load(inputStream);

            var originalWidth = image.Width;
            var originalHeight = image.Height;

            // Redimensionar solo si excede el ancho máximo configurado
            if (image.Width > _settings.MaxWidth)
            {
                var ratio = (double)_settings.MaxWidth / image.Width;
                var newHeight = (int)(image.Height * ratio);

                _logger.LogDebug(
                    "Redimensionando imagen de {OriginalWidth}x{OriginalHeight} a {NewWidth}x{NewHeight}",
                    originalWidth, originalHeight, _settings.MaxWidth, newHeight);

                image.Mutate(x => x.Resize(_settings.MaxWidth, newHeight));
            }

            // Comprimir con calidad configurada
            using var outputStream = new MemoryStream();
            var encoder = new JpegEncoder
            {
                Quality = _settings.Quality
            };
            image.Save(outputStream, encoder);

            var compressedData = outputStream.ToArray();
            var compressedSize = compressedData.Length;
            var reductionPercent = ((originalSize - compressedSize) / (double)originalSize) * 100;

            _logger.LogInformation(
                "Imagen comprimida exitosamente. Original: {OriginalSize} bytes, Comprimida: {CompressedSize} bytes, Reducción: {Reduction:F2}%",
                originalSize, compressedSize, reductionPercent);

            return compressedData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comprimiendo imagen, retornando imagen original como fallback");
            // Fallback: retornar imagen original en caso de error
            return imageData;
        }
    }

    /// <summary>
    /// Valida que los datos sean una imagen JPEG válida
    /// </summary>
    public bool IsValidJpeg(byte[] imageData)
    {
        try
        {
            using var stream = new MemoryStream(imageData);
            using var image = Image.Load(stream);
            return true;
        }
        catch
        {
            return false;
        }
    }
}

/// <summary>
/// Configuración para la compresión de imágenes
/// </summary>
public class ImageCompressionSettings
{
    /// <summary>
    /// Ancho máximo en píxeles. Imágenes más grandes se redimensionarán proporcionalmente.
    /// Default: 1280 (suficiente para lectura de placas ANPR)
    /// </summary>
    public int MaxWidth { get; set; } = 1280;

    /// <summary>
    /// Calidad JPEG (0-100). Valores más bajos = mayor compresión pero menor calidad.
    /// Default: 75 (balance óptimo entre tamaño y calidad)
    /// </summary>
    public int Quality { get; set; } = 75;

    /// <summary>
    /// Habilitar/deshabilitar compresión globalmente.
    /// Default: true
    /// </summary>
    public bool EnableCompression { get; set; } = true;
}
