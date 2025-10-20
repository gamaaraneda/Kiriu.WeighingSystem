namespace Kiriu.WeighingSystem.SerialGateway.Models;

public sealed record WeightResponseDto(
    decimal Value,
    string Unit,
    DateTime TimestampUtc,
    string Raw);
