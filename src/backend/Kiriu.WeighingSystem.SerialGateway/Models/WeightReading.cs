namespace Kiriu.WeighingSystem.SerialGateway.Models;

/// <summary>
/// Resultado estandarizado de la lectura de peso.
/// </summary>
public sealed record WeightReading(
    decimal Value,
    string Unit,
    DateTime TimestampUtc,
    string RawResponse);
