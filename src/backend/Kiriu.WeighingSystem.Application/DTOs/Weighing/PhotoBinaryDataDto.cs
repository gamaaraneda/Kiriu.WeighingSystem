namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// DTO para datos binarios de una foto (imagen desde BD)
/// </summary>
public class PhotoBinaryDataDto
{
    public byte[] ImageData { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = "image/jpeg";
}
