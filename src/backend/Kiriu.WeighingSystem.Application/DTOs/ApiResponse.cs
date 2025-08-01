namespace Kiriu.WeighingSystem.Application.DTOs;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string>? Errors { get; set; }
    public ResponseMetadata? Metadata { get; set; }
}

public class ResponseMetadata
{
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string RequestId { get; set; } = Guid.NewGuid().ToString();
    public string Version { get; set; } = "1.0";
} 