using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Kiriu.WeighingSystem.Api.Converters;

/// <summary>
/// Convierte DateTime a formato ISO 8601 con 'Z' (UTC)
/// Asegura que todas las fechas se serialicen correctamente en UTC
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return DateTime.Parse(reader.GetString()!).ToUniversalTime();
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Si ya es UTC, usar el valor tal cual
        // Si es Local o Unspecified, asumir que ya es UTC (viene de BD en UTC)
        // Solo agregar el sufijo 'Z' sin convertir
        DateTime utcValue = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);

        writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}
