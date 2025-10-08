using System.Text;
using System.Xml.Linq;
using Kiriu.WeighingSystem.Application.DTOs.Anpr;
using Microsoft.Extensions.Logging;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

/// <summary>
/// Servicio para parsear payload multipart/form-data de cámaras ANPR Hikvision
/// </summary>
public class AnprParserService
{
    private readonly ILogger<AnprParserService> _logger;

    public AnprParserService(ILogger<AnprParserService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Parsea el contenido multipart que viene de la cámara ANPR
    /// </summary>
    public async Task<(AnprEventDto? Event, byte[]? ImageData)> ParseAnprPayloadAsync(
        Stream bodyStream,
        string contentType)
    {
        try
        {
            // Extraer boundary del content-type
            var boundary = ExtractBoundary(contentType);
            if (string.IsNullOrEmpty(boundary))
            {
                _logger.LogError("No se pudo extraer el boundary del Content-Type");
                return (null, null);
            }

            // Leer todo el contenido
            using var memoryStream = new MemoryStream();
            await bodyStream.CopyToAsync(memoryStream);
            var fullContent = memoryStream.ToArray();

            // Parsear las partes del multipart
            var parts = ParseMultipartParts(fullContent, boundary);

            // Extraer XML y imagen
            string? xmlContent = null;
            byte[]? imageData = null;

            foreach (var part in parts)
            {
                if (part.ContentType?.Contains("text/xml") == true || part.FileName?.EndsWith(".xml") == true)
                {
                    xmlContent = Encoding.UTF8.GetString(part.Data);
                }
                else if (part.ContentType?.Contains("image/jpeg") == true || part.FileName?.EndsWith(".jpg") == true)
                {
                    imageData = part.Data;
                }
            }

            if (xmlContent == null)
            {
                _logger.LogError("No se encontró la parte XML en el payload");
                return (null, null);
            }

            // Parsear XML y crear DTO
            var anprEvent = ParseXmlToAnprEvent(xmlContent);

            return (anprEvent, imageData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando payload ANPR");
            return (null, null);
        }
    }

    private string? ExtractBoundary(string contentType)
    {
        var boundaryIndex = contentType.IndexOf("boundary=", StringComparison.OrdinalIgnoreCase);
        if (boundaryIndex < 0)
            return null;

        var boundary = contentType.Substring(boundaryIndex + 9).Trim();

        // Remover comillas si existen
        if (boundary.StartsWith("\"") && boundary.EndsWith("\""))
            boundary = boundary.Substring(1, boundary.Length - 2);

        return boundary;
    }

    private List<MultipartPart> ParseMultipartParts(byte[] content, string boundary)
    {
        var parts = new List<MultipartPart>();
        var boundaryBytes = Encoding.UTF8.GetBytes("--" + boundary);
        var position = 0;

        while (position < content.Length)
        {
            // Buscar inicio del boundary
            var boundaryStart = FindPattern(content, boundaryBytes, position);
            if (boundaryStart < 0)
                break;

            // Buscar fin del boundary actual (inicio del siguiente)
            var nextBoundaryStart = FindPattern(content, boundaryBytes, boundaryStart + boundaryBytes.Length);
            if (nextBoundaryStart < 0)
                nextBoundaryStart = content.Length;

            // Extraer la parte
            var partContent = new byte[nextBoundaryStart - boundaryStart - boundaryBytes.Length];
            Array.Copy(content, boundaryStart + boundaryBytes.Length, partContent, 0, partContent.Length);

            // Parsear headers y data de la parte
            var part = ParsePart(partContent);
            if (part != null)
                parts.Add(part);

            position = nextBoundaryStart;
        }

        return parts;
    }

    private int FindPattern(byte[] data, byte[] pattern, int startIndex)
    {
        for (int i = startIndex; i <= data.Length - pattern.Length; i++)
        {
            bool found = true;
            for (int j = 0; j < pattern.Length; j++)
            {
                if (data[i + j] != pattern[j])
                {
                    found = false;
                    break;
                }
            }
            if (found)
                return i;
        }
        return -1;
    }

    private MultipartPart? ParsePart(byte[] partContent)
    {
        // Buscar el doble salto de línea que separa headers del body
        var separator = Encoding.UTF8.GetBytes("\r\n\r\n");
        var separatorIndex = FindPattern(partContent, separator, 0);

        if (separatorIndex < 0)
            return null;

        // Extraer headers
        var headersBytes = new byte[separatorIndex];
        Array.Copy(partContent, 0, headersBytes, 0, headersBytes.Length);
        var headersText = Encoding.UTF8.GetString(headersBytes);

        // Extraer data
        var dataStart = separatorIndex + separator.Length;
        var dataLength = partContent.Length - dataStart;

        // Remover trailing \r\n si existe
        if (dataLength >= 2 && partContent[partContent.Length - 2] == '\r' && partContent[partContent.Length - 1] == '\n')
            dataLength -= 2;

        var data = new byte[dataLength];
        Array.Copy(partContent, dataStart, data, 0, dataLength);

        // Parsear headers
        var part = new MultipartPart { Data = data };
        var headerLines = headersText.Split(new[] { "\r\n" }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in headerLines)
        {
            if (line.StartsWith("Content-Disposition:", StringComparison.OrdinalIgnoreCase))
            {
                // Extraer filename si existe
                var fileNameIndex = line.IndexOf("filename=", StringComparison.OrdinalIgnoreCase);
                if (fileNameIndex >= 0)
                {
                    var fileName = line.Substring(fileNameIndex + 9).Trim().Trim('"');
                    part.FileName = fileName;
                }
            }
            else if (line.StartsWith("Content-Type:", StringComparison.OrdinalIgnoreCase))
            {
                part.ContentType = line.Substring(13).Trim();
            }
        }

        return part;
    }

    private AnprEventDto ParseXmlToAnprEvent(string xmlContent)
    {
        Console.WriteLine("\n🔍 ===== PARSEANDO XML ANPR =====");
        Console.WriteLine($"📄 XML Content (primeros 2000 caracteres):");
        Console.WriteLine(xmlContent.Length > 2000 ? xmlContent.Substring(0, 2000) + "..." : xmlContent);
        Console.WriteLine();

        var doc = XDocument.Parse(xmlContent);
        var root = doc.Root;

        if (root == null)
        {
            Console.WriteLine("❌ ERROR: XML root is null");
            throw new InvalidOperationException("XML root is null");
        }

        Console.WriteLine($"✅ Root element: {root.Name.LocalName}");
        Console.WriteLine($"✅ Root namespace: {root.Name.Namespace}");
        Console.WriteLine($"✅ Root tiene {root.Elements().Count()} elementos hijos");

        // Listar todos los elementos hijos del root para debugging
        Console.WriteLine("\n📋 Elementos hijos del root:");
        foreach (var element in root.Elements())
        {
            Console.WriteLine($"  - {element.Name.LocalName} = {(element.Value.Length > 50 ? element.Value.Substring(0, 50) + "..." : element.Value)}");
        }

        // Obtener el namespace del documento (Hikvision usa namespaces)
        XNamespace ns = root.Name.Namespace;

        // Buscar nodo ANPR con y sin namespace
        var anprNode = root.Element(ns + "ANPR") ?? root.Element("ANPR");

        if (anprNode == null)
        {
            Console.WriteLine("\n❌ ERROR: ANPR node not found");
            Console.WriteLine("❌ Se intentó buscar con namespace y sin namespace");
            throw new InvalidOperationException("ANPR node not found");
        }

        Console.WriteLine($"\n✅ ANPR node encontrado: {anprNode.Name}");
        Console.WriteLine($"✅ ANPR tiene {anprNode.Elements().Count()} elementos hijos");

        // Listar elementos del nodo ANPR
        Console.WriteLine("\n📋 Elementos dentro de ANPR:");
        foreach (var element in anprNode.Elements())
        {
            Console.WriteLine($"  - {element.Name.LocalName} = {element.Value}");
        }

        var vehicleInfoNode = anprNode.Element(ns + "vehicleInfo") ?? anprNode.Element("vehicleInfo");

        // Extraer valores con namespace-aware
        var licensePlate = anprNode.Element(ns + "licensePlate")?.Value ?? anprNode.Element("licensePlate")?.Value ?? string.Empty;
        var confidenceLevelStr = anprNode.Element(ns + "confidenceLevel")?.Value ?? anprNode.Element("confidenceLevel")?.Value;
        var direction = anprNode.Element(ns + "direction")?.Value ?? anprNode.Element("direction")?.Value ?? string.Empty;
        var cameraNo = anprNode.Element(ns + "cameraNo")?.Value ?? anprNode.Element("cameraNo")?.Value ?? string.Empty;
        var vehicleType = anprNode.Element(ns + "vehicleType")?.Value ?? anprNode.Element("vehicleType")?.Value;
        var dateTimeStr = root.Element(ns + "dateTime")?.Value ?? root.Element("dateTime")?.Value;

        Console.WriteLine($"\n📊 Valores extraídos:");
        Console.WriteLine($"  🚗 Placa: {licensePlate}");
        Console.WriteLine($"  📊 Confianza: {confidenceLevelStr}");
        Console.WriteLine($"  ➡️ Dirección: {direction}");
        Console.WriteLine($"  📷 Cámara: {cameraNo}");
        Console.WriteLine($"  🚙 Tipo vehículo: {vehicleType ?? "N/A"}");
        Console.WriteLine($"  📅 Fecha/Hora: {dateTimeStr}");

        var anprEvent = new AnprEventDto
        {
            LicensePlate = licensePlate,
            ConfidenceLevel = int.TryParse(confidenceLevelStr, out var confidence) ? confidence : 0,
            Direction = direction,
            CameraName = cameraNo,
            VehicleType = vehicleType,
            VehicleBrand = vehicleInfoNode?.Element(ns + "vehicleLogoRecogStrName")?.Value ?? vehicleInfoNode?.Element("vehicleLogoRecogStrName")?.Value,
            VehicleColor = vehicleInfoNode?.Element(ns + "color")?.Value ?? vehicleInfoNode?.Element("color")?.Value,
            CapturedAt = DateTime.TryParse(dateTimeStr, out var capturedAt)
                ? capturedAt
                : DateTime.UtcNow
        };

        Console.WriteLine("\n✅ AnprEventDto creado exitosamente");
        Console.WriteLine("🔍 ===== FIN PARSEO XML ANPR =====\n");

        return anprEvent;
    }

    private class MultipartPart
    {
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public byte[] Data { get; set; } = Array.Empty<byte>();
    }
}
